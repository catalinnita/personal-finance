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
  'Investment', 'Rent', 'Insurance', 'Education', 'Travel', 'Other'
]

function buildParsePrompt(categories: string[], mappings: { description_pattern: string; category: string }[]) {
  let prompt = `Parse this bank statement and extract all transactions. For each transaction:
- date: YYYY-MM-DD format
- amount: number (positive=income, negative=expense)
- description: short description (max 50 chars). IMPORTANT: Remove any hashes, reference numbers, transaction IDs, or alphanumeric codes that aren't actual words (e.g., remove "ABC123XYZ", "REF-98765", "TXN#12345"). Keep only meaningful merchant names and descriptions.
- category: one of: ${categories.join(', ')}
- type: "income" or "expense"

Return ONLY a JSON array, no explanation. Be concise with descriptions. Example:
[{"date":"2024-01-15","amount":2500,"description":"Monthly Salary","category":"Salary","type":"income"}]`

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
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      return NextResponse.json({ 
        error: 'No transactions found in the statement' 
      }, { status: 400 })
    }

    return NextResponse.json({ transactions })
  } catch (error: unknown) {
    console.error('Error parsing statement:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to parse statement: ${errorMessage}` }, { status: 500 })
  }
}
