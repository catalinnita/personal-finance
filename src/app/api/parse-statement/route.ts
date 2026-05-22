import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/paginate'
import { batchMatchDescriptions } from '@/lib/mapping-utils'
import { logClaudeUsage } from '@/lib/claude-usage'
import { DEFAULT_CATEGORIES, CLAUDE_MODEL, CLAUDE_MAX_TOKENS_PARSE, CLAUDE_MAX_TOKENS_CATEGORIZE } from '@/config/constants'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

// Prompt for initial parsing - extracts transactions without categories
function buildParsePrompt() {
  return `Parse this bank statement and extract ALL transactions.

For each transaction provide:
- date: YYYY-MM-DD format
- amount: number (positive=income, negative=expense)
- description: short description (max 50 chars). Remove any hashes, reference numbers, transaction IDs, or alphanumeric codes. Keep only meaningful merchant names.
- type: "income" or "expense"

Return ONLY a JSON array, no explanation. Example:
[{"date":"2024-01-15","amount":2500,"description":"Monthly Salary","type":"income"},{"date":"2024-01-16","amount":-45,"description":"Pet Store Purchase","type":"expense"}]`
}

// Prompt for categorizing unmapped descriptions
function buildCategorizePrompt(categories: string[], descriptions: string[]) {
  return `Categorize these transaction descriptions.

Available categories: ${categories.join(', ')}

Descriptions to categorize:
${descriptions.map((d, i) => `${i + 1}. "${d}"`).join('\n')}

IMPORTANT: EVERY description MUST have a category. Use an existing category if it fits. If NONE fit well, create a NEW relevant category name (short, 1-2 words, capitalized like "Pet Care" or "Bank Fees").

Return ONLY a JSON array with objects containing "description" and "category". Example:
[{"description":"Monthly Salary","category":"Salary"},{"description":"Pet Store","category":"Pet Care"}]`
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
    const categoriesRes = await supabase.from('categories').select('id, name').eq('user_id', user.id)
    const userCategories = categoriesRes.data || []
    const customCategoryNames = userCategories.map(c => c.name)
    const allCategories = [...new Set([...DEFAULT_CATEGORIES, ...customCategoryNames])].sort()
    
    // Fetch all mappings with pagination to bypass 1000 row limit
    type MappingRow = { description_pattern: string; category_id: string; categories: { name: string } | null }
    const allMappingsData = await fetchAllRows<MappingRow>(
      supabase,
      'category_mappings',
      'description_pattern, category_id, categories (name)',
      [{ column: 'user_id', value: user.id }]
    )
    
    // Transform mappings for the matching utility
    const existingMappings = allMappingsData.map(m => ({
      description_pattern: m.description_pattern,
      category_id: m.category_id,
      category_name: (m.categories as unknown as { name: string } | null)?.name || ''
    })).filter(m => m.category_name)

    const parsePrompt = buildParsePrompt()

    const isPdf = file.type === 'application/pdf' || file.name.endsWith('.pdf')
    
    let message

    if (isPdf) {
      const buffer = Buffer.from(await file.arrayBuffer())
      const base64 = buffer.toString('base64')
      
      message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS_PARSE,
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
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS_PARSE,
        messages: [
          {
            role: 'user',
            content: `${parsePrompt}\n\nBank statement content:\n${text}`,
          },
        ],
      })
    }

    // Log Claude usage for parsing
    await logClaudeUsage(
      supabase,
      user.id,
      'parse-statement',
      message.model,
      message.usage.input_tokens,
      message.usage.output_tokens,
      { file_name: file.name, file_type: file.type }
    )

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Do not log response content — may contain sensitive financial data
    console.log('Claude parse response received, length:', responseText.length)
    
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
    
    // Fix truncated JSON - find all complete transaction objects (without category since we parse without it now)
    if (!jsonStr.trim().endsWith(']')) {
      const completeObjects: string[] = []
      const objectRegex = /\{[^{}]*"date"[^{}]*"amount"[^{}]*"description"[^{}]*"type"[^{}]*\}/g
      let match
      while ((match = objectRegex.exec(jsonStr)) !== null) {
        completeObjects.push(match[0])
      }
      
      if (completeObjects.length > 0) {
        jsonStr = '[' + completeObjects.join(',') + ']'
        console.log(`Fixed truncated JSON, recovered ${completeObjects.length} transactions`)
      }
    }
    
    let transactions: { date: string; amount: number; description: string; type: string; category?: string }[]
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

    console.log(`Parsed ${transactions.length} transactions from statement`)

    // ===== 3-STEP OPTIMIZED MAPPING =====
    // Step 1 & 2: Try exact and fuzzy matching first
    const uniqueDescriptions = [...new Set(transactions.map(t => t.description))]
    const { matched, needsAI } = await batchMatchDescriptions(
      supabase,
      user.id,
      uniqueDescriptions,
      existingMappings
    )
    
    console.log(`Mapping results: ${matched.length} matched (exact/fuzzy), ${needsAI.length} need AI`)

    // Build a map of description -> category for matched ones
    const descriptionToCategory = new Map<string, string>()
    for (const m of matched) {
      if (m.category) {
        descriptionToCategory.set(m.description, m.category)
      }
    }

    // Step 3: Use AI only for unmatched descriptions
    const aiCategories = new Map<string, string>()
    if (needsAI.length > 0) {
      const categorizePrompt = buildCategorizePrompt(allCategories, needsAI)
      
      const aiMessage = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS_CATEGORIZE,
        messages: [{ role: 'user', content: categorizePrompt }],
      })

      // Log Claude usage for categorization
      await logClaudeUsage(
        supabase,
        user.id,
        'parse-statement-categorize',
        aiMessage.model,
        aiMessage.usage.input_tokens,
        aiMessage.usage.output_tokens,
        { descriptions_count: needsAI.length }
      )
      
      const aiResponseText = aiMessage.content[0].type === 'text' ? aiMessage.content[0].text : ''
      const aiJsonMatch = aiResponseText.match(/\[[\s\S]*\]/)
      
      if (aiJsonMatch) {
        try {
          const aiResults = JSON.parse(aiJsonMatch[0]) as { description: string; category: string }[]
          for (const r of aiResults) {
            if (r.description && r.category) {
              aiCategories.set(r.description, r.category)
            }
          }
          console.log(`AI categorized ${aiCategories.size} descriptions`)
        } catch (e) {
          console.error('Failed to parse AI categorization response:', e)
        }
      }
    }

    // Merge AI results into description map
    for (const [desc, cat] of aiCategories) {
      descriptionToCategory.set(desc, cat)
    }

    // Apply categories to all transactions
    for (const t of transactions) {
      t.category = descriptionToCategory.get(t.description) || 'Other'
    }

    // Find new categories that don't exist in user's DB and create them
    const existingDbCategoryNames = new Set(customCategoryNames.map(c => c.toLowerCase()))
    const newCategories = new Set<string>()
    
    for (const t of transactions) {
      if (t.category && !existingDbCategoryNames.has(t.category.toLowerCase())) {
        newCategories.add(t.category)
      }
    }
    
    // Create new categories in the database
    if (newCategories.size > 0) {
      const categoriesToInsert = Array.from(newCategories).map(name => {
        const firstTx = transactions.find(t => t.category === name)
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
        console.log(`Created ${newCategories.size} new categories`)
      }
    }

    // Log summary
    const txCategories = [...new Set(transactions.map(t => t.category))]
    console.log('Unique categories assigned:', txCategories.length)

    return NextResponse.json({ 
      transactions, 
      newCategories: Array.from(newCategories),
      matchStats: {
        exactOrFuzzy: matched.length,
        ai: aiCategories.size,
        total: uniqueDescriptions.length
      }
    })
  } catch (error: unknown) {
    console.error('Error parsing statement:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to parse statement: ${errorMessage}` }, { status: 500 })
  }
}
