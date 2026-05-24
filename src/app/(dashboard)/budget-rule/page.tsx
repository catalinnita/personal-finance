'use client'

import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'

import { useCurrency } from '@/hooks/useCurrency'
import { CloseButton } from '../../../components/CloseButton'
import { LoadingState } from '../../../components/LoadingState'
import { SectionCard } from '../../../components/SectionCard'

type Category = {
  id: string
  name: string
  type: string
  budget_group: 'needs' | 'wants' | 'savings' | 'excluded'
  expense_type: 'fixed' | 'variable'
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

const EXCLUDED_GROUP = { label: 'Excluded', color: '#6b7280', description: 'Categories not included in 50/30/20 calculations' }

export default function BudgetRulePage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [modalGroup, setModalGroup] = useState<keyof typeof BUDGET_GROUPS | null>(null)
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
          c.id === categoryId ? { ...c, budget_group: budgetGroup as 'needs' | 'wants' | 'savings' | 'excluded' } : c
        ))
      }
    } catch (error) {
      console.error('Error updating category:', error)
    } finally {
      setSaving(null)
    }
  }

  // Calculate per-category spending data first (needed for spendingData)
  const categorySpendingData = useMemo(() => {
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    const spending = new Map<string, { lastMonth: number; total: number; months: Set<string> }>()

    for (const tx of transactions) {
      if (tx.amount >= 0) continue
      const txDate = new Date(tx.date)
      const category = tx.category || 'Other'
      const absAmount = Math.abs(tx.amount)

      if (!spending.has(category)) {
        spending.set(category, { lastMonth: 0, total: 0, months: new Set() })
      }
      const data = spending.get(category)!

      if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
        data.lastMonth += absAmount
      }
      if (txDate >= sixMonthsAgo) {
        data.total += absAmount
        data.months.add(`${txDate.getFullYear()}-${txDate.getMonth()}`)
      }
    }

    return spending
  }, [transactions])

  // Calculate spending by budget group using average for variable, last month for fixed
  const spendingData = useMemo(() => {
    // Build category maps
    const categoryToGroup = new Map<string, 'needs' | 'wants' | 'savings' | 'excluded'>()
    const categoryToExpenseType = new Map<string, 'fixed' | 'variable'>()
    for (const cat of categories) {
      categoryToGroup.set(cat.name, cat.budget_group || 'needs')
      categoryToExpenseType.set(cat.name, cat.expense_type || 'variable')
    }

    // Calculate totals using appropriate value based on expense_type
    const totals = { needs: 0, wants: 0, savings: 0 }
    let totalExpenses = 0

    for (const cat of categories) {
      if (cat.type !== 'expense') continue
      const group = cat.budget_group || 'needs'
      if (group === 'excluded') continue

      const data = categorySpendingData.get(cat.name)
      const lastMonth = data?.lastMonth || 0
      const monthCount = data?.months.size || 1
      const average = data ? data.total / Math.max(monthCount, 1) : 0

      // Use last month for fixed categories, average for variable
      const expenseType = cat.expense_type || 'variable'
      const amount = expenseType === 'fixed' ? lastMonth : average

      totals[group] += amount
      totalExpenses += amount
    }

    const total = totals.needs + totals.wants + totals.savings

    return {
      totals,
      totalExpenses,
      total,
      percentages: {
        needs: total > 0 ? (totals.needs / total) * 100 : 0,
        wants: total > 0 ? (totals.wants / total) * 100 : 0,
        savings: total > 0 ? (totals.savings / total) * 100 : 0
      }
    }
  }, [categories, categorySpendingData])

  const pieData = useMemo(() => {
    return [
      { name: 'Needs', value: spendingData.totals.needs, color: BUDGET_GROUPS.needs.color },
      { name: 'Wants', value: spendingData.totals.wants, color: BUDGET_GROUPS.wants.color },
      { name: 'Savings & Debt', value: spendingData.totals.savings, color: BUDGET_GROUPS.savings.color }
    ].filter(d => d.value > 0)
  }, [spendingData])

  // Group categories by budget_group
  const categoriesByGroup = useMemo(() => {
    const grouped: Record<string, Category[]> = { needs: [], wants: [], savings: [], excluded: [] }
    for (const cat of categories.filter(c => c.type === 'expense')) {
      const group = cat.budget_group || 'needs'
      if (grouped[group]) {
        grouped[group].push(cat)
      }
    }
    return grouped
  }, [categories])

  // Get categories for modal with their spending data
  const getModalCategories = (group: keyof typeof BUDGET_GROUPS) => {
    return categoriesByGroup[group].map(cat => {
      const data = categorySpendingData.get(cat.name)
      const lastMonth = data?.lastMonth || 0
      const monthCount = data?.months.size || 1
      const average = data ? data.total / Math.max(monthCount, 1) : 0
      const expenseType = cat.expense_type || 'variable'
      // Value used in calculation: last month for fixed, average for variable
      const usedValue = expenseType === 'fixed' ? lastMonth : average
      return { ...cat, lastMonth, average, usedValue, isFixed: expenseType === 'fixed' }
    }).sort((a, b) => b.usedValue - a.usedValue)
  }

  if (loading || currencyLoading) {
    return (
      <LoadingState />
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
              <button
                onClick={() => setModalGroup(key)}
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 mt-2 hover:underline cursor-pointer"
              >
                {formatAmount(spendingData.totals[key])}
              </button>
            </div>
          )
        })}
      </div>

      {/* Pie Chart */}
      <SectionCard className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm" hClassName="text-lg font-semibold text-gray-900 dark:text-white mb-4" label="Last Month Spending Distribution">{pieData.length > 0 ? (
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
        )}</SectionCard>

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
                      <option value="excluded">Excluded</option>
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

        {/* Excluded Categories Section */}
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2 mb-3">
            <div 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: EXCLUDED_GROUP.color }}
            />
            <h3 className="font-medium text-gray-900 dark:text-white">{EXCLUDED_GROUP.label}</h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">{EXCLUDED_GROUP.description}</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {categoriesByGroup.excluded.map(cat => (
              <div 
                key={cat.id}
                className="flex items-center justify-between p-2 bg-gray-100 dark:bg-gray-700/30 rounded-lg"
              >
                <span className="text-sm text-gray-600 dark:text-gray-400">{cat.name}</span>
                <select
                  value={cat.budget_group || 'needs'}
                  onChange={(e) => handleUpdateBudgetGroup(cat.id, e.target.value)}
                  disabled={saving === cat.id}
                  className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="needs">Needs</option>
                  <option value="wants">Wants</option>
                  <option value="savings">Savings</option>
                  <option value="excluded">Excluded</option>
                </select>
              </div>
            ))}
            {categoriesByGroup.excluded.length === 0 && (
              <p className="text-sm text-gray-400 italic">No excluded categories</p>
            )}
          </div>
        </div>
      </div>

      {/* Category Breakdown Modal */}
      {modalGroup && (
        <div 
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setModalGroup(null)}
        >
          <div 
            className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[80vh] overflow-hidden shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-3">
                <div 
                  className="w-4 h-4 rounded-full"
                  style={{ backgroundColor: BUDGET_GROUPS[modalGroup].color }}
                />
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {BUDGET_GROUPS[modalGroup].label} Breakdown
                </h2>
              </div>
              <CloseButton onClick={() => setModalGroup(null)} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700" xClassName="w-5 h-5" />
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">6m Avg / Last Month</th>
                    <th className="text-right py-2 text-sm font-medium text-gray-500 dark:text-gray-400">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {getModalCategories(modalGroup).map(cat => (
                    <tr key={cat.id} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 text-gray-900 dark:text-white">{cat.name}</td>
                      <td className="py-3 text-right font-medium text-gray-900 dark:text-white">
                        {formatAmount(cat.usedValue)}
                      </td>
                      <td className="py-3 text-right">
                        <span className={`text-xs px-2 py-0.5 rounded ${
                          cat.isFixed 
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                            : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                        }`}>
                          {cat.isFixed ? 'Fixed' : 'Variable'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {getModalCategories(modalGroup).length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-gray-400">
                        No categories in this group
                      </td>
                    </tr>
                  )}
                </tbody>
                <tfoot>
                  <tr className="border-t border-gray-200 dark:border-gray-700">
                    <td className="py-3 font-semibold text-gray-900 dark:text-white">Total</td>
                    <td className="py-3 text-right font-semibold text-gray-900 dark:text-white">
                      {formatAmount(spendingData.totals[modalGroup])}
                    </td>
                    <td></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
