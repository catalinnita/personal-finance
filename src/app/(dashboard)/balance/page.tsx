'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, PiggyBank, Loader2 } from 'lucide-react'
import { Transaction } from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'

type BalanceData = {
  income: number
  expenses: number
  savings: number
}

type MonthlyData = {
  [key: string]: BalanceData
}

export default function BalancePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const { formatAmount, loading: currencyLoading } = useCurrency()

  useEffect(() => {
    fetchTransactions()
  }, [])

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions')
      const data = await response.json()
      if (data.transactions) {
        setTransactions(data.transactions)
      }
    } catch (error) {
      console.error('Error fetching transactions:', error)
    } finally {
      setLoading(false)
    }
  }

  const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a)
  
  // Set default to current year if available, otherwise most recent
  if (years.length > 0 && selectedYears.length === 0) {
    const currentYear = new Date().getFullYear()
    setSelectedYears(years.includes(currentYear) ? [currentYear] : [years[0]])
  }

  const toggleYear = (year: number) => {
    setSelectedYears(prev => 
      prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => b - a)
    )
  }

  const yearTransactions = transactions.filter(t => 
    selectedYears.includes(new Date(t.date).getFullYear())
  )

  const yearlyData: BalanceData = yearTransactions.reduce(
    (acc, t) => {
      if (t.type === 'income') {
        acc.income += Math.abs(t.amount)
      } else {
        acc.expenses += Math.abs(t.amount)
      }
      acc.savings = acc.income - acc.expenses
      return acc
    },
    { income: 0, expenses: 0, savings: 0 }
  )

  const monthlyData: MonthlyData = yearTransactions.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'long' })
    if (!acc[month]) {
      acc[month] = { income: 0, expenses: 0, savings: 0 }
    }
    if (t.type === 'income') {
      acc[month].income += Math.abs(t.amount)
    } else {
      acc[month].expenses += Math.abs(t.amount)
    }
    acc[month].savings = acc[month].income - acc[month].expenses
    return acc
  }, {} as MonthlyData)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  if (loading || currencyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Balance Overview</h1>
        {years.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {years.map(year => (
              <button
                key={year}
                onClick={() => toggleYear(year)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedYears.includes(year)
                    ? 'bg-brand-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <p className="text-gray-500 dark:text-gray-400">No transactions yet. Upload a statement to see your balance.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-success-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-success-500" />
                </div>
                <span className="text-gray-500 dark:text-gray-400">Total Income</span>
              </div>
              <p className="text-3xl font-bold text-success-500">
                {formatAmount(yearlyData.income)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-error-500/20 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-error-500" />
                </div>
                <span className="text-gray-500 dark:text-gray-400">Total Expenses</span>
              </div>
              <p className="text-3xl font-bold text-error-500">
                {formatAmount(yearlyData.expenses)}
              </p>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-brand-500/20 rounded-lg">
                  <PiggyBank className="w-6 h-6 text-brand-500" />
                </div>
                <span className="text-gray-500 dark:text-gray-400">Net Savings</span>
              </div>
              <p className={`text-3xl font-bold ${yearlyData.savings >= 0 ? 'text-success-500' : 'text-error-500'}`}>
                {yearlyData.savings >= 0 ? '+' : '-'}{formatAmount(yearlyData.savings)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Month</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Income</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Expenses</th>
                    <th className="text-right py-3 px-4 text-gray-500 dark:text-gray-400 font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(month => {
                    const data = monthlyData[month]
                    if (!data) return null
                    return (
                      <tr key={month} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-4 text-gray-900 dark:text-white">{month}</td>
                        <td className="py-3 px-4 text-right text-success-500">
                          +{formatAmount(data.income)}
                        </td>
                        <td className="py-3 px-4 text-right text-error-500">
                          -{formatAmount(data.expenses)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          data.savings >= 0 ? 'text-success-500' : 'text-error-500'
                        }`}>
                          {data.savings >= 0 ? '+' : '-'}{formatAmount(data.savings)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
