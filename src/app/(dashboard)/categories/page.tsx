'use client'

import { useState, useEffect } from 'react'
import { Loader2, PieChart } from 'lucide-react'
import { Transaction } from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'

type CategoryData = {
  [category: string]: number
}

type MonthlyCategories = {
  [month: string]: CategoryData
}

const CATEGORY_COLORS: { [key: string]: string } = {
  Salary: 'bg-green-500',
  Groceries: 'bg-blue-500',
  Utilities: 'bg-yellow-500',
  Entertainment: 'bg-purple-500',
  Transportation: 'bg-orange-500',
  Healthcare: 'bg-red-500',
  Shopping: 'bg-pink-500',
  Dining: 'bg-indigo-500',
  Subscriptions: 'bg-cyan-500',
  Transfer: 'bg-gray-500',
  Investment: 'bg-emerald-500',
  Rent: 'bg-amber-500',
  Insurance: 'bg-teal-500',
  Education: 'bg-violet-500',
  Travel: 'bg-rose-500',
  Other: 'bg-gray-500',
}

export default function CategoriesPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [expandedCell, setExpandedCell] = useState<{ category: string; month: string } | null>(null)
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
  
  if (years.length > 0 && !years.includes(selectedYear)) {
    setSelectedYear(years[0])
  }

  // Filter expenses only for selected year
  const yearExpenses = transactions.filter(t => 
    t.type === 'expense' && new Date(t.date).getFullYear() === selectedYear
  )

  // Group by month and category
  const monthlyCategories: MonthlyCategories = yearExpenses.reduce((acc, t) => {
    const month = new Date(t.date).toLocaleString('default', { month: 'long' })
    if (!acc[month]) {
      acc[month] = {}
    }
    if (!acc[month][t.category]) {
      acc[month][t.category] = 0
    }
    acc[month][t.category] += Math.abs(t.amount)
    return acc
  }, {} as MonthlyCategories)

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  // Get all unique categories
  const allCategories = [...new Set(yearExpenses.map(t => t.category))].sort()

  // Get months that have data
  const availableMonths = months.filter(month => monthlyCategories[month])

  // Set default selected month to the most recent one with data
  if (availableMonths.length > 0 && !selectedMonth) {
    // Find the most recent month with data
    const currentMonth = new Date().toLocaleString('default', { month: 'long' })
    if (availableMonths.includes(currentMonth)) {
      setSelectedMonth(currentMonth)
    } else {
      setSelectedMonth(availableMonths[availableMonths.length - 1])
    }
  }

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
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Expenses by Category</h1>
        {years.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <p className="text-gray-500 dark:text-gray-400">No transactions yet. Upload a statement to see your expenses.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Summary table - moved above month tabs */}
          {allCategories.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Category</th>
                      {months.map(month => (
                        monthlyCategories[month] && (
                          <th key={month} className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">
                            {month.substring(0, 3)}
                          </th>
                        )
                      ))}
                      <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allCategories.map(category => {
                      const categoryTotal = Object.values(monthlyCategories).reduce(
                        (sum, monthData) => sum + (monthData[category] || 0), 0
                      )
                      return (
                        <>
                          <tr key={category} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-3 px-2 text-gray-900 dark:text-white">{category}</td>
                            {months.map(month => (
                              monthlyCategories[month] && (
                                <td key={month} className="py-3 px-2 text-right">
                                  {monthlyCategories[month][category] ? (
                                    <button
                                      onClick={() => setExpandedCell(
                                        expandedCell?.category === category && expandedCell?.month === month
                                          ? null
                                          : { category, month }
                                      )}
                                      className={`text-gray-600 dark:text-gray-300 hover:text-brand-500 dark:hover:text-brand-400 hover:underline transition-colors ${
                                        expandedCell?.category === category && expandedCell?.month === month
                                          ? 'text-brand-500 dark:text-brand-400 font-medium'
                                          : ''
                                      }`}
                                    >
                                      {formatAmount(monthlyCategories[month][category])}
                                    </button>
                                  ) : (
                                    <span className="text-gray-400">-</span>
                                  )}
                                </td>
                              )
                            ))}
                            <td className="py-3 px-2 text-right text-error-500 font-medium">
                              {formatAmount(categoryTotal)}
                            </td>
                          </tr>
                          {/* Expanded transactions row */}
                          {expandedCell?.category === category && (
                            <tr key={`${category}-expanded`}>
                              <td colSpan={availableMonths.length + 2} className="p-0">
                                <div className="bg-gray-50 dark:bg-gray-700/30 p-4 border-b border-gray-200 dark:border-gray-700">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                      {category} - {expandedCell.month} Transactions
                                    </h4>
                                    <button
                                      onClick={() => setExpandedCell(null)}
                                      className="text-xs text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                    >
                                      Close
                                    </button>
                                  </div>
                                  <div className="space-y-1 max-h-[300px] overflow-y-auto">
                                    {yearExpenses
                                      .filter(t => 
                                        t.category === category && 
                                        new Date(t.date).toLocaleString('default', { month: 'long' }) === expandedCell.month
                                      )
                                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                                      .map(t => (
                                        <div 
                                          key={t.id} 
                                          className="flex items-center justify-between py-2 px-3 bg-white dark:bg-gray-800 rounded-lg text-sm"
                                        >
                                          <div className="flex items-center gap-3">
                                            <span className="text-gray-400 dark:text-gray-500 text-xs w-20">
                                              {new Date(t.date).toLocaleDateString()}
                                            </span>
                                            <span className="text-gray-700 dark:text-gray-300">{t.description}</span>
                                          </div>
                                          <span className="text-error-500 font-medium">
                                            {formatAmount(Math.abs(t.amount))}
                                          </span>
                                        </div>
                                      ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Month Tabs */}
          {availableMonths.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-hidden">
              <div className="flex overflow-x-auto border-b border-gray-200 dark:border-gray-700">
                {availableMonths.map(month => {
                  const monthTotal = Object.values(monthlyCategories[month] || {}).reduce((sum, val) => sum + val, 0)
                  return (
                    <button
                      key={month}
                      onClick={() => setSelectedMonth(month)}
                      className={`flex-shrink-0 px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                        selectedMonth === month
                          ? 'border-brand-500 text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                      }`}
                    >
                      <span>{month.substring(0, 3)}</span>
                      <span className="ml-2 text-xs opacity-70">{formatAmount(monthTotal)}</span>
                    </button>
                  )
                })}
              </div>

              {/* Selected Month Content */}
              {selectedMonth && monthlyCategories[selectedMonth] && (
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                      <PieChart className="w-5 h-5 text-brand-500" />
                      {selectedMonth}
                    </h2>
                    <span className="text-gray-500 dark:text-gray-400">
                      Total: <span className="text-error-500 font-medium">
                        {formatAmount(Object.values(monthlyCategories[selectedMonth]).reduce((sum, val) => sum + val, 0))}
                      </span>
                    </span>
                  </div>

                  {/* Category bars */}
                  <div className="space-y-3">
                    {Object.entries(monthlyCategories[selectedMonth])
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => {
                        const total = Object.values(monthlyCategories[selectedMonth]).reduce((sum, val) => sum + val, 0)
                        const percentage = (amount / total) * 100
                        const colorClass = CATEGORY_COLORS[category] || 'bg-gray-500'

                        return (
                          <div key={category}>
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300">{category}</span>
                              <span className="text-sm text-gray-500 dark:text-gray-400">
                                {formatAmount(amount)} ({percentage.toFixed(1)}%)
                              </span>
                            </div>
                            <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full ${colorClass} rounded-full transition-all duration-300`}
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        )
                      })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
