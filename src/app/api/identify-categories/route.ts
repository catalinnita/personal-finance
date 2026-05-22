import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/paginate'
import { batchMatchDescriptions } from '@/lib/mapping-utils'
import { logClaudeUsage } from '@/lib/claude-usage'
import { DEFAULT_CATEGORIES, CLAUDE_MODEL, CLAUDE_MAX_TOKENS_CATEGORIZE } from '@/config/constants'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { descriptions } = await request.json()
    
    if (!descriptions || !Array.isArray(descriptions) || descriptions.length === 0) {
      return NextResponse.json({ error: 'No descriptions provided' }, { status: 400 })
    }

    // Fetch user's categories with IDs
    const categoriesRes = await supabase.from('categories').select('id, name').eq('user_id', user.id)
    const userCategories = categoriesRes.data || []
    const categoryNames = userCategories.map(c => c.name)
    const allCategoryNames = [...new Set([...DEFAULT_CATEGORIES, ...categoryNames])].sort()

    // Fetch existing mappings for 3-step matching
    type MappingRow = { description_pattern: string; category_id: string; categories: { name: string } | null }
    const allMappingsData = await fetchAllRows<MappingRow>(
      supabase,
      'category_mappings',
      'description_pattern, category_id, categories (name)',
      [{ column: 'user_id', value: user.id }]
    )
    
    const existingMappings = allMappingsData.map(m => ({
      description_pattern: m.description_pattern,
      category_id: m.category_id,
      category_name: (m.categories as unknown as { name: string } | null)?.name || ''
    })).filter(m => m.category_name)

    // ===== 3-STEP OPTIMIZED MAPPING =====
    // Step 1 & 2: Try exact and fuzzy matching first
    const { matched, needsAI } = await batchMatchDescriptions(
      supabase,
      user.id,
      descriptions,
      existingMappings
    )
    
    console.log(`Identify categories: ${matched.length} matched (exact/fuzzy), ${needsAI.length} need AI`)

    // Build results from matched descriptions
    const results: { description: string; category: string; category_id: string | null }[] = []
    
    for (const m of matched) {
      results.push({
        description: m.description,
        category: m.category || '',
        category_id: m.category_id
      })
    }

    // Step 3: Use AI only for unmatched descriptions
    const newCategoryNames = new Set<string>()
    
    if (needsAI.length > 0) {
      const prompt = `You are a financial transaction categorizer. For each transaction description below, determine the most appropriate category.

Available categories: ${allCategoryNames.join(', ')}

Transaction descriptions to categorize:
${needsAI.map((d: string, i: number) => `${i + 1}. "${d}"`).join('\n')}

IMPORTANT: EVERY description MUST be categorized. Use one of the available categories if it fits. If NONE of the available categories fit well, create a NEW relevant category name (short, 1-2 words, capitalized like "Pet Care" or "Bank Fees").

Return ONLY a JSON array with objects containing "description" and "category" for each item. Example:
[{"description":"NETFLIX","category":"Subscriptions"},{"description":"TESCO","category":"Groceries"},{"description":"VET CLINIC","category":"Pet Care"}]

Be accurate and consistent. Do NOT skip any description.`

      const message = await anthropic.messages.create({
        model: CLAUDE_MODEL,
        max_tokens: CLAUDE_MAX_TOKENS_CATEGORIZE,
        messages: [{ role: 'user', content: prompt }],
      })

      // Log Claude usage
      await logClaudeUsage(
        supabase,
        user.id,
        'identify-categories',
        message.model,
        message.usage.input_tokens,
        message.usage.output_tokens,
        { descriptions_count: needsAI.length }
      )

      const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
      
      let jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (!jsonMatch) {
        const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
        if (codeBlockMatch) {
          jsonMatch = codeBlockMatch[1].match(/\[[\s\S]*\]/)
        }
      }
      
      if (jsonMatch) {
        const aiResults = JSON.parse(jsonMatch[0]) as { description: string; category: string }[]
        
        // Map category names to IDs
        const categoryNameToId: Record<string, string> = {}
        userCategories.forEach(c => {
          categoryNameToId[c.name.toLowerCase()] = c.id
        })
        
        // Find new categories that need to be created
        for (const r of aiResults) {
          if (r.category && !categoryNameToId[r.category.toLowerCase()]) {
            newCategoryNames.add(r.category)
          }
        }
        
        // Create new categories in the database
        if (newCategoryNames.size > 0) {
          const categoriesToInsert = Array.from(newCategoryNames).map(name => ({
            name,
            type: 'expense' as const,
            user_id: user.id,
            expense_type: 'variable'
          }))
          
          const { data: insertedCategories, error: insertError } = await supabase
            .from('categories')
            .insert(categoriesToInsert)
            .select('id, name')
          
          if (insertError) {
            console.error('Error creating new categories:', insertError)
          } else if (insertedCategories) {
            console.log(`Created ${newCategoryNames.size} new categories:`, Array.from(newCategoryNames))
            insertedCategories.forEach(c => {
              categoryNameToId[c.name.toLowerCase()] = c.id
            })
          }
        }
        
        // Add AI results to final results
        for (const r of aiResults) {
          const categoryId = categoryNameToId[r.category.toLowerCase()]
          if (categoryId) {
            results.push({
              description: r.description,
              category: r.category,
              category_id: categoryId
            })
          }
        }
      }
    }
    
    return NextResponse.json({ 
      results, 
      newCategories: Array.from(newCategoryNames),
      matchStats: {
        exactOrFuzzy: matched.length,
        ai: needsAI.length,
        total: descriptions.length
      }
    })
  } catch (error: unknown) {
    console.error('Error identifying categories:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to identify categories: ${errorMessage}` }, { status: 500 })
  }
}
