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
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
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

  const yearTransactions = transactions.filter(t => 
    new Date(t.date).getFullYear() === selectedYear
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
        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Balance Overview</h1>
        {years.length > 0 && (
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {years.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        )}
      </div>

      {transactions.length === 0 ? (
        <div className="bg-slate-800 rounded-xl p-8 text-center">
          <p className="text-slate-400">No transactions yet. Upload a statement to see your balance.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-400" />
                </div>
                <span className="text-slate-400">Total Income</span>
              </div>
              <p className="text-3xl font-bold text-green-400">
                {formatAmount(yearlyData.income)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <TrendingDown className="w-6 h-6 text-red-400" />
                </div>
                <span className="text-slate-400">Total Expenses</span>
              </div>
              <p className="text-3xl font-bold text-red-400">
                {formatAmount(yearlyData.expenses)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <PiggyBank className="w-6 h-6 text-blue-400" />
                </div>
                <span className="text-slate-400">Net Savings</span>
              </div>
              <p className={`text-3xl font-bold ${yearlyData.savings >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {yearlyData.savings >= 0 ? '+' : '-'}{formatAmount(yearlyData.savings)}
              </p>
            </div>
          </div>

          <div className="bg-slate-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Monthly Breakdown</h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-3 px-4 text-slate-400 font-medium">Month</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Income</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Expenses</th>
                    <th className="text-right py-3 px-4 text-slate-400 font-medium">Savings</th>
                  </tr>
                </thead>
                <tbody>
                  {months.map(month => {
                    const data = monthlyData[month]
                    if (!data) return null
                    return (
                      <tr key={month} className="border-b border-slate-700/50">
                        <td className="py-3 px-4 text-white">{month}</td>
                        <td className="py-3 px-4 text-right text-green-400">
                          +{formatAmount(data.income)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-400">
                          -{formatAmount(data.expenses)}
                        </td>
                        <td className={`py-3 px-4 text-right font-medium ${
                          data.savings >= 0 ? 'text-green-400' : 'text-red-400'
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
