'use client'

import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react'

type Category = {
  id: string
  name: string
  type: 'income' | 'expense'
  expense_type: 'fixed' | 'variable'
}

export default function ManageCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryType, setNewCategoryType] = useState<'income' | 'expense'>('expense')
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories')
      const data = await response.json()
      if (data.categories) setCategories(data.categories)
    } catch (error) {
      console.error('Error fetching categories:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return

    try {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newCategoryName, type: newCategoryType }),
      })

      if (response.ok) {
        const data = await response.json()
        setCategories([...categories, data.category])
        setNewCategoryName('')
      }
    } catch (error) {
      console.error('Error adding category:', error)
    }
  }

  const handleUpdateCategory = async () => {
    if (!editingCategory) return

    try {
      const response = await fetch(`/api/categories/${editingCategory.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editingCategory.name, type: editingCategory.type }),
      })

      if (response.ok) {
        const data = await response.json()
        setCategories(categories.map(c => c.id === editingCategory.id ? data.category : c))
        setEditingCategory(null)
      }
    } catch (error) {
      console.error('Error updating category:', error)
    }
  }

  const handleDeleteCategory = async (id: string) => {
    if (!confirm('Are you sure you want to delete this category?')) return

    try {
      const response = await fetch(`/api/categories/${id}`, { method: 'DELETE' })
      if (response.ok) {
        setCategories(categories.filter(c => c.id !== id))
      }
    } catch (error) {
      console.error('Error deleting category:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-brand-500 animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Manage Categories</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Custom Categories</h2>
        
        {/* Add new category */}
        <div className="flex gap-3 mb-6">
          <input
            type="text"
            value={newCategoryName}
            onChange={(e) => setNewCategoryName(e.target.value)}
            placeholder="Category name"
            className="flex-1 px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          />
          <select
            value={newCategoryType}
            onChange={(e) => setNewCategoryType(e.target.value as 'income' | 'expense')}
            className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
          >
            <option value="expense">Expense</option>
            <option value="income">Income</option>
          </select>
          <button
            onClick={handleAddCategory}
            className="flex items-center gap-2 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add
          </button>
        </div>

        {/* Categories list */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {categories.map((category) => (
            <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
              {editingCategory?.id === category.id ? (
                <div className="flex items-center gap-3 flex-1">
                  <input
                    type="text"
                    value={editingCategory.name}
                    onChange={(e) => setEditingCategory({ ...editingCategory, name: e.target.value })}
                    className="flex-1 px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  />
                  <select
                    value={editingCategory.type}
                    onChange={(e) => setEditingCategory({ ...editingCategory, type: e.target.value as 'income' | 'expense' })}
                    className="px-3 py-1.5 bg-white dark:bg-gray-600 border border-gray-200 dark:border-gray-500 rounded text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                  <button onClick={handleUpdateCategory} className="p-1 text-success-500 hover:text-success-400">
                    <Save className="w-4 h-4" />
                  </button>
                  <button onClick={() => setEditingCategory(null)} className="p-1 text-gray-400 hover:text-gray-900 dark:hover:text-white">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="text-gray-900 dark:text-white">{category.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded ${
                      category.type === 'income' ? 'bg-success-100 dark:bg-success-500/20 text-success-600 dark:text-success-400' : 'bg-error-100 dark:bg-error-500/20 text-error-600 dark:text-error-400'
                    }`}>
                      {category.type}
                    </span>
                    {category.type === 'expense' && (
                      <button
                        onClick={async () => {
                          const newExpenseType = category.expense_type === 'fixed' ? 'variable' : 'fixed'
                          try {
                            const response = await fetch('/api/categories', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ id: category.id, expense_type: newExpenseType }),
                            })
                            if (response.ok) {
                              setCategories(categories.map(c => 
                                c.id === category.id ? { ...c, expense_type: newExpenseType } : c
                              ))
                            }
                          } catch (error) {
                            console.error('Error updating expense type:', error)
                          }
                        }}
                        className={`text-xs px-2 py-0.5 rounded cursor-pointer transition-colors ${
                          category.expense_type === 'fixed' 
                            ? 'bg-purple-100 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 hover:bg-purple-200 dark:hover:bg-purple-500/30' 
                            : 'bg-gray-100 dark:bg-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-500'
                        }`}
                      >
                        {category.expense_type || 'variable'}
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingCategory(category)}
                      className="p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category.id)}
                      className="p-2 text-gray-400 hover:text-error-500 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-gray-500 dark:text-gray-400 text-center py-4">No custom categories yet</p>
          )}
        </div>
      </div>
    </div>
  )
}
