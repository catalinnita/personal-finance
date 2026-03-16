'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, TrendingUp, TrendingDown } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedYears } from '@/hooks/useSelectedYears'
import { useSelectedCategories } from '@/hooks/useSelectedCategories'

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

type Budget = {
  category_name: string
  amount: number
}

export default function TimelinePage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [scaleMode, setScaleMode] = useState<'relative' | 'absolute'>('relative')
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: React.ReactNode } | null>(null)
  const [movingAvgPeriod, setMovingAvgPeriod] = useState(6)
  const [allUserCategories, setAllUserCategories] = useState<string[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const { formatAmount, loading: currencyLoading } = useCurrency()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [transRes, settingsRes, categoriesRes, budgetsRes] = await Promise.all([
        fetch('/api/transactions'),
        fetch('/api/settings'),
        fetch('/api/categories'),
        fetch('/api/budgets')
      ])
      const transData = await transRes.json()
      const settingsData = await settingsRes.json()
      const categoriesData = await categoriesRes.json()
      const budgetsData = await budgetsRes.json()
      
      if (transData.transactions) {
        setTransactions(transData.transactions)
      }
      if (settingsData.settings?.moving_average_period) {
        setMovingAvgPeriod(settingsData.settings.moving_average_period)
      }
      if (categoriesData.categories) {
        // Only include expense categories
        setAllUserCategories(
          categoriesData.categories
            .filter((c: { type: string }) => c.type === 'expense')
            .map((c: { name: string }) => c.name)
            .sort()
        )
      }
      if (budgetsData.budgets) {
        setBudgets(budgetsData.budgets)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
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

  // Merge transaction categories with all user categories
  const allCategories = useMemo(() => {
    return [...new Set([...allUserCategories, ...categories])].sort()
  }, [allUserCategories, categories])

  const { selectedCategories, toggleCategory } = useSelectedCategories(allCategories)

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

  // Calculate moving average for a category using the configured period
  const getMovingAverage = (category: string, periods: string[]) => {
    const data = categoryData[category] || {}
    const values = periods.map(p => data[p] || 0)
    const movingAvg: number[] = []
    
    for (let i = 0; i < values.length; i++) {
      const start = Math.max(0, i - (movingAvgPeriod - 1))
      const windowSlice = values.slice(start, i + 1)
      const avg = windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length
      movingAvg.push(avg)
    }
    
    return movingAvg
  }

  // Get budget for a category (most recent effective budget)
  const getCategoryBudget = (categoryName: string): number | null => {
    const categoryBudgets = budgets.filter(b => b.category_name === categoryName)
    if (categoryBudgets.length === 0) return null
    // Budgets are already sorted by effective_from desc, so first one is current
    return categoryBudgets[0].amount
  }

  if (loading || currencyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Global Tooltip */}
      {tooltip && (
        <div 
          className="fixed bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-[9999] pointer-events-none"
          style={{ 
            left: tooltip.x, 
            top: tooltip.y - 10,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
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
                          stroke="white"
                          strokeWidth={1}
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    })}
                    {/* Moving average line */}
                    {(() => {
                      const totals = stackedData.map(d => d.total as number)
                      const movingAvg: number[] = []
                      for (let i = 0; i < totals.length; i++) {
                        const start = Math.max(0, i - (movingAvgPeriod - 1))
                        const windowSlice = totals.slice(start, i + 1)
                        movingAvg.push(windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length)
                      }
                      const n = stackedData.length
                      const avgPoints = movingAvg.map((avg, i) => {
                        const y = stackedMax > 0 ? 100 - (avg / stackedMax) * 95 : 100
                        const x = (i / (n - 1 || 1)) * 100
                        return { x, y }
                      })
                      const linePath = `M ${avgPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`
                      return (
                        <path
                          d={linePath}
                          fill="none"
                          stroke="#1f2937"
                          strokeWidth={2}
                          strokeDasharray="4 2"
                          vectorEffect="non-scaling-stroke"
                        />
                      )
                    })()}
                  </svg>
                  {/* Hover zones for tooltips */}
                  <div className="absolute inset-0 flex z-10">
                    {stackedData.map((d, i) => {
                      const totals = stackedData.map(dd => dd.total as number)
                      const start = Math.max(0, i - (movingAvgPeriod - 1))
                      const windowSlice = totals.slice(start, i + 1)
                      const avg = windowSlice.reduce((sum, v) => sum + v, 0) / windowSlice.length
                      return (
                        <div 
                          key={i} 
                          className="flex-1 cursor-crosshair"
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            setTooltip({
                              x: rect.left + rect.width / 2,
                              y: rect.top,
                              content: (
                                <div>
                                  <div className="font-medium mb-1">{d.period}</div>
                                  {selectedCategories.map(cat => {
                                    const val = d[cat] as number
                                    const colorIndex = categories.indexOf(cat)
                                    return (
                                      <div key={cat} className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-sm" style={{ backgroundColor: getCategoryFillColor(colorIndex) }} />
                                        <span>{cat}: {formatAmount(val)}</span>
                                      </div>
                                    )
                                  })}
                                  <div className="border-t border-gray-600 mt-1 pt-1">
                                    Total: {formatAmount(d.total as number)}
                                  </div>
                                  <div className="text-gray-400">Avg: {formatAmount(avg)}</div>
                                </div>
                              )
                            })
                          }}
                          onMouseLeave={() => setTooltip(null)}
                        />
                      )
                    })}
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
                  const budget = getCategoryBudget(category)
                  const budgetHeight = budget !== null && avgMax > 0 ? (budget / avgMax) * 100 : null
                  
                  return (
                    <div className="relative">
                      {/* Budget Line - spans full width */}
                      {budgetHeight !== null && budget !== null && budget > 0 && (
                        <div 
                          className="absolute left-0 right-0 border-t-2 border-dashed border-black dark:border-white z-20 pointer-events-none"
                          style={{ bottom: `calc(40px + ${Math.min(budgetHeight, 100) * 1.5}px)`, opacity: 0.75 }}
                        />
                      )}
                      <div className="flex items-end gap-1 overflow-x-auto" style={{ height: '200px' }}>
                        {availablePeriods.map((period, idx) => {
                          const value = data[period] || 0
                          const height = getBarHeight(value, categoryMax)
                          const barHeight = value > 0 ? Math.max(height, 5) : 2
                          const avgHeight = avgMax > 0 ? (movingAvg[idx] / avgMax) * 100 : 0
                          
                          return (
                            <div 
                            key={period} 
                            className="flex-1 min-w-[10px] flex flex-col items-center cursor-crosshair"
                            onMouseEnter={(e) => {
                              const rect = e.currentTarget.getBoundingClientRect()
                              setTooltip({
                                x: rect.left + rect.width / 2,
                                y: rect.top,
                                content: (
                                  <div>
                                    <div className="font-medium">{period}</div>
                                    <div>Value: {formatAmount(value)}</div>
                                    <div className="text-gray-400">Avg: {formatAmount(movingAvg[idx])}</div>
                                    {budget !== null && <div className="text-error-400">Budget: {formatAmount(budget)}</div>}
                                  </div>
                                )
                              })
                            }}
                            onMouseLeave={() => setTooltip(null)}
                          >
                              <div className="w-full relative flex flex-col justify-end items-center" style={{ height: '150px' }}>
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
