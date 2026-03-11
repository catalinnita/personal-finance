import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

const DEFAULT_CATEGORIES = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transportation',
  'Healthcare', 'Shopping', 'Dining', 'Subscriptions', 'Transfer',
  'Investment', 'Rent', 'Insurance', 'Education', 'Travel', 'Other'
]

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

    const prompt = `You are a financial transaction categorizer. For each transaction description below, determine the most appropriate category.

Available categories: ${categoryNames.join(', ')}

Transaction descriptions to categorize:
${descriptions.map((d: string, i: number) => `${i + 1}. "${d}"`).join('\n')}

Return ONLY a JSON array with objects containing "description" and "category" for each item. Example:
[{"description":"NETFLIX","category":"Subscriptions"},{"description":"TESCO","category":"Groceries"}]

Be accurate and consistent. Use one of the available categories only.`

    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
    })

    const responseText = message.content[0].type === 'text' ? message.content[0].text : ''
    
    // Extract JSON from response
    let jsonMatch = responseText.match(/\[[\s\S]*\]/)
    
    if (!jsonMatch) {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/)
      if (codeBlockMatch) {
        jsonMatch = codeBlockMatch[1].match(/\[[\s\S]*\]/)
      }
    }
    
    if (!jsonMatch) {
      return NextResponse.json({ error: 'Failed to parse AI response' }, { status: 500 })
    }

    const aiResults = JSON.parse(jsonMatch[0])
    
    // Map category names to IDs
    const categoryNameToId: Record<string, string> = {}
    userCategories.forEach(c => {
      categoryNameToId[c.name.toLowerCase()] = c.id
    })
    
    // Transform results to include category_id
    const results = aiResults.map((r: { description: string; category: string }) => {
      const categoryId = categoryNameToId[r.category.toLowerCase()]
      return {
        description: r.description,
        category: r.category,
        category_id: categoryId || null
      }
    }).filter((r: { category_id: string | null }) => r.category_id !== null)
    
    return NextResponse.json({ results })
  } catch (error: unknown) {
    console.error('Error identifying categories:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: `Failed to identify categories: ${errorMessage}` }, { status: 500 })
  }
}
