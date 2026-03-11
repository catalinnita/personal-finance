import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Join with categories to get category name - fetch all (no limit)
    const { data, error } = await supabase
      .from('category_mappings')
      .select(`
        id,
        description_pattern,
        category_id,
        categories (
          id,
          name
        )
      `, { count: 'exact' })
      .eq('user_id', user.id)
      .order('description_pattern')
      .range(0, 9999)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform to include category name for backward compatibility
    const mappings = data?.map(m => ({
      id: m.id,
      description_pattern: m.description_pattern,
      category_id: m.category_id,
      category: (m.categories as unknown as { id: string; name: string } | null)?.name || ''
    })) || []

    return NextResponse.json({ mappings, count: mappings.length })
  } catch (error) {
    console.error('Error fetching category mappings:', error)
    return NextResponse.json({ error: 'Failed to fetch category mappings' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { description_pattern, category_id } = await request.json()

    console.log('POST mapping:', { description_pattern, category_id, user_id: user.id })

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('category_mappings')
      .select('id')
      .eq('user_id', user.id)
      .eq('description_pattern', description_pattern)
      .maybeSingle()

    console.log('Existing mapping:', existing)

    let result
    if (existing) {
      // Update existing
      result = await supabase
        .from('category_mappings')
        .update({ category_id })
        .eq('id', existing.id)
        .select(`
          id,
          description_pattern,
          category_id,
          categories (
            id,
            name
          )
        `)
        .single()
    } else {
      // Insert new
      result = await supabase
        .from('category_mappings')
        .insert({ description_pattern, category_id, user_id: user.id })
        .select(`
          id,
          description_pattern,
          category_id,
          categories (
            id,
            name
          )
        `)
        .single()
    }

    const { data, error } = result
    console.log('Save result:', { data, error })

    if (error) {
      console.error('Save error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Transform response
    const mapping = {
      id: data.id,
      description_pattern: data.description_pattern,
      category_id: data.category_id,
      category: (data.categories as unknown as { id: string; name: string } | null)?.name || ''
    }

    return NextResponse.json({ mapping })
  } catch (error) {
    console.error('Error creating category mapping:', error)
    return NextResponse.json({ error: 'Failed to create category mapping' }, { status: 500 })
  }
}
