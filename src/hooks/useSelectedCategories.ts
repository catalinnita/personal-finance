'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { STORAGE_KEY_SELECTED_CATEGORIES } from '@/config/constants'

const DEFAULT_STORAGE_KEY = STORAGE_KEY_SELECTED_CATEGORIES

export function useSelectedCategories(availableCategories: string[], storageKey: string = DEFAULT_STORAGE_KEY) {
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [initialized, setInitialized] = useState(false)
  const prevAvailableRef = useRef<string[]>([])

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialized && availableCategories.length > 0) {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        try {
          const parsed = JSON.parse(saved)
          // Filter to only include categories that still exist
          const validCategories = parsed.filter((c: string) => availableCategories.includes(c))
          if (validCategories.length > 0) {
            setSelectedCategories(validCategories)
            setInitialized(true)
            prevAvailableRef.current = availableCategories
            return
          }
        } catch {
          // ignore parse errors
        }
      }
      // Default to all categories if nothing saved or no valid saved categories
      setSelectedCategories(availableCategories)
      setInitialized(true)
      prevAvailableRef.current = availableCategories
    }
  }, [availableCategories, initialized])

  // Add new categories automatically when they appear
  useEffect(() => {
    if (initialized && availableCategories.length > 0) {
      const prevAvailable = prevAvailableRef.current
      const newCategories = availableCategories.filter(c => !prevAvailable.includes(c))
      
      if (newCategories.length > 0) {
        // Add new categories to selection
        setSelectedCategories(prev => [...prev, ...newCategories.filter(c => !prev.includes(c))])
      }
      
      prevAvailableRef.current = availableCategories
    }
  }, [availableCategories, initialized])

  // Save to localStorage when selection changes
  useEffect(() => {
    if (initialized && selectedCategories.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(selectedCategories))
    }
  }, [selectedCategories, initialized, storageKey])

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
