'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

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
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear())
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
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

  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
  ]

  const { categoryData, categories, maxValue } = useMemo(() => {
    const yearTransactions = transactions.filter(t => {
      const year = new Date(t.date).getFullYear()
      return year === selectedYear && t.type === 'expense'
    })

    const data: CategoryMonthlyData = {}
    const catSet = new Set<string>()

    yearTransactions.forEach(t => {
      const month = new Date(t.date).getMonth()
      const monthKey = months[month]
      const category = t.category || 'Uncategorized'
      
      catSet.add(category)
      
      if (!data[category]) {
        data[category] = {}
      }
      if (!data[category][monthKey]) {
        data[category][monthKey] = 0
      }
      data[category][monthKey] += Math.abs(t.amount)
    })

    const cats = Array.from(catSet).sort()
    
    let max = 0
    Object.values(data).forEach(monthData => {
      Object.values(monthData).forEach(val => {
        if (val > max) max = val
      })
    })

    return { categoryData: data, categories: cats, maxValue: max }
  }, [transactions, selectedYear])

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

  const getBarHeight = (value: number) => {
    if (maxValue === 0) return 0
    return (value / maxValue) * 100
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
          <p className="text-gray-500 dark:text-gray-400">No transactions yet. Upload a statement to see your spending timeline.</p>
        </div>
      ) : (
        <>
          {/* Category Filter */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Select categories to display:</p>
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
                      total in {selectedYear}
                    </span>
                  </p>

                  {/* Bar Chart */}
                  <div className="h-40 flex items-end gap-1">
                    {months.map((month, monthIndex) => {
                      const value = data[month] || 0
                      const height = getBarHeight(value)
                      
                      return (
                        <div key={month} className="flex-1 flex flex-col items-center group">
                          <div className="w-full relative flex flex-col items-center">
                            {/* Tooltip */}
                            {value > 0 && (
                              <div className="absolute bottom-full mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-10">
                                {formatAmount(value)}
                              </div>
                            )}
                            {/* Bar */}
                            <div
                              className={`w-full rounded-t transition-all duration-300 ${
                                value > 0 ? getCategoryColor(colorIndex) : 'bg-gray-100 dark:bg-gray-700'
                              }`}
                              style={{ height: `${Math.max(height, value > 0 ? 4 : 2)}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-400 mt-2">{month}</span>
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
