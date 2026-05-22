import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSelectedYears } from './useSelectedYears'

describe('useSelectedYears', () => {
  const CURRENT_YEAR = new Date().getFullYear()
  const years = [CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2]

  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('defaults to the current year when it is in the available list', async () => {
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedYears).toEqual([CURRENT_YEAR])
  })

  it('defaults to the most recent year when the current year is not available', async () => {
    const pastYears = [CURRENT_YEAR - 1, CURRENT_YEAR - 2]
    const { result } = renderHook(() => useSelectedYears(pastYears))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedYears).toEqual([CURRENT_YEAR - 1])
  })

  it('loads stored years from localStorage on mount', async () => {
    localStorage.setItem('personal-finance-selected-years', JSON.stringify([CURRENT_YEAR - 1]))
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedYears).toContain(CURRENT_YEAR - 1)
  })

  it('filters out stored years that are no longer available', async () => {
    localStorage.setItem('personal-finance-selected-years', JSON.stringify([1990]))
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    // 1990 is not in years[] so it should default to current year
    expect(result.current.selectedYears).not.toContain(1990)
  })

  it('toggleYear adds a deselected year', async () => {
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    // First add the previous year
    act(() => result.current.toggleYear(CURRENT_YEAR - 1))
    expect(result.current.selectedYears).toContain(CURRENT_YEAR - 1)
  })

  it('toggleYear removes a selected year but keeps at least one selected', async () => {
    // Start with only the current year selected (default)
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedYears).toHaveLength(1)

    // Attempting to deselect the only selected year should have no effect
    act(() => result.current.toggleYear(CURRENT_YEAR))
    expect(result.current.selectedYears).toHaveLength(1)
    expect(result.current.selectedYears).toContain(CURRENT_YEAR)
  })

  it('persists selected years to localStorage', async () => {
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    act(() => result.current.toggleYear(CURRENT_YEAR - 1))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('personal-finance-selected-years') || '[]')
      expect(stored).toContain(CURRENT_YEAR - 1)
    })
  })

  it('returns empty list and not initialized when availableYears is empty', () => {
    const { result } = renderHook(() => useSelectedYears([]))
    expect(result.current.initialized).toBe(false)
    expect(result.current.selectedYears).toEqual([])
  })

  it('defaults to current year when stored value is invalid JSON (line 36)', async () => {
    localStorage.setItem('personal-finance-selected-years', 'not-valid-json')
    const { result } = renderHook(() => useSelectedYears(years))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    // Falls back to default (current year)
    expect(result.current.selectedYears).toEqual([CURRENT_YEAR])
  })
})
