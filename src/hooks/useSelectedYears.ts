'use client'

import { useState, useEffect, useCallback } from 'react'

const STORAGE_KEY = 'personal-finance-selected-years'

export function useSelectedYears(availableYears: number[]) {
  const [selectedYears, setSelectedYears] = useState<number[]>([])
  const [initialized, setInitialized] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (Array.isArray(parsed) && parsed.length > 0) {
            // Filter to only include years that are available
            const validYears = parsed.filter((y: number) => availableYears.includes(y))
            if (validYears.length > 0) {
              setSelectedYears(validYears)
              setInitialized(true)
              return
            }
          }
        } catch (e) {
          console.error('Error parsing stored years:', e)
        }
      }
      
      // Default to current year if available, otherwise most recent
      if (availableYears.length > 0) {
        const currentYear = new Date().getFullYear()
        const defaultYears = availableYears.includes(currentYear) ? [currentYear] : [availableYears[0]]
        setSelectedYears(defaultYears)
      }
      setInitialized(true)
    }
  }, [availableYears])

  // Save to localStorage when selection changes
  useEffect(() => {
    if (initialized && selectedYears.length > 0 && typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(selectedYears))
    }
  }, [selectedYears, initialized])

  const toggleYear = useCallback((year: number) => {
    setSelectedYears(prev => {
      const newYears = prev.includes(year)
        ? prev.filter(y => y !== year)
        : [...prev, year].sort((a, b) => b - a)
      // Ensure at least one year is selected
      return newYears.length > 0 ? newYears : prev
    })
  }, [])

  return { selectedYears, setSelectedYears, toggleYear, initialized }
}
