import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { DEFAULT_CURRENCY, DEFAULT_HIGHLIGHT_THRESHOLD, DEFAULT_MOVING_AVERAGE_PERIOD } from '@/config/constants'

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
    const userSettings = settings || { currency: DEFAULT_CURRENCY, highlight_threshold: DEFAULT_HIGHLIGHT_THRESHOLD, moving_average_period: DEFAULT_MOVING_AVERAGE_PERIOD }

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
    const { currency, highlight_threshold, moving_average_period } = body

    // Validate currency
    if (currency && !CURRENCIES.find(c => c.code === currency)) {
      return NextResponse.json({ error: 'Invalid currency' }, { status: 400 })
    }

    // Validate highlight_threshold
    const threshold = highlight_threshold !== undefined ? Number(highlight_threshold) : DEFAULT_HIGHLIGHT_THRESHOLD
    if (isNaN(threshold) || threshold < 0) {
      return NextResponse.json({ error: 'Invalid highlight threshold' }, { status: 400 })
    }

    // Validate moving_average_period
    const avgPeriod = moving_average_period !== undefined ? Number(moving_average_period) : DEFAULT_MOVING_AVERAGE_PERIOD
    if (isNaN(avgPeriod) || avgPeriod < 1 || avgPeriod > 24) {
      return NextResponse.json({ error: 'Moving average period must be between 1 and 24' }, { status: 400 })
    }

    // Upsert settings
    const { data, error } = await supabase
      .from('user_settings')
      .upsert({
        user_id: user.id,
        currency: currency || DEFAULT_CURRENCY,
        highlight_threshold: threshold,
        moving_average_period: avgPeriod,
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
