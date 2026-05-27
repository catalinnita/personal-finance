'use client'

import { useState, useEffect, useMemo } from 'react'
import { Pencil, Trash2 } from 'lucide-react'
import { Transaction } from '@/types/database'
import TransactionModal from '@/components/TransactionModal'
import { useCurrency } from '@/hooks/useCurrency'
import { useTransactionsQuery, useSettingsQuery, useQueryClient, queryKeys } from '@/hooks/queries'
import { TextBlock } from '../../../components/TextBlock'
import { LoadingState } from '../../../components/LoadingState'
import { PageHeading } from '../../../components/PageHeading'
import { SelectField } from '../../../components/SelectField'

const MONTHS = [
  { value: 0, label: 'All Months' },
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
]

export default function TransactionsPage() {
  const queryClient = useQueryClient()
  const { data: transactions = [], isLoading } = useTransactionsQuery()
  const { data: settingsData } = useSettingsQuery()
  const highlightThreshold = settingsData?.settings?.highlight_threshold ?? 500

  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number>(0)
  const { formatAmount, loading: currencyLoading } = useCurrency()

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setIsModalOpen(true)
  }

  const handleSave = async (updates: Partial<Transaction>) => {
    if (!editingTransaction) return

    try {
      const response = await fetch(`/api/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      }
    } catch (error) {
      console.error('Error updating transaction:', error)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this transaction?')) return

    try {
      const response = await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.transactions })
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
    }
  }

  const years = useMemo(
    () => [...new Set(transactions.map(t => new Date(t.date).getFullYear()))].sort((a, b) => b - a),
    [transactions],
  )

  useEffect(() => {
    if (years.length > 0 && selectedYear === null) setSelectedYear(years[0])
  }, [years, selectedYear])

  const filteredTransactions = useMemo(() => transactions.filter(t => {
    const date = new Date(t.date)
    const yearMatch = selectedYear === null || date.getFullYear() === selectedYear
    const monthMatch = selectedMonth === 0 || (date.getMonth() + 1) === selectedMonth
    return yearMatch && monthMatch
  }), [transactions, selectedYear, selectedMonth])

  if (isLoading || currencyLoading) {
    return (
      <LoadingState />
    )
  }

  return (
    <div>
      <PageHeading className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" label="Transactions">{years.length > 0 && (
          <div className="flex items-center gap-3">
            <SelectField value={selectedYear ?? ''} onChange={(e) => setSelectedYear(parseInt(e.target.value))} className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">{years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}</SelectField>
            
            <SelectField value={selectedMonth} onChange={(e) => setSelectedMonth(parseInt(e.target.value))} className="px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-gray-700 dark:text-gray-300 focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500">{MONTHS.map(month => (
                <option key={month.value} value={month.value}>{month.label}</option>
              ))}</SelectField>
          </div>
        )}</PageHeading>

      {filteredTransactions.length === 0 ? (
        <TextBlock>No transactions yet. Upload a statement to get started.</TextBlock>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-theme-sm">
          <div className="overflow-x-auto">
            <table className="w-full" aria-label="Transactions">
              <thead>
                <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
                  <th className="text-left py-4 px-6 text-gray-500 dark:text-gray-400 font-medium text-sm">Date</th>
                  <th className="text-left py-4 px-6 text-gray-500 dark:text-gray-400 font-medium text-sm">Description</th>
                  <th className="text-left py-4 px-6 text-gray-500 dark:text-gray-400 font-medium text-sm">Category</th>
                  <th className="text-right py-4 px-6 text-gray-500 dark:text-gray-400 font-medium text-sm">Amount</th>
                  <th className="text-right py-4 px-6 text-gray-500 dark:text-gray-400 font-medium text-sm">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.map((t) => (
                  <tr key={t.id} className={`border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 ${
                      Math.abs(t.amount) >= highlightThreshold ? 'bg-warning-50 dark:bg-warning-500/10' : ''
                    }`}>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-400 text-sm">{t.date}</td>
                    <td className="py-4 px-6 text-gray-900 dark:text-white text-sm">{t.description}</td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-sm text-gray-600 dark:text-gray-300">
                        {t.category}
                      </span>
                    </td>
                    <td className={`py-4 px-6 text-right font-medium text-sm ${
                      t.type === 'income' ? 'text-success-500' : 'text-error-500'
                    }`}>
                      {t.type === 'income' ? '+' : '-'}{formatAmount(t.amount)}
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => handleEdit(t)}
                          aria-label={`Edit transaction: ${t.description}`}
                          className="p-2 text-gray-400 hover:text-brand-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Pencil aria-hidden="true" className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(t.id)}
                          aria-label={`Delete transaction: ${t.description}`}
                          className="p-2 text-gray-400 hover:text-error-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                          <Trash2 aria-hidden="true" className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <TransactionModal
        transaction={editingTransaction}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSave}
      />
    </div>
  )
}
