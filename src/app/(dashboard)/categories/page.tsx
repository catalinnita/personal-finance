'use client'

import { useState, useEffect } from 'react'
import { Loader2, PieChart, X } from 'lucide-react'
import { Transaction } from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedYears } from '@/hooks/useSelectedYears'
import { useSelectedCategories } from '@/hooks/useSelectedCategories'

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
  const [selectedMonth, setSelectedMonth] = useState<string | null>(null)
  const [expandedCell, setExpandedCell] = useState<{ category: string; month: string } | null>(null)
  const [movingAvgPeriod, setMovingAvgPeriod] = useState(6)
  const { formatAmount, loading: currencyLoading } = useCurrency()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transRes, settingsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/settings')
      ])
      const transData = await transRes.json()
      const settingsData = await settingsRes.json()
      
      if (transData.transactions) {
        setTransactions(transData.transactions)
      }
      if (settingsData.settings?.moving_average_period) {
        setMovingAvgPeriod(settingsData.settings.moving_average_period)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const years = [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a)
  const { selectedYears, toggleYear } = useSelectedYears(years)

  // Filter expenses only for selected years
  const yearExpenses = transactions.filter(t => 
    t.type === 'expense' && selectedYears.includes(new Date(t.date).getFullYear())
  )

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ]

  const shortMonths = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

  // Use month-year keys when multiple years selected, otherwise just month
  const useMonthYear = selectedYears.length > 1

  // Group by month (or month-year) and category
  const monthlyCategories: MonthlyCategories = yearExpenses.reduce((acc, t) => {
    const date = new Date(t.date)
    const monthName = date.toLocaleString('default', { month: 'long' })
    const year = date.getFullYear()
    const key = useMonthYear ? `${shortMonths[date.getMonth()]} ${year}` : monthName
    
    if (!acc[key]) {
      acc[key] = {}
    }
    if (!acc[key][t.category]) {
      acc[key][t.category] = 0
    }
    acc[key][t.category] += Math.abs(t.amount)
    return acc
  }, {} as MonthlyCategories)

  // Get all unique categories
  const allCategories = [...new Set(yearExpenses.map(t => t.category))].sort()

  const { selectedCategories, toggleCategory } = useSelectedCategories(allCategories)

  const getCategoryColor = (index: number) => {
    const colors = [
      'bg-brand-500',
      'bg-success-500',
      'bg-error-500',
      'bg-warning-500',
      'bg-purple-500',
      'bg-pink-500',
      'bg-cyan-500',
      'bg-orange-500',
      'bg-teal-500',
      'bg-indigo-500',
    ]
    return colors[index % colors.length]
  }

  const getCategoryBorderColor = (index: number) => {
    const colors = [
      'border-brand-500',
      'border-success-500',
      'border-error-500',
      'border-warning-500',
      'border-purple-500',
      'border-pink-500',
      'border-cyan-500',
      'border-orange-500',
      'border-teal-500',
      'border-indigo-500',
    ]
    return colors[index % colors.length]
  }

  // Filter categories to display
  const displayCategories = allCategories.filter(c => selectedCategories.includes(c))

  // Calculate moving average for a category
  const getMovingAverage = (category: string, periods: string[]) => {
    const values = periods.map(p => monthlyCategories[p]?.[category] || 0)
    if (values.length === 0) return 0
    
    // Use the last N periods for the average
    const start = Math.max(0, values.length - movingAvgPeriod)
    const windowSlice = values.slice(start)
    return windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length
  }

  // Get available period keys in chronological order
  const availableMonths = useMonthYear
    ? selectedYears.sort((a, b) => a - b).flatMap(year => 
        shortMonths.map(m => `${m} ${year}`)
      ).filter(key => monthlyCategories[key])
    : months.filter(month => monthlyCategories[month])

  // Set default selected month to the most recent one with data
  if (availableMonths.length > 0 && !selectedMonth) {
    setSelectedMonth(availableMonths[availableMonths.length - 1])
  }
  
  // Reset selected month when switching between single/multi year
  if (selectedMonth && !availableMonths.includes(selectedMonth)) {
    setSelectedMonth(availableMonths.length > 0 ? availableMonths[availableMonths.length - 1] : null)
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
          <p className="text-gray-500 dark:text-gray-400">No transactions yet. Upload a statement to see your expenses.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Category Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select categories to display:</p>
            <div className="flex flex-wrap gap-2">
              {allCategories.map((category, index) => (
                <button
                  key={category}
                  onClick={() => toggleCategory(category)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border-2 ${
                    selectedCategories.includes(category)
                      ? `${getCategoryColor(index)} text-white border-transparent`
                      : `bg-transparent ${getCategoryBorderColor(index)} text-gray-700 dark:text-gray-300`
                  }`}
                >
                  {category}
                </button>
              ))}
            </div>
          </div>

          {/* Summary table - moved above month tabs */}
          {displayCategories.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Summary</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Category</th>
                      <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">Avg ({movingAvgPeriod}m)</th>
                      {availableMonths.map(period => (
                        <th key={period} className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium whitespace-nowrap">
                          {useMonthYear ? period.substring(0, 3) + '\'' + period.split(' ')[1]?.substring(2) : period.substring(0, 3)}
                        </th>
                      ))}
                      <th className="text-right py-3 px-2 text-gray-500 dark:text-gray-400 font-medium">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayCategories.map(category => {
                      const categoryTotal = Object.values(monthlyCategories).reduce(
                        (sum, monthData) => sum + (monthData[category] || 0), 0
                      )
                      const movingAvg = getMovingAverage(category, availableMonths)
                      return (
                        <>
                          <tr key={category} className="border-b border-gray-100 dark:border-gray-700/50">
                            <td className="py-3 px-2 text-gray-900 dark:text-white">{category}</td>
                            <td className="py-3 px-2 text-right text-gray-500 dark:text-gray-400">
                              {formatAmount(movingAvg)}
                            </td>
                            {availableMonths.map(period => (
                              <td key={period} className="py-3 px-2 text-right">
                                {monthlyCategories[period]?.[category] ? (
                                  <button
                                    onClick={() => setExpandedCell({ category, month: period })}
                                    className="px-2 py-1 rounded text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                                  >
                                    {formatAmount(monthlyCategories[period][category])}
                                  </button>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>
                            ))}
                            <td className="py-3 px-2 text-right text-error-500 font-medium">
                              {formatAmount(categoryTotal)}
                            </td>
                          </tr>
                          </>
                      )
                    })}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 dark:bg-gray-700/50 font-bold">
                      <td className="py-3 px-2 text-gray-900 dark:text-white">Total</td>
                      <td className="py-3 px-2 text-right text-gray-900 dark:text-white bg-gray-200 dark:bg-gray-600/50">
                        {formatAmount(
                          displayCategories.reduce((sum, cat) => sum + getMovingAverage(cat, availableMonths), 0)
                        )}
                      </td>
                      {availableMonths.map(period => (
                        <td key={period} className="py-3 px-2 text-right text-gray-600 dark:text-gray-300">
                          {formatAmount(
                            displayCategories.reduce((sum, cat) => sum + (monthlyCategories[period]?.[cat] || 0), 0)
                          )}
                        </td>
                      ))}
                      <td className="py-3 px-2 text-right text-error-500 bg-gray-200 dark:bg-gray-600/50">
                        {formatAmount(
                          displayCategories.reduce((sum, cat) => 
                            sum + Object.values(monthlyCategories).reduce((s, m) => s + (m[cat] || 0), 0), 0
                          )
                        )}
                      </td>
                    </tr>
                  </tfoot>
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
                        {formatAmount(Object.entries(monthlyCategories[selectedMonth])
                          .filter(([cat]) => selectedCategories.includes(cat))
                          .reduce((sum, [, val]) => sum + val, 0))}
                      </span>
                    </span>
                  </div>

                  {/* Category bars */}
                  <div className="space-y-3">
                    {Object.entries(monthlyCategories[selectedMonth])
                      .filter(([category]) => selectedCategories.includes(category))
                      .sort((a, b) => b[1] - a[1])
                      .map(([category, amount]) => {
                        const filteredTotal = Object.entries(monthlyCategories[selectedMonth])
                          .filter(([cat]) => selectedCategories.includes(cat))
                          .reduce((sum, [, val]) => sum + val, 0)
                        const percentage = filteredTotal > 0 ? (amount / filteredTotal) * 100 : 0
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

      {/* Transactions Modal */}
      {expandedCell && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setExpandedCell(null)}>
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {expandedCell.category} - {expandedCell.month}
              </h3>
              <button
                onClick={() => setExpandedCell(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <div className="space-y-2">
                {yearExpenses
                  .filter(t => {
                    if (t.category !== expandedCell.category) return false
                    const date = new Date(t.date)
                    if (useMonthYear) {
                      const key = `${shortMonths[date.getMonth()]} ${date.getFullYear()}`
                      return key === expandedCell.month
                    } else {
                      return date.toLocaleString('default', { month: 'long' }) === expandedCell.month
                    }
                  })
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .map(t => (
                    <div 
                      key={t.id} 
                      className="flex items-center justify-between py-3 px-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-gray-400 dark:text-gray-500 text-sm w-24">
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
            <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/30">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {yearExpenses.filter(t => {
                    if (t.category !== expandedCell.category) return false
                    const date = new Date(t.date)
                    if (useMonthYear) {
                      const key = `${shortMonths[date.getMonth()]} ${date.getFullYear()}`
                      return key === expandedCell.month
                    } else {
                      return date.toLocaleString('default', { month: 'long' }) === expandedCell.month
                    }
                  }).length} transactions
                </span>
                <span className="font-semibold text-error-500">
                  Total: {formatAmount(monthlyCategories[expandedCell.month]?.[expandedCell.category] || 0)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
