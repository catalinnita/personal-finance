import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/paginate'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DEFAULT_CATEGORIES = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transportation',
  'Healthcare', 'Shopping', 'Dining', 'Subscriptions', 'Transfer',
  'Investment', 'Insurance', 'Education', 'Travel', 'Loans',
  'AI', 'Theraphy', 'Housing', 'Taxes', 'Private School'
]

function buildParsePrompt(categories: string[], mappings: { description_pattern: string; category: string }[]) {
  let prompt = `Parse this bank statement and extract ALL transactions. EVERY transaction MUST have a category assigned.

For each transaction provide:
- date: YYYY-MM-DD format
- amount: number (positive=income, negative=expense)
- description: short description (max 50 chars). Remove any hashes, reference numbers, transaction IDs, or alphanumeric codes. Keep only meaningful merchant names.
- category: REQUIRED for every transaction. Use one of these existing categories if it fits: ${categories.join(', ')}. If NONE of these categories fit well, create a NEW relevant category name (short, 1-2 words, capitalized like "Pet Care" or "Childcare" or "Bank Fees").
- type: "income" or "expense"

IMPORTANT: Do NOT leave any transaction without a category. Every single transaction must be categorized either with an existing category or a new one you create.

Return ONLY a JSON array, no explanation. Example:
[{"date":"2024-01-15","amount":2500,"description":"Monthly Salary","category":"Salary","type":"income"},{"date":"2024-01-16","amount":-45,"description":"Pet Store Purchase","category":"Pet Care","type":"expense"}]`

  if (mappings.length > 0) {
    prompt += `\n\nIMPORTANT: Use these known description-to-category mappings when you see similar descriptions:\n`
    mappings.forEach(m => {
      prompt += `- "${m.description_pattern}" → ${m.category}\n`
    })
  }

  return prompt
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Fetch user's custom categories
    const categoriesRes = await supabase.from('categories').select('name').eq('user_id', user.id)
    const customCategories = categoriesRes.data?.map(c => c.name) || []
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...customCategories])].sort()
    
    // Fetch all mappings with pagination to bypass 1000 row limit
    type MappingRow = { description_pattern: string; category_id: string; categories: { name: string } | null }
    const allMappingsData = await fetchAllRows<MappingRow>(
      supabase,
      'category_mappings',
      'description_pattern, category_id, categories (name)',
      [{ column: 'user_id', value: user.id }]
    )
    
    // Transform mappings to include category name
    const mappings = allMappingsData.map(m => ({
      description_pattern: m.description_pattern,
      category: (m.categories as unknown as { name: string } | null)?.name || ''
    })).filter(m => m.category)

    const parsePrompt = buildParsePrompt(allCategories, mappings)

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    
    let message

    if (isPdf) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: [
              {
                type: 'document',
                source: {
                  type: 'base64',
                  media_type: 'application/pdf',
                  data: base64,
                },
              },
              {
                type: 'text',
                text: parsePrompt,
              },
            ],
          },
        ],
      })
    } else {
      const text = await file.text()
      
      message = await anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8192,
        messages: [
          {
            role: 'user',
            content: `${parsePrompt}\n\nBank statement content:\n${text}`,
          },
        ],
      })
    }

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    console.log('Claude response:', responseText.substring(0, 500))
    
    // Extract JSON from response - try multiple patterns
    let jsonMatch = responseText.match(/\[[\s\S]*\]/)
    
    // If no array found, try to find JSON in code blocks
    if (!jsonMatch) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonMatch = codeBlockMatch[1].match(/\[[\s\S]*\]/)
      }
    }
    
    if (!jsonMatch) {
      console.error('No JSON array found in response:', responseText)
      return NextResponse.json({ 
        error: 'Failed to parse transactions - no valid data found in statement' 
      }, { status: 500 })
    }

    let jsonStr = jsonMatch[0]
    
    // Fix truncated JSON - find all complete transaction objects
    if (!jsonStr.trim().endsWith(']')) {
      // Use regex to find all complete transaction objects
      const completeObjects: string[] = []
      const objectRegex = /\{[^{}]*"date"[^{}]*"amount"[^{}]*"description"[^{}]*"category"[^{}]*"type"[^{}]*\}/g
      let match
      while ((match = objectRegex.exec(jsonStr)) !== null) {
        completeObjects.push(match[0])
      }
      
      if (completeObjects.length > 0) {
        jsonStr = '[' + completeObjects.join(',') + ']'
        console.log(`Fixed truncated JSON, recovered ${completeObjects.length} transactions`)
      }
    }
    
    let transactions
    try {
      transactions = JSON.parse(jsonStr)
    } catch (parseError) {
      console.error('JSON parse error:', parseError)
      console.error('JSON string (last 200 chars):', jsonStr.slice(-200))
      return NextResponse.json({ 
        error: 'Failed to parse transaction data' 
      }, { status: 500 })
    }
    
    // Log first few transactions to see their structure
    console.log('First 3 parsed transactions:', JSON.stringify(transactions.slice(0, 3), null, 2))
    
    // Check if transactions have categories
    const withCategory = transactions.filter((t: { category?: string }) => t.category)
    const withoutCategory = transactions.filter((t: { category?: string }) => !t.category)
    console.log(`Transactions with category: ${withCategory.length}, without: ${withoutCategory.length}`)
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ 
        error: 'No transactions found in the statement' 
      }, { status: 400 })
    }

    // Find new categories that don't exist in user's DB and create them
    // Note: we check against customCategories (actual DB categories), not allCategories (which includes defaults)
    const existingDbCategoryNames = new Set(customCategories.map(c => c.toLowerCase()))
    const newCategories = new Set<string>()
    
    for (const t of transactions) {
      if (t.category && !existingDbCategoryNames.has(t.category.toLowerCase())) {
        newCategories.add(t.category)
      }
    }
    
    // Create new categories in the database
    if (newCategories.size > 0) {
      const categoriesToInsert = Array.from(newCategories).map(name => {
        // Determine type based on first transaction with this category
        const firstTx = transactions.find((t: { category: string }) => t.category === name)
        const type = firstTx?.type === 'income' ? 'income' : 'expense'
        return {
          name,
          type,
          user_id: user.id,
          expense_type: 'variable'
        }
      })
      
      const { data: insertedCategories, error: insertError } = await supabase
        .from('categories')
        .insert(categoriesToInsert)
        .select('id, name')
      
      if (insertError) {
        console.error('Error creating new categories:', insertError)
      } else {
        console.log(`Created ${newCategories.size} new categories:`, insertedCategories?.map(c => c.name))
      }
    }

    // Log transaction categories for debugging
    const txCategories = [...new Set(transactions.map((t: { category: string }) => t.category))]
    console.log('Transaction categories:', txCategories)

    return NextResponse.json({ transactions, newCategories: Array.from(newCategories) })
  } catch (error: unknown) {
    console.error('Error parsing statement:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to parse statement: ${errorMessage}` }, { status: 500 })
  }
}
