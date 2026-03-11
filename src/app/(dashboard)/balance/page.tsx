'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, PiggyBank, Loader2 } from 'lucide-react'
import { Transaction } from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedYears } from '@/hooks/useSelectedYears'

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
  const { selectedYears, toggleYear } = useSelectedYears(years)

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

          {/* Income vs Expenses Area Chart */}
          {availableMonths.length > 0 && (() => {
            const maxAmount = Math.max(
              ...availableMonths.map(p => Math.max(monthlyData[p]?.income || 0, monthlyData[p]?.expenses || 0))
            )
            const chartHeight = 200
            const chartWidth = Math.max(availableMonths.length * 60, 400)
            
            // Calculate points for income area
            const incomePoints = availableMonths.map((period, i) => {
              const data = monthlyData[period]
              const x = (i / (availableMonths.length - 1 || 1)) * chartWidth
              const y = maxAmount > 0 ? chartHeight - ((data?.income || 0) / maxAmount) * chartHeight : chartHeight
              return { x, y, value: data?.income || 0, period }
            })
            
            // Calculate points for expense area
            const expensePoints = availableMonths.map((period, i) => {
              const data = monthlyData[period]
              const x = (i / (availableMonths.length - 1 || 1)) * chartWidth
              const y = maxAmount > 0 ? chartHeight - ((data?.expenses || 0) / maxAmount) * chartHeight : chartHeight
              return { x, y, value: data?.expenses || 0, period }
            })
            
            // Create SVG path for smooth area
            const createAreaPath = (points: typeof incomePoints) => {
              if (points.length === 0) return ''
              if (points.length === 1) {
                return `M ${points[0].x},${chartHeight} L ${points[0].x},${points[0].y} L ${points[0].x},${chartHeight} Z`
              }
              
              let path = `M ${points[0].x},${chartHeight} L ${points[0].x},${points[0].y}`
              
              for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1]
                const curr = points[i]
                const cpX = (prev.x + curr.x) / 2
                path += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`
              }
              
              path += ` L ${points[points.length - 1].x},${chartHeight} Z`
              return path
            }
            
            // Create line path
            const createLinePath = (points: typeof incomePoints) => {
              if (points.length === 0) return ''
              if (points.length === 1) return `M ${points[0].x},${points[0].y}`
              
              let path = `M ${points[0].x},${points[0].y}`
              
              for (let i = 1; i < points.length; i++) {
                const prev = points[i - 1]
                const curr = points[i]
                const cpX = (prev.x + curr.x) / 2
                path += ` C ${cpX},${prev.y} ${cpX},${curr.y} ${curr.x},${curr.y}`
              }
              
              return path
            }
            
            return (
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
                
                <div className="relative overflow-x-auto">
                  <svg 
                    width={chartWidth} 
                    height={chartHeight + 40} 
                    className="min-w-full"
                    style={{ minWidth: chartWidth }}
                  >
                    {/* Grid lines */}
                    {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                      <line
                        key={ratio}
                        x1={0}
                        y1={chartHeight * ratio}
                        x2={chartWidth}
                        y2={chartHeight * ratio}
                        stroke="currentColor"
                        className="text-gray-200 dark:text-gray-700"
                        strokeWidth={1}
                      />
                    ))}
                    
                    {/* Income area */}
                    <path
                      d={createAreaPath(incomePoints)}
                      fill="rgb(34, 197, 94)"
                      fillOpacity={0.2}
                    />
                    <path
                      d={createLinePath(incomePoints)}
                      fill="none"
                      stroke="rgb(34, 197, 94)"
                      strokeWidth={2}
                    />
                    
                    {/* Expense area */}
                    <path
                      d={createAreaPath(expensePoints)}
                      fill="rgb(239, 68, 68)"
                      fillOpacity={0.2}
                    />
                    <path
                      d={createLinePath(expensePoints)}
                      fill="none"
                      stroke="rgb(239, 68, 68)"
                      strokeWidth={2}
                    />
                    
                    {/* Data points with hover */}
                    {incomePoints.map((point, i) => (
                      <g key={`income-${i}`} className="group">
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={4}
                          fill="rgb(34, 197, 94)"
                          className="cursor-pointer"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={8}
                          fill="transparent"
                          className="cursor-pointer"
                        />
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <rect
                            x={point.x - 40}
                            y={point.y - 30}
                            width={80}
                            height={24}
                            rx={4}
                            fill="rgb(17, 24, 39)"
                          />
                          <text
                            x={point.x}
                            y={point.y - 14}
                            textAnchor="middle"
                            fill="white"
                            fontSize={11}
                          >
                            +{formatAmount(point.value)}
                          </text>
                        </g>
                      </g>
                    ))}
                    
                    {expensePoints.map((point, i) => (
                      <g key={`expense-${i}`} className="group">
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={4}
                          fill="rgb(239, 68, 68)"
                          className="cursor-pointer"
                        />
                        <circle
                          cx={point.x}
                          cy={point.y}
                          r={8}
                          fill="transparent"
                          className="cursor-pointer"
                        />
                        <g className="opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                          <rect
                            x={point.x - 40}
                            y={point.y - 30}
                            width={80}
                            height={24}
                            rx={4}
                            fill="rgb(17, 24, 39)"
                          />
                          <text
                            x={point.x}
                            y={point.y - 14}
                            textAnchor="middle"
                            fill="white"
                            fontSize={11}
                          >
                            -{formatAmount(point.value)}
                          </text>
                        </g>
                      </g>
                    ))}
                    
                    {/* X-axis labels */}
                    {availableMonths.map((period, i) => {
                      const x = (i / (availableMonths.length - 1 || 1)) * chartWidth
                      return (
                        <text
                          key={period}
                          x={x}
                          y={chartHeight + 20}
                          textAnchor="middle"
                          fill="currentColor"
                          className="text-gray-500 dark:text-gray-400"
                          fontSize={11}
                        >
                          {useMonthYear ? period.substring(0, 3) + '\'' + period.split(' ')[1]?.substring(2) : period.substring(0, 3)}
                        </text>
                      )
                    })}
                  </svg>
                </div>
              </div>
            )
          })()}

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
