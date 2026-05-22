'use client'

import { useState, useEffect } from 'react'

interface Currency {
  code: string
  symbol: string
  name: string
}

const CURRENCIES: Record<string, Currency> = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound' },
  JPY: { code: 'JPY', symbol: '¥', name: 'Japanese Yen' },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' },
  CHF: { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' },
  CNY: { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee' },
  RON: { code: 'RON', symbol: 'lei', name: 'Romanian Leu' },
}

export function useCurrency() {
  const [currencyCode, setCurrencyCode] = useState<string>('USD')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings')
      if (response.ok) {
        const data = await response.json()
        setCurrencyCode(data.settings?.currency || 'USD')
      }
    } catch (error) {
      console.error('Error fetching currency settings:', error)
    } finally {
      setLoading(false)
    }
  }

  const currency = CURRENCIES[currencyCode] || CURRENCIES.USD

  const formatAmount = (amount: number): string => {
    const absAmount = Math.abs(amount)
    const formatted = new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(absAmount)
    
    return `${currency.symbol}${formatted}`
  }

  const formatAmountWithSign = (amount: number): string => {
    const sign = amount >= 0 ? '+' : '-'
    return `${sign}${formatAmount(amount)}`
  }

  return {
    currency,
    currencyCode,
    loading,
    formatAmount,
    formatAmountWithSign,
    refetch: fetchSettings,
  }
}
