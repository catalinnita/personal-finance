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
      const saved = localStorage.getItem('timeline-selected-categories')
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          const validCategories = parsed.filter((c: string) => categories.includes(c))
          if (validCategories.length > 0) {
            setSelectedCategories(validCategories)
            return
          }
        } catch {
          // ignore
        }
      }
      setSelectedCategories(categories.slice(0, 5))
    }
  }, [categories])

  useEffect(() => {
    if (selectedCategories.length > 0) {
      localStorage.setItem('timeline-selected-categories', JSON.stringify(selectedCategories))
    }
  }, [selectedCategories])

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

  const getCategoryFillColor = (index: number) => {
    const colors = [
      '#3b82f6', // brand-500
      '#22c55e', // success-500
      '#ef4444', // error-500
      '#f59e0b', // warning-500
      '#a855f7', // purple-500
      '#ec4899', // pink-500
      '#06b6d4', // cyan-500
      '#f97316', // orange-500
      '#14b8a6', // teal-500
      '#6366f1', // indigo-500
    ]
    return colors[index % colors.length]
  }

  // Calculate stacked data for area chart
  const stackedData = useMemo(() => {
    return availablePeriods.map(period => {
      const values: { [key: string]: number | string; period: string; total: number } = { period, total: 0 }
      let cumulative = 0
      selectedCategories.forEach(cat => {
        const val = categoryData[cat]?.[period] || 0
        values[cat] = val
        values[`${cat}_y0`] = cumulative
        values[`${cat}_y1`] = cumulative + val
        cumulative += val
      })
      values.total = cumulative
      return values
    })
  }, [availablePeriods, selectedCategories, categoryData])

  const stackedMax = useMemo(() => {
    return Math.max(...stackedData.map(d => d.total as number), 0)
  }, [stackedData])

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

  // Calculate 6-month moving average for a category
  const getMovingAverage = (category: string, periods: string[]) => {
    const data = categoryData[category] || {}
    const values = periods.map(p => data[p] || 0)
    const movingAvg: number[] = []
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - 5)
      const window = values.slice(start, i + 1)
      const avg = window.reduce((sum, v) => sum + v, 0) / window.length
      movingAvg.push(avg)
    }
    
    return movingAvg
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

          {/* Stacked Area Chart - All Categories */}
          {selectedCategories.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-gray-900 dark:text-white">Combined Spending Overview</h3>
                <div className="flex flex-wrap gap-2">
                  {selectedCategories.map((cat) => {
                    const colorIndex = categories.indexOf(cat)
                    return (
                      <div key={cat} className="flex items-center gap-1.5 text-xs">
                        <div className={`w-2.5 h-2.5 rounded-sm ${getCategoryColor(colorIndex)}`} />
                        <span className="text-gray-600 dark:text-gray-400">{cat}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
              <div className="relative" style={{ height: '280px' }}>
                {/* Chart area */}
                <div className="absolute inset-0 bottom-8">
                  <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
                    {/* Render areas in reverse order so first category is on top visually */}
                    {[...selectedCategories].reverse().map((cat) => {
                      const colorIndex = categories.indexOf(cat)
                      const fillColor = getCategoryFillColor(colorIndex)
                      const n = stackedData.length
                      
                      const points = stackedData.map((d, i) => {
                        const y0 = stackedMax > 0 ? 100 - ((d[`${cat}_y0`] as number) / stackedMax) * 95 : 100
                        const y1 = stackedMax > 0 ? 100 - ((d[`${cat}_y1`] as number) / stackedMax) * 95 : 100
                        const x = (i / (n - 1 || 1)) * 100
                        return { x, y0, y1 }
                      })
                      
                      const pathD = `
                        M ${points[0].x} ${points[0].y1}
                        ${points.map(p => `L ${p.x} ${p.y1}`).join(' ')}
                        L ${points[points.length - 1].x} ${points[points.length - 1].y0}
                        ${[...points].reverse().map(p => `L ${p.x} ${p.y0}`).join(' ')}
                        Z
                      `
                      
                      return (
                        <path
                          key={cat}
                          d={pathD}
                          fill={fillColor}
                          fillOpacity={0.7}
                          stroke={fillColor}
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    })}
                  </svg>
                  {/* Hover zones for tooltips */}
                  <div className="absolute inset-0 flex">
                    {stackedData.map((d, i) => (
                      <div 
                        key={i} 
                        className="flex-1 group relative"
                      >
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1.5 rounded whitespace-nowrap z-50 pointer-events-none">
                          <div className="font-medium mb-1">{d.period}</div>
                          {selectedCategories.map(cat => {
                            const val = d[cat] as number
                            if (val > 0) {
                              const colorIndex = categories.indexOf(cat)
                              return (
                                <div key={cat} className="flex items-center gap-1.5">
                                  <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: getCategoryFillColor(colorIndex) }} />
                                  <span>{cat}: {formatAmount(val)}</span>
                                </div>
                              )
                            }
                            return null
                          })}
                          <div className="border-t border-gray-600 mt-1 pt-1 font-medium">
                            Total: {formatAmount(d.total as number)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                {/* X-axis labels */}
                <div className="absolute bottom-0 left-0 right-0 h-8 flex">
                  {stackedData.map((d, i) => (
                    <div 
                      key={i} 
                      className="flex-1 flex items-center justify-center"
                    >
                      <span 
                        className="text-xs text-gray-400"
                        style={{ fontSize: stackedData.length > 36 ? '7px' : stackedData.length > 24 ? '8px' : '10px' }}
                      >
                        {stackedData.length > 36
                          ? (i % 6 === 0 ? (useMonthYear ? `${(d.period as string).substring(0, 1)}'${(d.period as string).split(' ')[1]?.substring(2)}` : (d.period as string).substring(0, 1)) : '')
                          : stackedData.length > 24 
                            ? (i % 3 === 0 ? (useMonthYear ? `${(d.period as string).substring(0, 1)}'${(d.period as string).split(' ')[1]?.substring(2)}` : (d.period as string).substring(0, 1)) : '')
                            : (useMonthYear ? `${(d.period as string).substring(0, 3)}'${(d.period as string).split(' ')[1]?.substring(2)}` : (d.period as string).substring(0, 3))
                        }
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                Total: {formatAmount(stackedData.reduce((sum, d) => sum + (d.total as number), 0))} across {selectedYears.join(', ')}
              </p>
            </div>
          )}

          {/* Charts Grid */}
          <div className={`grid grid-cols-1 ${selectedYears.length <= 2 ? 'lg:grid-cols-2' : ''} gap-6`}>
            {selectedCategories.map((category, catIndex) => {
              const data = categoryData[category] || {}
              const trend = getTrend(category)
              const total = Object.values(data).reduce((sum, val) => sum + val, 0)
              const categoryMax = Math.max(...Object.values(data), 0)
              const colorIndex = categories.indexOf(category)

              return (
                <div
                  key={category}
                  className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm overflow-visible"
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
                {(() => {
                  const movingAvg = getMovingAverage(category, availablePeriods)
                  const avgMax = scaleMode === 'absolute' ? maxValue : categoryMax
                  
                  return (
                    <div className="relative" style={{ height: '220px' }}>
                      {/* Tooltip layer - outside scroll container */}
                      <div className="absolute inset-x-0 top-0 h-8 flex z-50 pointer-events-none">
                        {availablePeriods.map((period, idx) => {
                          const value = data[period] || 0
                          return (
                            <div key={`tooltip-${period}`} className="flex-1 min-w-[10px] flex justify-center" id={`tooltip-zone-${category}-${idx}`}>
                              <div className="hidden group-hover:block absolute top-0 bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap">
                                {period}: {formatAmount(value)} (avg: {formatAmount(movingAvg[idx])})
                              </div>
                            </div>
                          )
                        })}
                      </div>
                      {/* Scrollable bar area */}
                      <div className="flex items-end gap-1 overflow-x-auto pt-8 h-full">
                        {availablePeriods.map((period, idx) => {
                          const value = data[period] || 0
                          const height = getBarHeight(value, categoryMax)
                          const barHeight = value > 0 ? Math.max(height, 5) : 2
                          const avgHeight = avgMax > 0 ? (movingAvg[idx] / avgMax) * 100 : 0
                          
                          return (
                            <div key={period} className="flex-1 min-w-[10px] flex flex-col items-center group/bar">
                              <div className="w-full relative flex flex-col justify-end items-center" style={{ height: '150px' }}>
                                {/* Tooltip - using fixed positioning */}
                                <div className="fixed opacity-0 group-hover/bar:opacity-100 transition-opacity bg-gray-900 dark:bg-gray-700 text-white text-xs px-2 py-1 rounded whitespace-nowrap z-[100] pointer-events-none -translate-x-1/2 -translate-y-full"
                                  style={{ top: 'var(--tooltip-top, 0)', left: 'var(--tooltip-left, 0)' }}
                                  ref={(el) => {
                                    if (el) {
                                      const parent = el.parentElement
                                      if (parent) {
                                        const rect = parent.getBoundingClientRect()
                                        el.style.setProperty('--tooltip-top', `${rect.top - 8}px`)
                                        el.style.setProperty('--tooltip-left', `${rect.left + rect.width / 2}px`)
                                      }
                                    }
                                  }}
                                >
                                  {period}: {formatAmount(value)} (avg: {formatAmount(movingAvg[idx])})
                                </div>
                                {/* Moving Average Line Marker */}
                                <div 
                                  className="absolute w-full flex justify-center z-10"
                                  style={{ bottom: `${Math.min(avgHeight, 100)}%` }}
                                >
                                  <div className="w-3 h-1 bg-gray-900 dark:bg-white rounded-full" />
                                </div>
                                {/* Bar */}
                                <div
                                  className={`w-full rounded-t transition-all duration-300 ${
                                    value > 0 ? getCategoryColor(colorIndex) : 'bg-gray-200 dark:bg-gray-700'
                                  }`}
                                  style={{ height: `${Math.min(barHeight, 100)}%` }}
                                />
                              </div>
                              <div className="h-[40px] flex items-start justify-center mt-1">
                                <span className="text-xs text-gray-400" style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>{useMonthYear ? period.substring(0, 3) + '\'' + period.split(' ')[1]?.substring(2) : period.substring(0, 3)}</span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )
                })()}
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
