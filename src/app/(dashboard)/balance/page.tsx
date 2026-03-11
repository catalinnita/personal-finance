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

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Use month-year keys when multiple years selected
  const useMonthYear = selectedYears.length > 1

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
    const date = new Date(t.date)
    const monthName = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    const key = useMonthYear ? `${shortMonths[date.getMonth()]} ${year}` : monthName
    
    if (!acc[key]) {
      acc[key] = { income: 0, expenses: 0, savings: 0 }
    }
    if (t.type === 'income') {
      acc[key].income += Math.abs(t.amount)
    } else {
      acc[key].expenses += Math.abs(t.amount)
    }
    acc[key].savings = acc[key].income - acc[key].expenses
    return acc
  }, {} as MonthlyData)

  // Get available period keys in chronological order
  const availableMonths = useMonthYear
    ? selectedYears.sort((a, b) => a - b).flatMap(year => 
        shortMonths.map(m => `${m} ${year}`)
      ).filter(key => monthlyData[key])
    : months.filter(month => monthlyData[month])

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

          {/* Income vs Expenses Chart */}
          {availableMonths.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Income vs Expenses</h2>
              <div className="flex items-center gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-success-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Income</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-error-500" />
                  <span className="text-sm text-gray-500 dark:text-gray-400">Expenses</span>
                </div>
              </div>
              <div className="relative" style={{ height: '300px' }}>
                {/* Y-axis center line */}
                <div className="absolute left-0 right-0 top-1/2 border-t border-gray-300 dark:border-gray-600" />
                
                {/* Chart container */}
                <div className="flex items-center h-full gap-1 overflow-x-auto">
                  {availableMonths.map(period => {
                    const data = monthlyData[period]
                    if (!data) return null
                    
                    const maxAmount = Math.max(
                      ...availableMonths.map(p => Math.max(monthlyData[p]?.income || 0, monthlyData[p]?.expenses || 0))
                    )
                    
                    const incomeHeight = maxAmount > 0 ? (data.income / maxAmount) * 45 : 0
                    const expenseHeight = maxAmount > 0 ? (data.expenses / maxAmount) * 45 : 0
                    
                    return (
                      <div key={period} className="flex-1 min-w-[50px] flex flex-col items-center h-full group">
                        {/* Top half - Income (positive) */}
                        <div className="h-1/2 w-full flex flex-col justify-end items-center relative pb-1">
                          {/* Tooltip */}
                          <div className="absolute bottom-full mb-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                            +{formatAmount(data.income)}
                          </div>
                          <div 
                            className="w-3/4 bg-success-500 rounded-t transition-all duration-300"
                            style={{ height: `${incomeHeight}%` }}
                          />
                        </div>
                        
                        {/* Bottom half - Expenses (negative) */}
                        <div className="h-1/2 w-full flex flex-col justify-start items-center relative pt-1">
                          <div 
                            className="w-3/4 bg-error-500 rounded-b transition-all duration-300"
                            style={{ height: `${expenseHeight}%` }}
                          />
                          {/* Tooltip */}
                          <div className="absolute top-full mt-1 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10 pointer-events-none">
                            -{formatAmount(data.expenses)}
                          </div>
                        </div>
                        
                        {/* Label */}
                        <span className="text-xs text-gray-400 mt-1 text-center whitespace-nowrap">
                          {useMonthYear ? period.substring(0, 3) + ' ' + period.split(' ')[1]?.substring(2) : period.substring(0, 3)}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>
          )}

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
                  {availableMonths.map(period => {
                    const data = monthlyData[period]
                    if (!data) return null
                    return (
                      <tr key={period} className="border-b border-gray-100 dark:border-gray-700/50">
                        <td className="py-3 px-4 text-gray-900 dark:text-white whitespace-nowrap">{period}</td>
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
