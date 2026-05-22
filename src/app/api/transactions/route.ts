import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { fetchAllRows } from '@/lib/supabase/paginate'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all transactions - fetch in batches to bypass 1000 row limit
    type TransactionRow = { id: string; date: string; description: string; amount: number; type: string; user_id: string }
    const transactions = await fetchAllRows<TransactionRow>(
      supabase,
      'transactions',
      '*',
      [{ column: 'user_id', value: user.id }],
      { column: 'date', ascending: false }
    )

    // Get category mappings with joined category names - paginate to get all
    type MappingRow = { description_pattern: string; category_id: string; categories: { name: string } | null }
    const allMappings = await fetchAllRows<MappingRow>(
      supabase,
      'category_mappings',
      'description_pattern, category_id, categories (name)',
      [{ column: 'user_id', value: user.id }]
    )

    console.log('Transactions fetched:', transactions.length)
    console.log('Mappings fetched:', allMappings.length)

    // Create a lookup map for categories
    const categoryMap = new Map<string, string>()
    allMappings.forEach(m => {
      const categoryName = (m.categories as unknown as { name: string } | null)?.name || 'Other'
      categoryMap.set(m.description_pattern, categoryName)
    })

    // Add category to each transaction based on description mapping
    const transactionsWithCategory = transactions?.map(t => ({
      ...t,
      category: categoryMap.get(t.description) || 'Other'
    }))

    // Log count only — do not log category names or distribution (user data)
    console.log('Transactions returned:', transactionsWithCategory.length)

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

    // Get existing transactions to check for duplicates - paginate to get all
    type ExistingTx = { date: string; description: string; amount: number }
    const allExisting = await fetchAllRows<ExistingTx>(
      supabase,
      'transactions',
      'date, description, amount',
      [{ column: 'user_id', value: user.id }]
    )

    // Create a set of existing transaction keys for fast lookup
    const existingKeys = new Set(
      allExisting.map(t => `${t.date}|${t.description}|${t.amount}`)
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

    console.log('Available categories count:', userCategories?.length ?? 0)

    // Extract category from each new transaction and create/update mappings
    type MappingEntry = { user_id: string; description_pattern: string; category_id: string }
    const unmappedCategories: string[] = []
    const mappingsMap = new Map<string, MappingEntry>()
    
    for (const t of newTransactions as { description: string; category: string }[]) {
      if (!t.category) continue
      const categoryId = categoryNameToId[t.category.toLowerCase()]
      if (!categoryId) {
        unmappedCategories.push(t.category)
        continue
      }
      // Use description as key to deduplicate - last one wins
      mappingsMap.set(t.description, {
        user_id: user.id,
        description_pattern: t.description,
        category_id: categoryId,
      })
    }
    
    const mappingsToUpsert = Array.from(mappingsMap.values())

    if (unmappedCategories.length > 0) {
      console.log('Unmapped category count:', new Set(unmappedCategories).size)
    }
    console.log('Mappings to create:', mappingsToUpsert.length)

    // Upsert category mappings
    if (mappingsToUpsert.length > 0) {
      const { error: mappingError } = await supabase
        .from('category_mappings')
        .upsert(mappingsToUpsert, { onConflict: 'user_id,description_pattern' })
      
      if (mappingError) {
        console.error('Error creating mappings:', mappingError)
      } else {
        console.log(`Created ${mappingsToUpsert.length} category mappings`)
      }
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
