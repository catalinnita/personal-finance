import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const CURRENCIES = [
  { code: 'USD', symbol: '$', name: 'US Dollar' },
  { code: 'EUR', symbol: '€', name: 'Euro' },
  { code: 'GBP', symbol: '£', name: 'British Pound' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
]

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Return default settings if none exist
    const userSettings = settings || { currency: 'USD', highlight_threshold: 500 }

    return NextResponse.json({ 
      settings: userSettings,
      currencies: CURRENCIES
    })
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Failed to fetch settings' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { currency, highlight_threshold } = body

    // Validate currency
    if (currency && !CURRENCIES.find(c => c.code === currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // Validate highlight_threshold
    const threshold = highlight_threshold !== undefined ? Number(highlight_threshold) : 500
    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json({ error: 'Invalid highlight threshold' }, { status: 400 })
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        currency: currency || 'USD',
        highlight_threshold: threshold,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ settings: data })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
  }
}
