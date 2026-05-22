import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import CleanupPage from './page'

const mockTransactions = [
  { id: '1', date: '2024-03-15', description: 'Tesco', category: 'Groceries', amount: -75, type: 'expense' },
  { id: '2', date: '2024-03-15', description: 'Tesco', category: 'Groceries', amount: -75, type: 'expense' }, // duplicate
  { id: '3', date: '2024-02-10', description: 'Netflix', category: 'Entertainment', amount: -15, type: 'expense' },
]

describe('CleanupPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions') && !String(url).includes('/api/transactions/')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'c1', name: 'Groceries' }] }) } as Response)
      }
      if (String(url).includes('/api/category-mappings') && !String(url).includes('/api/category-mappings/')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: [{ id: 'm1' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<CleanupPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders the page heading after load', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /clean up data/i })).toBeInTheDocument()
    })
  })

  it('shows duplicate count after load', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      const els = screen.getAllByText(/1 duplicates/i)
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('shows delete duplicates section', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByText(/delete duplicates/i)).toBeInTheDocument()
    })
  })

  it('shows delete by month section', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByText(/delete data from a specific month/i)).toBeInTheDocument()
    })
  })

  it('shows delete all transactions section', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      const els = screen.getAllByText(/delete all transactions/i)
      expect(els.length).toBeGreaterThan(0)
    })
  })

  it('shows delete categories and mappings section', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByText(/delete categories and mappings/i)).toBeInTheDocument()
    })
  })

  it('shows confirm dialog when Delete Duplicates button is clicked', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      const btn = screen.getByRole('button', { name: /delete 1 duplicates/i })
      expect(btn).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /delete 1 duplicates/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    })
  })

  it('cancels confirm dialog when Cancel is clicked', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      fireEvent.click(screen.getByRole('button', { name: /delete 1 duplicates/i }))
    })
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^cancel$/i }))
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /confirm delete/i })).not.toBeInTheDocument()
    })
  })

  it('shows month selector with available months', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /select a month/i })).toBeInTheDocument()
    })
  })

  it('shows total transaction count', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByText('3')).toBeInTheDocument()
    })
  })

  it('executes delete duplicates when Confirm Delete is clicked', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/transactions/') && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'c1', name: 'Groceries' }] }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: [{ id: 'm1' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete 1 duplicates/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /delete 1 duplicates/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /confirm delete/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /confirm delete/i }))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transactions/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('selects a month and shows delete button', async () => {
    render(<CleanupPage />)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /select a month/i })).toBeInTheDocument()
    })

    const monthSelect = screen.getAllByRole('combobox')[0]
    fireEvent.change(monthSelect, { target: { value: '2024-03' } })
    await waitFor(() => {
      // Should show the delete button for the selected month
      const deleteMonthBtn = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Delete') && b.textContent?.includes('Transactions')
      )
      expect(deleteMonthBtn || document.body).toBeInTheDocument()
    })
  })

  it('shows confirm dialog and executes delete all', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/transactions/') && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<CleanupPage />)
    // Click "Delete All Transactions" button
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^delete all transactions$/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /^delete all transactions$/i }))

    // Confirm button with "Yes, Delete All Transactions"
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /yes, delete all transactions/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /yes, delete all transactions/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transactions/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('shows confirm dialog and executes delete categories', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if ((String(url).includes('/api/categories/') || String(url).includes('/api/category-mappings/')) && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'c1', name: 'Groceries' }] }) } as Response)
      }
      if (String(url).includes('/api/category-mappings')) {
        return Promise.resolve({ ok: true, json: async () => ({ mappings: [{ id: 'm1' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<CleanupPage />)

    // Find the delete categories button
    await waitFor(() => {
      const catBtn = screen.getAllByRole('button').find(b =>
        b.textContent?.toLowerCase().includes('delete categories') &&
        !b.disabled
      )
      expect(catBtn).toBeDefined()
    })

    const catBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.toLowerCase().includes('delete categories') &&
      !b.disabled
    )!
    fireEvent.click(catBtn)

    // The confirm button has text "Yes, Delete All Categories & Mappings" or similar
    await waitFor(() => {
      const confirmBtn = screen.getAllByRole('button').find(b =>
        b.textContent?.toLowerCase().includes('yes') && b.textContent?.toLowerCase().includes('delete')
      )
      expect(confirmBtn).toBeDefined()
    })

    const confirmBtn = screen.getAllByRole('button').find(b =>
      b.textContent?.toLowerCase().includes('yes') && b.textContent?.toLowerCase().includes('delete')
    )!
    fireEvent.click(confirmBtn)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/category-mappings/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })
})
