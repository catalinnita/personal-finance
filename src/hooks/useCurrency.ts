'use client'

import { useSettingsQuery } from './queries'

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
  const { data, isLoading } = useSettingsQuery()
  const currencyCode = data?.settings?.currency ?? 'USD'
  const currency = CURRENCIES[currencyCode] ?? CURRENCIES.USD

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
    loading: isLoading,
    formatAmount,
    formatAmountWithSign,
  }
}
