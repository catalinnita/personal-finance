import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all transactions - fetch in batches to bypass 1000 row limit
    type TransactionRow = { id: string; date: string; description: string; amount: number; type: string; user_id: string }
    let allTransactions: TransactionRow[] = []
    let from = 0
    const batchSize = 1000
    
    while (true) {
      const { data: batch, error: batchError } = await supabase
        .from('transactions')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false })
        .range(from, from + batchSize - 1)
      
      if (batchError) {
        return NextResponse.json({ error: batchError.message }, { status: 500 })
      }
      
      if (!batch || batch.length === 0) break
      
      allTransactions = [...allTransactions, ...batch]
      
      if (batch.length < batchSize) break
      from += batchSize
    }
    
    const transactions = allTransactions

    // Get category mappings with joined category names
    const { data: mappings } = await supabase
      .from('category_mappings')
      .select(`
        description_pattern,
        category_id,
        categories (name)
      `)
      .eq('user_id', user.id)

    // Create a lookup map for categories
    const categoryMap = new Map<string, string>()
    mappings?.forEach(m => {
      const categoryName = (m.categories as unknown as { name: string } | null)?.name || 'Other'
      categoryMap.set(m.description_pattern, categoryName)
    })

    // Add category to each transaction based on description mapping
    const transactionsWithCategory = transactions?.map(t => ({
      ...t,
      category: categoryMap.get(t.description) || 'Other'
    }))

    return NextResponse.json({ transactions: transactionsWithCategory })
  } catch (error) {
    console.error('Error fetching transactions:', error)
    return NextResponse.json({ error: 'Failed to fetch transactions' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { transactions } = await request.json()

    // Get existing transactions to check for duplicates
    const { data: existingTransactions } = await supabase
      .from('transactions')
      .select('date, description, amount')
      .eq('user_id', user.id)

    // Create a set of existing transaction keys for fast lookup
    const existingKeys = new Set(
      existingTransactions?.map(t => `${t.date}|${t.description}|${t.amount}`) || []
    )

    // Filter out duplicates
    const newTransactions = transactions.filter((t: { date: string; description: string; amount: number }) => {
      const key = `${t.date}|${t.description}|${t.amount}`
      return !existingKeys.has(key)
    })

    const duplicateCount = transactions.length - newTransactions.length

    // Get user's categories to map names to IDs
    const { data: userCategories } = await supabase
      .from('categories')
      .select('id, name')
      .eq('user_id', user.id)
    
    const categoryNameToId: Record<string, string> = {}
    userCategories?.forEach(c => {
      categoryNameToId[c.name.toLowerCase()] = c.id
    })

    // Extract category from each new transaction and create/update mappings
    type MappingEntry = { user_id: string; description_pattern: string; category_id: string }
    const mappingsToUpsert: MappingEntry[] = newTransactions
      .map((t: { description: string; category: string }): MappingEntry | null => {
        const categoryId = categoryNameToId[t.category.toLowerCase()]
        if (!categoryId) return null
        return {
          user_id: user.id,
          description_pattern: t.description,
          category_id: categoryId,
        }
      })
      .filter((m: MappingEntry | null): m is MappingEntry => m !== null)

    // Upsert category mappings
    if (mappingsToUpsert.length > 0) {
      await supabase
        .from('category_mappings')
        .upsert(mappingsToUpsert, { onConflict: 'user_id,description_pattern' })
    }

    // Insert transactions without category column
    const transactionsWithUser = newTransactions.map((t: Record<string, unknown>) => {
      const { category, ...rest } = t as { category?: string; [key: string]: unknown }
      return {
        ...rest,
        user_id: user.id,
      }
    })

    let savedCount = 0
    if (transactionsWithUser.length > 0) {
      const { data, error } = await supabase
        .from('transactions')
        .insert(transactionsWithUser)
        .select()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }
      savedCount = data?.length || 0
    }

    return NextResponse.json({ 
      saved: savedCount,
      duplicates: duplicateCount,
      transactions: transactionsWithUser
    })
  } catch (error) {
    console.error('Error creating transactions:', error)
    return NextResponse.json({ error: 'Failed to create transactions' }, { status: 500 })
  }
}
