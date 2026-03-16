import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all budgets with category info, ordered by effective_from desc
    const { data: budgets, error } = await supabase
      .from('budgets')
      .select('id, category_id, amount, effective_from, created_at, categories (id, name)')
      .eq('user_id', user.id)
      .order('effective_from', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to include category name at top level
    const transformedBudgets = budgets?.map(b => ({
      ...b,
      category_name: (b.categories as unknown as { name: string } | null)?.name || ''
    }))

    return NextResponse.json({ budgets: transformedBudgets })
  } catch (error) {
    console.error('Error fetching budgets:', error)
    return NextResponse.json({ error: 'Failed to fetch budgets' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { category_id, amount, effective_from } = await request.json()

    if (!category_id || amount === undefined) {
      return NextResponse.json({ error: 'category_id and amount are required' }, { status: 400 })
    }

    const effectiveDate = effective_from || new Date().toISOString().split('T')[0]

    // Use upsert to handle both insert and update on same day
    const { data, error } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.id,
        category_id,
        amount,
        effective_from: effectiveDate
      }, {
        onConflict: 'user_id,category_id,effective_from'
      })
      .select('id, category_id, amount, effective_from, created_at')
      .single()

    if (error) {
      console.error('Budget upsert error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ budget: data })
  } catch (error) {
    console.error('Error creating budget:', error)
    return NextResponse.json({ error: 'Failed to create budget' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Budget id is required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('budgets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget:', error)
    return NextResponse.json({ error: 'Failed to delete budget' }, { status: 500 })
  }
}
