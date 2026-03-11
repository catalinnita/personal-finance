'use client'

import { useState, useEffect, useMemo } from 'react'
import { Loader2, Trash2, AlertTriangle, Calendar, Copy, Database } from 'lucide-react'

type Transaction = {
  id: string
  date: string
  amount: number
  description: string
  category: string
  type: 'income' | 'expense'
}

export default function CleanupPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)
  const [selectedMonth, setSelectedMonth] = useState<string>('')
  const [confirmAction, setConfirmAction] = useState<'duplicates' | 'month' | 'all' | null>(null)
  const [result, setResult] = useState<{ type: 'success' | 'error', message: string } | null>(null)

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

  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>()
    transactions.forEach(t => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      monthSet.add(monthKey)
    })
    return Array.from(monthSet).sort().reverse()
  }, [transactions])

  const duplicates = useMemo(() => {
    const seen = new Map<string, Transaction[]>()
    transactions.forEach(t => {
      const key = `${t.date}|${t.description}|${t.amount}`
      if (!seen.has(key)) {
        seen.set(key, [])
      }
      seen.get(key)!.push(t)
    })
    
    const dups: Transaction[] = []
    seen.forEach(group => {
      if (group.length > 1) {
        // Keep the first one, mark the rest as duplicates
        dups.push(...group.slice(1))
      }
    })
    return dups
  }, [transactions])

  const transactionsInMonth = useMemo(() => {
    if (!selectedMonth) return []
    return transactions.filter(t => {
      const date = new Date(t.date)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      return monthKey === selectedMonth
    })
  }, [transactions, selectedMonth])

  const formatMonth = (monthKey: string) => {
    const [year, month] = monthKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1)
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
  }

  const handleDeleteDuplicates = async () => {
    if (duplicates.length === 0) return
    setDeleting(true)
    setResult(null)
    
    try {
      const deletePromises = duplicates.map(t => 
        fetch(`/api/transactions/${t.id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      setResult({ type: 'success', message: `Successfully deleted ${duplicates.length} duplicate transactions.` })
      await fetchTransactions()
    } catch (error) {
      setResult({ type: 'error', message: 'Failed to delete duplicates. Please try again.' })
    } finally {
      setDeleting(false)
      setConfirmAction(null)
    }
  }

  const handleDeleteMonth = async () => {
    if (transactionsInMonth.length === 0) return
    setDeleting(true)
    setResult(null)
    
    try {
      const deletePromises = transactionsInMonth.map(t => 
        fetch(`/api/transactions/${t.id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      setResult({ type: 'success', message: `Successfully deleted ${transactionsInMonth.length} transactions from ${formatMonth(selectedMonth)}.` })
      setSelectedMonth('')
      await fetchTransactions()
    } catch (error) {
      setResult({ type: 'error', message: 'Failed to delete transactions. Please try again.' })
    } finally {
      setDeleting(false)
      setConfirmAction(null)
    }
  }

  const handleDeleteAll = async () => {
    if (transactions.length === 0) return
    setDeleting(true)
    setResult(null)
    
    try {
      const deletePromises = transactions.map(t => 
        fetch(`/api/transactions/${t.id}`, { method: 'DELETE' })
      )
      await Promise.all(deletePromises)
      setResult({ type: 'success', message: `Successfully deleted all ${transactions.length} transactions.` })
      await fetchTransactions()
    } catch (error) {
      setResult({ type: 'error', message: 'Failed to delete transactions. Please try again.' })
    } finally {
      setDeleting(false)
      setConfirmAction(null)
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
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Clean Up Data</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Manage and clean your transaction data
        </p>
      </div>

      {result && (
        <div className={`mb-6 p-4 rounded-xl border ${
          result.type === 'success' 
            ? 'bg-success-50 dark:bg-success-500/10 border-success-200 dark:border-success-500/30 text-success-700 dark:text-success-400'
            : 'bg-error-50 dark:bg-error-500/10 border-error-200 dark:border-error-500/30 text-error-700 dark:text-error-400'
        }`}>
          {result.message}
        </div>
      )}

      <div className="space-y-6">
        {/* Delete Duplicates */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-warning-100 dark:bg-warning-500/20 rounded-lg">
              <Copy className="w-6 h-6 text-warning-600 dark:text-warning-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete Duplicates</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Remove duplicate transactions that have the same date, description, and amount.
              </p>
              
              <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                  Found: <span className="text-warning-600 dark:text-warning-400">{duplicates.length} duplicates</span>
                </p>
                <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                  <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Important:</strong> This action will keep the first occurrence of each transaction and delete all subsequent duplicates. This cannot be undone.
                  </p>
                </div>
              </div>

              {confirmAction === 'duplicates' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteDuplicates}
                    disabled={deleting || duplicates.length === 0}
                    className="px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction('duplicates')}
                  disabled={duplicates.length === 0}
                  className="px-4 py-2 bg-warning-500 hover:bg-warning-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete {duplicates.length} Duplicates
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Delete by Month */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
              <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete Data from a Specific Month</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Remove all transactions from a selected month.
              </p>
              
              <div className="mb-4">
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="px-4 py-2.5 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 w-full max-w-xs"
                >
                  <option value="">Select a month...</option>
                  {availableMonths.map(month => (
                    <option key={month} value={month}>{formatMonth(month)}</option>
                  ))}
                </select>
              </div>

              {selectedMonth && (
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4 mb-4">
                  <p className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Transactions in {formatMonth(selectedMonth)}: <span className="text-brand-600 dark:text-brand-400">{transactionsInMonth.length}</span>
                  </p>
                  <div className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <AlertTriangle className="w-4 h-4 text-warning-500 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Important:</strong> This will permanently delete all {transactionsInMonth.length} transactions from {formatMonth(selectedMonth)}. This is useful if you accidentally uploaded the wrong statement. This action cannot be undone.
                    </p>
                  </div>
                </div>
              )}

              {confirmAction === 'month' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteMonth}
                    disabled={deleting || transactionsInMonth.length === 0}
                    className="px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Confirm Delete
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction('month')}
                  disabled={!selectedMonth || transactionsInMonth.length === 0}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Month Data
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Delete All Data */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-error-200 dark:border-error-500/30 shadow-theme-sm">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-error-100 dark:bg-error-500/20 rounded-lg">
              <Database className="w-6 h-6 text-error-600 dark:text-error-400" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">Delete All Data</h2>
              <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
                Permanently remove all your transaction data.
              </p>
              
              <div className="bg-error-50 dark:bg-error-500/10 rounded-lg p-4 mb-4 border border-error-200 dark:border-error-500/30">
                <p className="text-sm font-medium text-error-700 dark:text-error-400 mb-2">
                  Total transactions: <span className="font-bold">{transactions.length}</span>
                </p>
                <div className="flex items-start gap-2 text-sm text-error-600 dark:text-error-400">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <p>
                    <strong>Warning:</strong> This is a destructive action that will permanently delete ALL your transaction data. You will lose your entire financial history. This action cannot be undone. Make sure you have exported or backed up your data before proceeding.
                  </p>
                </div>
              </div>

              {confirmAction === 'all' ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleDeleteAll}
                    disabled={deleting || transactions.length === 0}
                    className="px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                    Yes, Delete Everything
                  </button>
                  <button
                    onClick={() => setConfirmAction(null)}
                    disabled={deleting}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmAction('all')}
                  disabled={transactions.length === 0}
                  className="px-4 py-2 bg-error-500 hover:bg-error-600 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete All Data
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
