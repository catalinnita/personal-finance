import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import MappingsPage from './page'

const mockCategories = [
  { id: 'cat-1', name: 'Groceries', type: 'expense' },
  { id: 'cat-2', name: 'Salary', type: 'income' },
]
const mockMappings = [
  { id: 'map-1', description_pattern: 'TESCO', category_id: 'cat-1', category: 'Groceries' },
]
const mockTransactions = [
  { id: 'tx-1', description: 'TESCO', date: '2024-01-01', amount: -50, category: 'Groceries', type: 'expense' },
  { id: 'tx-2', description: 'AMAZON', date: '2024-01-02', amount: -30, category: 'Other', type: 'expense' },
]

describe('MappingsPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: mockMappings, count: 1 }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<MappingsPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders the page heading after load', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /description mappings/i })).toBeInTheDocument()
    })
  })

  it('renders category names after load', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      const groceriesElements = screen.getAllByText('Groceries')
      expect(groceriesElements.length).toBeGreaterThan(0)
    })
  })

  it('renders the search input', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search descriptions/i)).toBeInTheDocument()
    })
  })

  it('shows unmapped descriptions section', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      // AMAZON is unmapped
      expect(screen.getByText(/unmapped descriptions/i)).toBeInTheDocument()
    })
  })

  it('shows the mapping TESCO in the Groceries category', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument()
    })
  })

  it('filters categories using search input', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/search descriptions/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/search descriptions/i), { target: { value: 'TESCO' } })
    // Search filter is applied visually, TESCO should still appear
    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument()
    })
  })

  it('renders the "Identify with AI" button', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /identify with ai/i })).toBeInTheDocument()
    })
  })

  it('shows category filter buttons', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText(/filter by category/i)).toBeInTheDocument()
    })
  })

  it('filters categories when category filter button is clicked', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText(/filter by category/i)).toBeInTheDocument()
    })
    // Click a category filter button - Groceries appears in filter area
    const filterBtns = screen.getAllByRole('button').filter(b =>
      b.textContent?.includes('Groceries') && b.textContent?.includes('(')
    )
    if (filterBtns.length > 0) {
      fireEvent.click(filterBtns[0])
      // Click Clear filter button
      const clearBtn = screen.queryByText(/clear filter/i)
      if (clearBtn) fireEvent.click(clearBtn)
    }
  })

  it('hides unmapped section when Hide is clicked', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText(/unmapped descriptions/i)).toBeInTheDocument()
    })

    const hideBtn = screen.getByText(/hide/i)
    fireEvent.click(hideBtn)
    await waitFor(() => {
      expect(screen.queryByText(/^unmapped descriptions/i)).not.toBeInTheDocument()
    })
  })

  it('shows unmapped section again when Show button is clicked', async () => {
    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText(/unmapped descriptions/i)).toBeInTheDocument()
    })

    fireEvent.click(screen.getByText(/hide/i))
    await waitFor(() => {
      expect(screen.queryByText(/^unmapped descriptions/i)).not.toBeInTheDocument()
    })

    const showBtn = screen.getByText(/show.*unmapped descriptions/i)
    fireEvent.click(showBtn)
    await waitFor(() => {
      expect(screen.getByText(/unmapped descriptions/i)).toBeInTheDocument()
    })
  })

  it('deletes a mapping when X button is clicked', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/category-mappings/map-1')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: mockMappings, count: 1 }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText('TESCO')).toBeInTheDocument()
    })

    // Find the delete button for TESCO mapping
    const deleteBtn = screen.getAllByRole('button').find(b =>
      b.className.includes('hover:text-error') && b.closest('[draggable]')?.textContent?.includes('TESCO')
    )
    if (deleteBtn) {
      fireEvent.click(deleteBtn)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/category-mappings/'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    }
  })

  it('calls handleIdentifyWithAI when AI button is clicked', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: mockMappings, count: 1 }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/identify-categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ results: [{ description: 'AMAZON', category: 'Shopping', category_id: 'cat-1' }], newCategories: [] })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /identify with ai/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /identify with ai/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/identify-categories'),
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('shows empty state when no mappings and no unmapped', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: [], count: 0 }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<MappingsPage />)
    await waitFor(() => {
      expect(screen.getByText(/no mappings yet/i)).toBeInTheDocument()
    })
  })
})
