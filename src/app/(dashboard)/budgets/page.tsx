'use client'

import { useState, useEffect, useMemo } from 'react'
import { Trash2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { SectionCard } from '../../../components/SectionCard'

type Category = {
  id: string
  name: string
  type: string
  expense_type: 'fixed' | 'variable'
}

type Budget = {
  id: string
  category_id: string
  category_name: string
  amount: number
  effective_from: string
  created_at: string
}

type Transaction = {
  id: string
  date: string
  amount: number
  description: string
  category: string
}

type CategorySpending = {
  categoryId: string
  category: string
  spending: number
  isFixed: boolean
  budget: number | null
  difference: number | null
  overBudget: boolean
}

export default function BudgetsPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [budgets, setBudgets] = useState<Budget[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [editingBudgets, setEditingBudgets] = useState<Record<string, string>>({})
  const [savingBudget, setSavingBudget] = useState<string | null>(null)
  const { formatAmount, loading: currencyLoading } = useCurrency()

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [categoriesRes, budgetsRes, transactionsRes] = await Promise.all([
        fetch('/api/categories'),
        fetch('/api/budgets'),
        fetch('/api/transactions')
      ])
      
      const categoriesData = await categoriesRes.json()
      const budgetsData = await budgetsRes.json()
      const transactionsData = await transactionsRes.json()
      
      if (categoriesData.categories) {
        // Only expense categories can have budgets
        setCategories(categoriesData.categories.filter((c: Category) => c.type === 'expense'))
      }
      if (budgetsData.budgets) {
        setBudgets(budgetsData.budgets)
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

  const handleDeleteBudget = async (id: string) => {
    try {
      const response = await fetch(`/api/budgets?id=${id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        setBudgets(budgets.filter(b => b.id !== id))
      }
    } catch (error) {
      console.error('Error deleting budget:', error)
    }
  }

  const handleInlineBudgetChange = (categoryId: string, value: string) => {
    setEditingBudgets(prev => ({ ...prev, [categoryId]: value }))
  }

  const handleInlineBudgetSave = async (categoryId: string, currentSpending: number, currentBudget: number | null) => {
    const value = editingBudgets[categoryId]
    // If not editing, nothing to save
    if (value === undefined) return
    
    // Parse the value, default to spending if empty
    const amount = value === '' ? currentSpending : parseFloat(value)
    if (isNaN(amount) || amount < 0) return
    
    // Don't save if value hasn't changed from current budget
    if (currentBudget !== null && amount === currentBudget) {
      setEditingBudgets(prev => {
        const next = { ...prev }
        delete next[categoryId]
        return next
      })
      return
    }

    setSavingBudget(categoryId)
    try {
      const response = await fetch('/api/budgets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category_id: categoryId,
          amount,
          effective_from: new Date().toISOString().split('T')[0]
        })
      })
      
      if (response.ok) {
        await fetchData()
        // Clear the editing state for this category
        setEditingBudgets(prev => {
          const next = { ...prev }
          delete next[categoryId]
          return next
        })
      }
    } catch (error) {
      console.error('Error saving budget:', error)
    } finally {
      setSavingBudget(null)
    }
  }

  // Calculate spending data per category
  const categorySpending = useMemo((): CategorySpending[] => {
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)
    const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 6, 1)

    // Get current budget for each category (most recent effective_from <= today)
    const currentBudgets = new Map<string, number>()
    const today = new Date().toISOString().split('T')[0]
    
    for (const budget of budgets) {
      if (budget.effective_from <= today) {
        const existing = currentBudgets.get(budget.category_name)
        if (!existing) {
          currentBudgets.set(budget.category_name, budget.amount)
        }
      }
    }

    // Calculate spending per category
    const categoryData = new Map<string, { lastMonth: number; total: number; months: Set<string> }>()
    
    for (const tx of transactions) {
      if (tx.amount >= 0) continue // Skip income
      
      const txDate = new Date(tx.date)
      const category = tx.category || 'Other'
      
      if (!categoryData.has(category)) {
        categoryData.set(category, { lastMonth: 0, total: 0, months: new Set() })
      }
      
      const data = categoryData.get(category)!
      const absAmount = Math.abs(tx.amount)
      
      // Last month spending
      if (txDate >= lastMonthStart && txDate <= lastMonthEnd) {
        data.lastMonth += absAmount
      }
      
      // 6-month average
      if (txDate >= sixMonthsAgo) {
        data.total += absAmount
        data.months.add(`${txDate.getFullYear()}-${txDate.getMonth()}`)
      }
    }

    // Build result array for categories with budgets
    const result: CategorySpending[] = []
    
    for (const category of categories) {
      const spending = categoryData.get(category.name)
      const budget = currentBudgets.get(category.name)
      
      const lastMonth = spending?.lastMonth || 0
      const monthCount = spending?.months.size || 1
      const average = spending ? spending.total / Math.max(monthCount, 1) : 0
      const isFixed = (category as Category & { expense_type?: string }).expense_type === 'fixed'
      // Use last month for fixed, average for variable
      const spendingValue = isFixed ? lastMonth : average
      
      result.push({
        categoryId: category.id,
        category: category.name,
        spending: spendingValue,
        isFixed,
        budget: budget ?? null,
        difference: budget ? budget - spendingValue : null,
        overBudget: budget ? spendingValue > budget : false
      })
    }

    // Sort: categories with budgets first, then by name
    return result.sort((a, b) => {
      if (a.budget && !b.budget) return -1
      if (!a.budget && b.budget) return 1
      return a.category.localeCompare(b.category)
    })
  }, [categories, budgets, transactions])

  // Group budgets by category for history view
  const budgetHistory = useMemo(() => {
    const grouped = new Map<string, Budget[]>()
    
    for (const budget of budgets) {
      const key = budget.category_name
      if (!grouped.has(key)) {
        grouped.set(key, [])
      }
      grouped.get(key)!.push(budget)
    }
    
    return grouped
  }, [budgets])

  if (loading || currencyLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
      </div>
    )
  }

  return (
    <div className="max-w-6xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Budgets</h1>

      {/* Budget vs Spending Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 mb-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Budget vs Spending</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Category</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Spending</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Budget</th>
                <th className="text-right py-3 px-4 text-sm font-medium text-gray-500 dark:text-gray-400">Difference</th>
              </tr>
            </thead>
            <tbody>
              {categorySpending.map((row) => (
                <tr 
                  key={row.category}
                  className={`border-b border-gray-100 dark:border-gray-700/50 ${
                    row.overBudget ? 'bg-error-50 dark:bg-error-500/10' : ''
                  }`}
                >
                  <td className="py-3 px-4 text-gray-900 dark:text-white font-medium">
                    <div className="flex items-center gap-2">
                      {row.category}
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        row.isFixed 
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400' 
                          : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {row.isFixed ? 'Fixed' : 'Avg'}
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-right text-gray-700 dark:text-gray-300">
                    {formatAmount(row.spending)}
                  </td>
                  <td className="py-3 px-4 text-right">
                    <input
                      type="number"
                      value={editingBudgets[row.categoryId] ?? (row.budget ?? Math.round(row.spending))}
                      onChange={(e) => handleInlineBudgetChange(row.categoryId, e.target.value)}
                      onBlur={() => handleInlineBudgetSave(row.categoryId, row.spending, row.budget)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleInlineBudgetSave(row.categoryId, row.spending, row.budget)
                        }
                      }}
                      disabled={savingBudget === row.categoryId}
                      placeholder="—"
                      className="w-24 px-2 py-1 text-right border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:border-brand-500 focus:ring-1 focus:ring-brand-500 disabled:opacity-50"
                    />
                  </td>
                  <td className="py-3 px-4 text-right">
                    {row.difference !== null ? (
                      <span className={`flex items-center justify-end gap-1 ${
                        row.overBudget 
                          ? 'text-error-600 dark:text-error-400' 
                          : 'text-success-600 dark:text-success-400'
                      }`}>
                        {row.overBudget ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : row.difference === 0 ? (
                          <Minus className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                        {formatAmount(Math.abs(row.difference))}
                        {row.overBudget ? ' over' : ' under'}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Budget History */}
      <SectionCard className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm" hClassName="text-lg font-semibold text-gray-900 dark:text-white mb-4" label="Budget History">{budgetHistory.size === 0 ? (
          <p className="text-gray-500 dark:text-gray-400">No budgets set yet.</p>
        ) : (
          <div className="space-y-6">
            {Array.from(budgetHistory.entries()).map(([categoryName, categoryBudgets]) => (
              <div key={categoryName}>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2">{categoryName}</h3>
                <div className="space-y-2">
                  {categoryBudgets.map((budget) => (
                    <div 
                      key={budget.id}
                      className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                    >
                      <div>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {formatAmount(budget.amount)}
                        </span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                          from {new Date(budget.effective_from).toLocaleDateString()}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteBudget(budget.id)}
                        className="p-2 text-gray-400 hover:text-error-500 transition-colors"
                        title="Delete budget entry"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}</SectionCard>
    </div>
  )
}
