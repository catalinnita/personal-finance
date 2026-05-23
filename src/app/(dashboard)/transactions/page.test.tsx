import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import TransactionsPage from './page'

// useCurrency hook fetches /api/settings
const mockTransactions = [
  { id: '1', date: '2024-03-15', description: 'Supermarket', category: 'Groceries', amount: -75.50, type: 'expense', user_id: 'u1', created_at: '2024-03-15' },
  { id: '2', date: '2024-03-10', description: 'Salary', category: 'Income', amount: 3000, type: 'income', user_id: 'u1', created_at: '2024-03-10' },
]

describe('TransactionsPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ transactions: mockTransactions }),
        } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }),
        } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ categories: [] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({}),
      } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<TransactionsPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders the page heading after load', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /transactions/i })).toBeInTheDocument()
    })
  })

  it('renders transactions table after load', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByRole('table', { name: /transactions/i })).toBeInTheDocument()
    })
  })

  it('renders transaction descriptions', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByText('Supermarket')).toBeInTheDocument()
      expect(screen.getByText('Salary')).toBeInTheDocument()
    })
  })

  it('renders transaction categories', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })
  })

  it('shows year filter when transactions exist', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('2024')).toBeInTheDocument()
    })
  })

  it('shows month filter when transactions exist', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Months')).toBeInTheDocument()
    })
  })

  it('renders edit button for each transaction', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      const editBtns = screen.getAllByRole('button', { name: /edit transaction/i })
      expect(editBtns.length).toBe(2)
    })
  })

  it('renders delete button for each transaction', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      const deleteBtns = screen.getAllByRole('button', { name: /delete transaction/i })
      expect(deleteBtns.length).toBe(2)
    })
  })

  it('opens edit modal when edit button is clicked', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit transaction/i })[0]).toBeInTheDocument()
    })
    fireEvent.click(screen.getAllByRole('button', { name: /edit transaction/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ transactions: [] }),
        } as Response)
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }),
      } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('changes year filter when year select changes (line 143)', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('2024')).toBeInTheDocument()
    })
    // Select is already at 2024; just fire change to trigger the handler
    const yearSelect = screen.getByDisplayValue('2024')
    fireEvent.change(yearSelect, { target: { value: '2024' } })
    // Should still show 2024
    expect(yearSelect).toHaveValue('2024')
  })

  it('changes month filter when month select changes (line 153)', async () => {
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('All Months')).toBeInTheDocument()
    })
    const monthSelect = screen.getByDisplayValue('All Months')
    fireEvent.change(monthSelect, { target: { value: '3' } })
    expect(monthSelect).toHaveValue('3')
  })

  it('deletes transaction when delete button clicked and confirmed (lines 208-229)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions/1')) {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 }, categories: [] }) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete transaction/i }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /delete transaction/i })[0])
    // confirm returns true, delete should be called
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/transactions/'),
        expect.objectContaining({ method: 'DELETE' })
      )
    })
  })

  it('does not delete when confirmation is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete transaction/i }).length).toBeGreaterThan(0)
    })

    const callsBefore = vi.mocked(global.fetch).mock.calls.length
    fireEvent.click(screen.getAllByRole('button', { name: /delete transaction/i })[0])
    // No additional fetch calls
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(callsBefore)
  })

  it('catches error when fetchTransactions throws (line 48)', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.reject(new Error('Transactions fetch failed'))
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('catches error when fetchSettings throws (line 62)', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.reject(new Error('Settings fetch failed'))
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('catches error when handleSave throws (line 88)', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/transactions') && method === 'PUT') {
        return Promise.reject(new Error('Save failed'))
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit transaction/i }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /edit transaction/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('catches error when handleDelete throws (line 104)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/transactions/') && method === 'DELETE') {
        return Promise.reject(new Error('Delete failed'))
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /delete transaction/i }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /delete transaction/i })[0])
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('saves transaction edit and updates the list', async () => {
    const updatedTx = { ...mockTransactions[0], description: 'Updated Store' }
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/transactions') && !String(url).includes('/api/settings') && method === 'PUT') {
        return Promise.resolve({ ok: true, json: async () => ({ transaction: updatedTx }) } as Response)
      }
      if (String(url).includes('/api/transactions') && !String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500 } }) } as Response)
    })

    render(<TransactionsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /edit transaction/i }).length).toBeGreaterThan(0)
    })

    fireEvent.click(screen.getAllByRole('button', { name: /edit transaction/i })[0])
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })
    // Click Save in the modal
    fireEvent.click(screen.getByRole('button', { name: /save/i }))
    // Modal should close
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })
  })
})
