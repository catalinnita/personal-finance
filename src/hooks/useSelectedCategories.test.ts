import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act, waitFor } from '@testing-library/react'
import { useSelectedCategories } from './useSelectedCategories'

describe('useSelectedCategories', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  const categories = ['Groceries', 'Dining', 'Travel']

  it('defaults to all categories when nothing is stored', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedCategories).toEqual(categories)
  })

  it('loads valid categories from localStorage on mount', async () => {
    localStorage.setItem('selected-categories', JSON.stringify(['Groceries', 'Dining']))
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedCategories).toEqual(['Groceries', 'Dining'])
  })

  it('filters out stale categories that no longer exist in availableCategories', async () => {
    localStorage.setItem('selected-categories', JSON.stringify(['Groceries', 'OldCategory']))
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedCategories).not.toContain('OldCategory')
    expect(result.current.selectedCategories).toContain('Groceries')
  })

  it('toggleCategory adds a deselected category', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    // Deselect all first
    act(() => result.current.selectNone())
    act(() => result.current.toggleCategory('Groceries'))
    expect(result.current.selectedCategories).toContain('Groceries')
  })

  it('toggleCategory removes a selected category', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    act(() => result.current.toggleCategory('Groceries'))
    expect(result.current.selectedCategories).not.toContain('Groceries')
  })

  it('selectAll restores all available categories', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    act(() => result.current.selectNone())
    act(() => result.current.selectAll())
    expect(result.current.selectedCategories).toEqual(categories)
  })

  it('selectNone clears all selections', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    act(() => result.current.selectNone())
    expect(result.current.selectedCategories).toEqual([])
  })

  it('persists selection to localStorage', async () => {
    const { result } = renderHook(() => useSelectedCategories(categories))
    await waitFor(() => expect(result.current.initialized).toBe(true))

    act(() => result.current.toggleCategory('Travel'))
    await waitFor(() => {
      const stored = JSON.parse(localStorage.getItem('selected-categories') || '[]')
      expect(stored).not.toContain('Travel')
    })
  })

  it('automatically adds new categories when availableCategories grows (line 47)', async () => {
    const initialCategories = ['Groceries', 'Dining']
    const { result, rerender } = renderHook(
      ({ cats }: { cats: string[] }) => useSelectedCategories(cats),
      { initialProps: { cats: initialCategories } }
    )
    await waitFor(() => expect(result.current.initialized).toBe(true))
    expect(result.current.selectedCategories).toEqual(initialCategories)

    // Now re-render with a new category added
    rerender({ cats: ['Groceries', 'Dining', 'Travel'] })

    await waitFor(() => {
      expect(result.current.selectedCategories).toContain('Travel')
    })
  })
})
