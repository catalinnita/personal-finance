'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedYears } from '@/hooks/useSelectedYears'

type Transaction = {
  id: string
  date: string
  amount: number
  description: string
  category: string
  type: 'income' | 'expense'
}

type CategoryMonthlyData = {
  [category: string]: {
    [monthKey: string]: number
  }
}

export default function TimelinePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [scaleMode, setScaleMode] = useState<'relative' | 'absolute'>('relative')
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

  const years = useMemo(() => {
    const yearSet = new Set(transactions.map(t => new Date(t.date).getFullYear()))
    return Array.from(yearSet).sort((a, b) => b - a)
  }, [transactions])

  const { selectedYears, toggleYear } = useSelectedYears(years)

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  // Use month-year keys when multiple years selected
  const useMonthYear = selectedYears.length > 1

  // Generate period keys in chronological order
  const periodKeys = useMemo(() => {
    if (useMonthYear) {
      return selectedYears.sort((a, b) => a - b).flatMap(year => 
        months.map(m => `${m} ${year}`)
      )
    }
    return months
  }, [selectedYears, useMonthYear])

  const { categoryData, categories, maxValue, availablePeriods } = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const year = new Date(t.date).getFullYear()
      return selectedYears.includes(year) && t.type === 'expense'
    })

    const data: CategoryMonthlyData = {}
    const catSet = new Set<string>()
    const periodsWithData = new Set<string>()

    yearTransactions.forEach(t => {
      const date = new Date(t.date)
      const month = date.getMonth()
      const year = date.getFullYear()
      const periodKey = useMonthYear ? `${months[month]} ${year}` : months[month]
      const category = t.category || 'Uncategorized'
      
      catSet.add(category)
      periodsWithData.add(periodKey)
      
      if (!data[category]) {
        data[category] = {}
      }
      if (!data[category][periodKey]) {
        data[category][periodKey] = 0
      }
      data[category][periodKey] += Math.abs(t.amount)
    })

    const cats = Array.from(catSet).sort()
    
    let max = 0
    Object.values(data).forEach(monthData => {
      Object.values(monthData).forEach(val => {
        if (val > max) max = val
      })
    })

    // Filter period keys to only those with data
    const available = periodKeys.filter(k => periodsWithData.has(k))

    return { categoryData: data, categories: cats, maxValue: max, availablePeriods: available }
  }, [transactions, selectedYears, useMonthYear, periodKeys])

  useEffect(() => {
    if (categories.length > 0 && selectedCategories.length === 0) {
      setSelectedCategories(categories.slice(0, 5))
    }
  }, [categories])

  const toggleCategory = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }

  const getBarHeight = (value: number, categoryMax: number) => {
    if (scaleMode === 'absolute') {
      if (maxValue === 0) return 0
      return (value / maxValue) * 100
    } else {
      if (categoryMax === 0) return 0
      return (value / categoryMax) * 100
    }
  }

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

  const getTrend = (category: string) => {
    const data = categoryData[category]
    if (!data) return null
    
    const values = months.map(m => data[m] || 0).filter(v => v > 0)
    if (values.length < 2) return null
    
    const lastTwo = values.slice(-2)
    const diff = lastTwo[1] - lastTwo[0]
    const percent = lastTwo[0] > 0 ? ((diff / lastTwo[0]) * 100).toFixed(0) : 0
    
    return { diff, percent, increasing: diff > 0 }
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
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Spending Timeline</h1>
          <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
            Track your spending evolution by category over time
          </p>
        </div>
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
          <p className="text-gray-500 dark:text-gray-400">No transactions yet. Upload a statement to see your spending timeline.</p>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="text-sm text-gray-500 dark:text-gray-400">Select categories to display:</p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Scale:</span>
                <button
                  onClick={() => setScaleMode('relative')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    scaleMode === 'relative'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Relative
                </button>
                <button
                  onClick={() => setScaleMode('absolute')}
                  className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                    scaleMode === 'absolute'
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  Absolute
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {categories.map((category, index) => (
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

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {selectedCategories.map((category, catIndex) => {
              const data = categoryData[category] || {}
              const trend = getTrend(category)
              const total = Object.values(data).reduce((sum, val) => sum + val, 0)
              const categoryMax = Math.max(...Object.values(data), 0)
              const colorIndex = categories.indexOf(category)

              return (
                <div
                  key={category}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${getCategoryColor(colorIndex)}`} />
                      <h3 className="font-semibold text-gray-900 dark:text-white">{category}</h3>
                    </div>
                    {trend && (
                      <div className={`flex items-center gap-1 text-sm ${
                        trend.increasing ? 'text-error-500' : 'text-success-500'
                      }`}>
                        {trend.increasing ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        <span>{trend.increasing ? '+' : ''}{trend.percent}%</span>
                      </div>
                    )}
                  </div>

                  <p className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
                    {formatAmount(total)}
                    <span className="text-sm font-normal text-gray-500 dark:text-gray-400 ml-2">
                      total in {selectedYears.join(', ')}
                    </span>
                  </p>

                  {/* Bar Chart */}
                  <div className="flex items-end gap-1 overflow-x-auto pt-8" style={{ height: '180px' }}>
                    {availablePeriods.map((period) => {
                      const value = data[period] || 0
                      const height = getBarHeight(value, categoryMax)
                      const barHeight = value > 0 ? Math.max(height, 5) : 2
                      
                      return (
                        <div key={period} className="flex-1 min-w-[20px] flex flex-col items-center group h-full">
                          <div className="w-full h-full relative flex flex-col justify-end items-center">
                            {/* Tooltip - positioned inside container */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-20 pointer-events-none">
                              {period}: {formatAmount(value)}
                            </div>
                            {/* Bar */}
                            <div
                              className={`w-full rounded-t transition-all duration-300 ${
                                value > 0 ? getCategoryColor(colorIndex) : 'bg-gray-200 dark:bg-gray-700'
                              }`}
                              style={{ height: `${barHeight}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 mt-2 flex-shrink-0 text-center whitespace-pre-line">{useMonthYear ? period.substring(0, 3) + '\n\'' + period.split(' ')[1]?.substring(2) : period}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          {selectedCategories.length === 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 text-center border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <p className="text-gray-500 dark:text-gray-400">Select at least one category to view the timeline.</p>
            </div>
          )}
        </>
      )}
    </div>
  )
}
