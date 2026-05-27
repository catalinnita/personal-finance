'use client'

import { useState, useEffect } from 'react'
import { Loader2, Check } from 'lucide-react'
import { useSettingsQuery, useQueryClient, queryKeys } from '@/hooks/queries'
import { LoadingState } from '../../../components/LoadingState'
import { ActionButton } from '../../../components/ActionButton'

interface Settings {
  currency: string
  highlight_threshold: number
  moving_average_period: number
}

export default function SettingsPage() {
  const queryClient = useQueryClient()
  const { data: settingsData, isLoading } = useSettingsQuery()
  const settings = settingsData?.settings ?? null
  const currencies = settingsData?.currencies ?? []
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [thresholdInput, setThresholdInput] = useState('')
  const [movingAvgInput, setMovingAvgInput] = useState('')

  useEffect(() => {
    if (settingsData) {
      setThresholdInput(String(settingsData.settings?.highlight_threshold ?? 500))
      setMovingAvgInput(String(settingsData.settings?.moving_average_period ?? 6))
    }
  }, [settingsData])

  const saveSettings = async (updates: Partial<Settings>) => {
    setSaving(true)
    setSaved(false)

    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currency: settings?.currency || 'USD',
          highlight_threshold: settings?.highlight_threshold || 500,
          ...updates
        }),
      })

      if (response.ok) {
        queryClient.invalidateQueries({ queryKey: queryKeys.settings })
        setSaved(true)
        setTimeout(() => setSaved(false), 2000)
      }
    } catch (error) {
      console.error('Error saving settings:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCurrencyChange = async (currency: string) => {
    await saveSettings({ currency })
  }

  const handleThresholdChange = async () => {
    const threshold = parseFloat(thresholdInput)
    if (!isNaN(threshold) && threshold >= 0) {
      await saveSettings({ highlight_threshold: threshold })
    }
  }

  const handleMovingAvgChange = async () => {
    const period = parseInt(movingAvgInput)
    if (!isNaN(period) && period >= 1 && period <= 24) {
      await saveSettings({ moving_average_period: period })
    }
  }

  if (isLoading) {
    return (
      <LoadingState />
    )
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Settings</h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-theme-sm">
        <div className="space-y-6">
          {/* Currency Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Currency
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Select your preferred currency for displaying amounts
            </p>
            <div className="relative">
              <select
                value={settings?.currency || 'USD'}
                onChange={(e) => handleCurrencyChange(e.target.value)}
                disabled={saving}
                className="w-full px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 appearance-none cursor-pointer disabled:opacity-50"
              >
                {currencies.map((currency) => (
                  <option key={currency.code} value={currency.code}>
                    {currency.symbol} - {currency.name} ({currency.code})
                  </option>
                ))}
              </select>
              <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                {saving ? (
                  <Loader2 className="w-5 h-5 text-brand-500 animate-spin" />
                ) : saved ? (
                  <Check className="w-5 h-5 text-success-500" />
                ) : (
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                )}
              </div>
            </div>
          </div>

          {/* Highlight Threshold Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Highlight Threshold
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Transactions above this amount will be highlighted in the transactions list
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                min="0"
                step="50"
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onBlur={handleThresholdChange}
                onKeyDown={(e) => e.key === 'Enter' && handleThresholdChange()}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50"
                placeholder="500"
              />
              <ActionButton onClick={handleThresholdChange} disabled={saving} className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2">{saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <Check className="w-5 h-5" />
                ) : (
                  'Save'
                )}</ActionButton>
            </div>
          </div>

          {/* Moving Average Period Setting */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Moving Average Period
            </label>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              Number of months to use for calculating the moving average on timeline charts (1-24)
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                min="1"
                max="24"
                step="1"
                value={movingAvgInput}
                onChange={(e) => setMovingAvgInput(e.target.value)}
                onBlur={handleMovingAvgChange}
                onKeyDown={(e) => e.key === 'Enter' && handleMovingAvgChange()}
                disabled={saving}
                className="flex-1 px-4 py-3 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 disabled:opacity-50"
                placeholder="6"
              />
              <ActionButton onClick={handleMovingAvgChange} disabled={saving} className="px-4 py-3 bg-brand-500 hover:bg-brand-600 disabled:bg-brand-400 text-white font-medium rounded-lg transition-colors flex items-center gap-2">{saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : saved ? (
                  <Check className="w-5 h-5" />
                ) : (
                  'Save'
                )}</ActionButton>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
