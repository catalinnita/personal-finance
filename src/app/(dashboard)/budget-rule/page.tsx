'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { useCurrency } from '@/hooks/useCurrency'

type Category = {
  id: string
  name: string
  type: string
  budget_group: 'needs' | 'wants' | 'savings'
}

type Transaction = {
  id: string
  date: string
  amount: number
  description: string
  category: string
  type: string
}

const BUDGET_GROUPS = {
  needs: { label: 'Needs', target: 50, color: '#3b82f6', description: 'Housing, food, utilities, healthcare' },
  wants: { label: 'Wants', target: 30, color: '#8b5cf6', description: 'Entertainment, dining out, shopping' },
  savings: { label: 'Savings & Debt', target: 20, color: '#10b981', description: 'Savings, investments, debt repayment' }
}

export default function BudgetRulePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const { formatAmount, loading: currencyLoading } = useCurrency()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/transactions')
      ])
      
      const categoriesData = await categoriesRes.json()
      const transactionsData = await transactionsRes.json()
      
      if (categoriesData.categories) {
        setCategories(categoriesData.categories)
      }
      if (transactionsData.transactions) {
        setTransactions(transactionsData.transactions)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateBudgetGroup = async (categoryId: string, budgetGroup: string) => {
    setSaving(categoryId)
    try {
      const response = await fetch('/api/categories', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: categoryId, budget_group: budgetGroup })
      })
      
      if (response.ok) {
        setCategories(categories.map(c => 
          c.id === categoryId ? { ...c, budget_group: budgetGroup as 'needs' | 'wants' | 'savings' } : c
        ))
      }
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      setSaving(null)
    }
  }

  // Calculate spending by budget group
  const spendingData = useMemo(() => {
    // Build category to budget_group map
    const categoryToGroup = new Map<string, 'needs' | 'wants' | 'savings'>()
    for (const cat of categories) {
      categoryToGroup.set(cat.name, cat.budget_group || 'needs')
    }

    // Calculate totals
    const totals = { needs: 0, wants: 0, savings: 0 }
    let totalIncome = 0
    let totalExpenses = 0

    // Get last month's data
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

    for (const tx of transactions) {
      const txDate = new Date(tx.date)
      if (txDate < lastMonthStart || txDate > lastMonthEnd) continue

      if (tx.amount > 0) {
        totalIncome += tx.amount
      } else {
        const absAmount = Math.abs(tx.amount)
        totalExpenses += absAmount
        const group = categoryToGroup.get(tx.category) || 'needs'
        totals[group] += absAmount
      }
    }

    const total = totals.needs + totals.wants + totals.savings

    return {
      totals,
      totalIncome,
      totalExpenses,
      total,
      percentages: {
        needs: total > 0 ? (totals.needs / total) * 100 : 0,
        wants: total > 0 ? (totals.wants / total) * 100 : 0,
        savings: total > 0 ? (totals.savings / total) * 100 : 0
      }
    }
  }, [categories, transactions])

  const pieData = useMemo(() => {
    return [
      { name: 'Needs', value: spendingData.totals.needs, color: BUDGET_GROUPS.needs.color },
      { name: 'Wants', value: spendingData.totals.wants, color: BUDGET_GROUPS.wants.color },
      { name: 'Savings & Debt', value: spendingData.totals.savings, color: BUDGET_GROUPS.savings.color }
    ].filter(d => d.value > 0)
  }, [spendingData])

  // Group categories by budget_group
  const categoriesByGroup = useMemo(() => {
    const grouped: Record<string, Category[]> = { needs: [], wants: [], savings: [] }
    for (const cat of categories.filter(c => c.type === 'expense')) {
      const group = cat.budget_group || 'needs'
      grouped[group].push(cat)
    }
    return grouped
  }, [categories])

  if (loading || currencyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">50/30/20 Budget Rule</h1>
      <p className="text-gray-500 dark:text-gray-400 mb-6">
        Allocate 50% to needs, 30% to wants, and 20% to savings & debt repayment
      </p>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {(Object.entries(BUDGET_GROUPS) as [keyof typeof BUDGET_GROUPS, typeof BUDGET_GROUPS.needs][]).map(([key, group]) => {
          const actual = spendingData.percentages[key]
          const diff = actual - group.target
          const isOver = diff > 0
          
          return (
            <div 
              key={key}
              className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm"
            >
              <div className="flex items-center gap-3 mb-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <h3 className="font-semibold text-gray-900 dark:text-white">{group.label}</h3>
              </div>
              <div className="text-3xl font-bold text-gray-900 dark:text-white mb-1">
                {actual.toFixed(1)}%
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Target: {group.target}%
              </div>
              <div className={`text-sm font-medium ${
                isOver ? 'text-error-600 dark:text-error-400' : 'text-success-600 dark:text-success-400'
              }`}>
                {isOver ? '+' : ''}{diff.toFixed(1)}% {isOver ? 'over' : 'under'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {formatAmount(spendingData.totals[key])}
              </div>
            </div>
          )
        })}
      </div>

      {/* Pie Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Last Month Spending Distribution</h2>
        {pieData.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={2}
                  dataKey="value"
                  label={({ name, percent }) => `${name || ''}: ${((percent || 0) * 100).toFixed(1)}%`}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value) => formatAmount(Number(value) || 0)}
                  contentStyle={{
                    backgroundColor: 'var(--tooltip-bg, #1f2937)',
                    border: 'none',
                    borderRadius: '8px',
                    color: 'var(--tooltip-text, #fff)'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400 text-center py-8">
            No spending data for last month
          </p>
        )}
      </div>

      {/* Category Assignment */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Category Assignments</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Assign each category to a budget group. Changes are saved automatically.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {(Object.entries(BUDGET_GROUPS) as [keyof typeof BUDGET_GROUPS, typeof BUDGET_GROUPS.needs][]).map(([groupKey, group]) => (
            <div key={groupKey}>
              <div className="flex items-center gap-2 mb-3">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: group.color }}
                />
                <h3 className="font-medium text-gray-900 dark:text-white">{group.label}</h3>
                <span className="text-sm text-gray-500 dark:text-gray-400">({group.target}%)</span>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{group.description}</p>
              <div className="space-y-2">
                {categoriesByGroup[groupKey].map(cat => (
                  <div 
                    key={cat.id}
                    className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-sm text-gray-900 dark:text-white">{cat.name}</span>
                    <select
                      value={cat.budget_group || 'needs'}
                      onChange={(e) => handleUpdateBudgetGroup(cat.id, e.target.value)}
                      disabled={saving === cat.id}
                      className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    >
                      <option value="needs">Needs</option>
                      <option value="wants">Wants</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                ))}
                {categoriesByGroup[groupKey].length === 0 && (
                  <p className="text-sm text-gray-400 italic">No categories</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
