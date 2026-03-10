import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all transactions (no row limit)
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('user_id', user.id)
      .order('date', { ascending: false })
      .limit(10000)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Get category mappings
    const { data: mappings } = await supabase
      .from('category_mappings')
      .select('description_pattern, category')
      .eq('user_id', user.id)

    // Create a lookup map for categories
    const categoryMap = new Map<string, string>()
    mappings?.forEach(m => categoryMap.set(m.description_pattern, m.category))

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

    // Extract category from each new transaction and create/update mappings
    const mappingsToUpsert = newTransactions.map((t: { description: string; category: string }) => ({
      user_id: user.id,
      description_pattern: t.description,
      category: t.category,
    }))

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
