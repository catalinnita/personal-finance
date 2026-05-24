'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, PiggyBank } from 'lucide-react'
import { Transaction } from '@/types/database'
import { useCurrency } from '@/hooks/useCurrency'
import { useSelectedYears } from '@/hooks/useSelectedYears'
import { TextBlock } from '../../../components/TextBlock'
import { LoadingState } from '../../../components/LoadingState'

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
      <LoadingState />
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
        <TextBlock>No transactions yet. Upload a statement to see your balance.</TextBlock>
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
            const halfHeight = 100
            const chartHeight = halfHeight * 2
            const chartWidth = 800
            const padding = { left: 40, right: 40 }
            
            // Calculate points for income (positive Y, above center line)
            const incomePoints = availableMonths.map((period, i) => {
              const data = monthlyData[period]
              const x = padding.left + (availableMonths.length > 1 ? (i / (availableMonths.length - 1)) * (chartWidth - padding.left - padding.right) : (chartWidth / 2))
              const y = maxAmount > 0 ? halfHeight - ((data?.income || 0) / maxAmount) * (halfHeight - 10) : halfHeight
              return { x, y, value: data?.income || 0, period }
            })
            
            // Calculate points for expenses (negative Y, below center line)
            const expensePoints = availableMonths.map((period, i) => {
              const data = monthlyData[period]
              const x = padding.left + (availableMonths.length > 1 ? (i / (availableMonths.length - 1)) * (chartWidth - padding.left - padding.right) : (chartWidth / 2))
              const y = maxAmount > 0 ? halfHeight + ((data?.expenses || 0) / maxAmount) * (halfHeight - 10) : halfHeight
              return { x, y, value: data?.expenses || 0, period }
            })
            
            // Create SVG path for area with straight lines (income - fills up to center)
            const createIncomeAreaPath = (points: typeof incomePoints) => {
              if (points.length === 0) return ''
              if (points.length === 1) {
                return `M ${points[0].x},${halfHeight} L ${points[0].x},${points[0].y} L ${points[0].x},${halfHeight} Z`
              }
              
              let path = `M ${points[0].x},${halfHeight} L ${points[0].x},${points[0].y}`
              for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x},${points[i].y}`
              }
              path += ` L ${points[points.length - 1].x},${halfHeight} Z`
              return path
            }
            
            // Create SVG path for area with straight lines (expenses - fills down from center)
            const createExpenseAreaPath = (points: typeof expensePoints) => {
              if (points.length === 0) return ''
              if (points.length === 1) {
                return `M ${points[0].x},${halfHeight} L ${points[0].x},${points[0].y} L ${points[0].x},${halfHeight} Z`
              }
              
              let path = `M ${points[0].x},${halfHeight} L ${points[0].x},${points[0].y}`
              for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x},${points[i].y}`
              }
              path += ` L ${points[points.length - 1].x},${halfHeight} Z`
              return path
            }
            
            // Create line path with straight lines
            const createLinePath = (points: typeof incomePoints) => {
              if (points.length === 0) return ''
              if (points.length === 1) return `M ${points[0].x},${points[0].y}`
              
              let path = `M ${points[0].x},${points[0].y}`
              for (let i = 1; i < points.length; i++) {
                path += ` L ${points[i].x},${points[i].y}`
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
                
                <div className="relative">
                  <svg 
                    viewBox={`0 0 ${chartWidth} ${chartHeight + 60}`}
                    className="w-full h-auto"
                    preserveAspectRatio="xMidYMid meet"
                  >
                    {/* Grid lines */}
                    {[0, 0.5, 1].map((ratio) => (
                      <line
                        key={ratio}
                        x1={0}
                        y1={halfHeight * ratio * 2}
                        x2={chartWidth}
                        y2={halfHeight * ratio * 2}
                        stroke="currentColor"
                        className="text-gray-200 dark:text-gray-700"
                        strokeWidth={1}
                      />
                    ))}
                    
                    {/* Center line (zero axis) */}
                    <line
                      x1={0}
                      y1={halfHeight}
                      x2={chartWidth}
                      y2={halfHeight}
                      stroke="currentColor"
                      className="text-gray-400 dark:text-gray-500"
                      strokeWidth={2}
                    />
                    
                    {/* Income area (above center) */}
                    <path
                      d={createIncomeAreaPath(incomePoints)}
                      fill="rgb(34, 197, 94)"
                      fillOpacity={0.3}
                    />
                    <path
                      d={createLinePath(incomePoints)}
                      fill="none"
                      stroke="rgb(34, 197, 94)"
                      strokeWidth={2}
                    />
                    
                    {/* Expense area (below center) */}
                    <path
                      d={createExpenseAreaPath(expensePoints)}
                      fill="rgb(239, 68, 68)"
                      fillOpacity={0.3}
                    />
                    <path
                      d={createLinePath(expensePoints)}
                      fill="none"
                      stroke="rgb(239, 68, 68)"
                      strokeWidth={2}
                    />
                    
                    {/* Data points - income */}
                    {incomePoints.map((point, i) => (
                      <circle
                        key={`income-${i}`}
                        cx={point.x}
                        cy={point.y}
                        r={5}
                        fill="rgb(34, 197, 94)"
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                    
                    {/* Data points - expenses */}
                    {expensePoints.map((point, i) => (
                      <circle
                        key={`expense-${i}`}
                        cx={point.x}
                        cy={point.y}
                        r={5}
                        fill="rgb(239, 68, 68)"
                        stroke="white"
                        strokeWidth={2}
                      />
                    ))}
                    
                    {/* X-axis labels */}
                    {availableMonths.map((period, i) => {
                      const x = padding.left + (availableMonths.length > 1 ? (i / (availableMonths.length - 1)) * (chartWidth - padding.left - padding.right) : (chartWidth / 2))
                      return (
                        <text
                          key={period}
                          x={x}
                          y={chartHeight + 10}
                          textAnchor="start"
                          fill="currentColor"
                          className="text-gray-500 dark:text-gray-400"
                          fontSize={10}
                          transform={`rotate(90, ${x}, ${chartHeight + 10})`}
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

          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm mt-6">
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
