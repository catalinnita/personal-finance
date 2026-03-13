'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'selected-categories'

export function useSelectedCategories(availableCategories: string[]) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialized) {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Filter to only include categories that still exist
          const validCategories = parsed.filter((c: string) => availableCategories.includes(c))
          if (validCategories.length > 0) {
            setSelectedCategories(validCategories)
            setInitialized(true)
            return
          }
        } catch {
          // ignore parse errors
        }
      }
      // Default to all categories if nothing saved or no valid saved categories
      if (availableCategories.length > 0) {
        setSelectedCategories(availableCategories)
        setInitialized(true)
      }
    }
  }, [availableCategories, initialized])

  // Save to localStorage when selection changes
  useEffect(() => {
    if (initialized && selectedCategories.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedCategories))
    }
  }, [selectedCategories, initialized])

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category)
        ? prev.filter(c => c !== category)
        : [...prev, category]
    )
  }, [])

  const selectAll = useCallback(() => {
    setSelectedCategories(availableCategories)
  }, [availableCategories])

  const selectNone = useCallback(() => {
    setSelectedCategories([])
  }, [])

  return {
    selectedCategories,
    setSelectedCategories,
    toggleCategory,
    selectAll,
    selectNone,
    initialized
  }
}
