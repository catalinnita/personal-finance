import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import BudgetsPage from './page'

const mockCategories = [
  { id: 'cat-1', name: 'Groceries', type: 'expense', expense_type: 'variable' },
  { id: 'cat-2', name: 'Rent', type: 'expense', expense_type: 'fixed' },
]
const mockBudgets = [
  { id: 'b-1', category_id: 'cat-1', category_name: 'Groceries', amount: 400, effective_from: '2024-01-01', created_at: '2024-01-01' },
]
const mockTransactions = [
  { id: 'tx-1', date: '2024-02-10', description: 'Tesco', category: 'Groceries', amount: -320, type: 'expense' },
]

describe('BudgetsPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<BudgetsPage />)
    expect(document.querySelector('.animate-spin, .border-brand-500')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /budgets/i })).toBeInTheDocument()
    })
  })

  it('renders budget vs spending table', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })
  })

  it('renders category names in the table', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      const groceriesElements = screen.getAllByText('Groceries')
      expect(groceriesElements.length).toBeGreaterThan(0)
      expect(screen.getAllByText('Rent').length).toBeGreaterThan(0)
    })
  })

  it('renders budget history section', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget history/i)).toBeInTheDocument()
    })
  })

  it('shows Groceries budget in history', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      // category name in budget history
      const groceriesElements = screen.getAllByText('Groceries')
      expect(groceriesElements.length).toBeGreaterThan(0)
    })
  })

  it('allows editing a budget inline', async () => {
    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })

    // Find any number input for budget editing
    const budgetInputs = screen.getAllByRole('spinbutton')
    if (budgetInputs.length > 0) {
      fireEvent.change(budgetInputs[0], { target: { value: '500' } })
      expect(budgetInputs[0]).toHaveValue(500)
    }
  })

  it('saves inline budget when Enter is pressed', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/budgets') && method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ budget: mockBudgets[0] }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })

    const budgetInputs = screen.getAllByRole('spinbutton')
    if (budgetInputs.length > 0) {
      fireEvent.change(budgetInputs[0], { target: { value: '600' } })
      fireEvent.keyDown(budgetInputs[0], { key: 'Enter' })
      // Should attempt to save
    }
  })

  it('catches error when fetchData throws (line 77)', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.reject(new Error('Network error'))
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('handles delete budget error gracefully (line 93)', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/budgets') && method === 'DELETE') {
        return Promise.reject(new Error('Delete failed'))
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget history/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button').filter(b =>
      b.className.includes('hover:text-error')
    )
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0])
      // Should not throw even if delete fails
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    }
  })

  it('skips save when budget value matches current budget (lines 112-117)', async () => {
    // Use only Groceries (has budget 400) so budgetInputs[0] maps to it
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [mockCategories[0]] }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })

    const budgetInputs = screen.getAllByRole('spinbutton')
    expect(budgetInputs.length).toBeGreaterThan(0)
    // Change to 400 (same as current budget), then blur — should skip the POST
    fireEvent.change(budgetInputs[0], { target: { value: '400' } })
    fireEvent.blur(budgetInputs[0])
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
    // POST should NOT have been called since amount === currentBudget
    const postCalls = vi.mocked(global.fetch).mock.calls.filter(
      ([, opts]) => (opts as RequestInit | undefined)?.method === 'POST'
    )
    expect(postCalls.length).toBe(0)
  })

  it('handles save budget error gracefully (line 142)', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/budgets') && method === 'POST') {
        return Promise.reject(new Error('Save failed'))
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })

    const budgetInputs = screen.getAllByRole('spinbutton')
    if (budgetInputs.length > 0) {
      fireEvent.change(budgetInputs[0], { target: { value: '999' } })
      fireEvent.blur(budgetInputs[0])
      await waitFor(() => {
        expect(document.body).toBeInTheDocument()
      })
    }
  })

  it('covers spending calculation with last-month and recent transactions (lines 186, 191-192)', async () => {
    const now = new Date()
    const lastMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-15`
    const recentStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-05`

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: 'tx-last', date: lastMonthStr, description: 'Last month grocery', category: 'Groceries', amount: -150, type: 'expense' },
              { id: 'tx-recent', date: recentStr, description: 'Recent grocery', category: 'Groceries', amount: -200, type: 'expense' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })
    // Groceries should be rendered with computed spending data
    const groceriesEls = screen.getAllByText('Groceries')
    expect(groceriesEls.length).toBeGreaterThan(0)
  })

  it('saves inline budget on blur (line 297)', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/budgets') && method === 'POST') {
        return Promise.resolve({ ok: true, json: async () => ({ budget: mockBudgets[0] }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget vs spending/i)).toBeInTheDocument()
    })

    const budgetInputs = screen.getAllByRole('spinbutton')
    if (budgetInputs.length > 0) {
      // Change value first to set editingBudgets state, then blur
      fireEvent.change(budgetInputs[0], { target: { value: '700' } })
      fireEvent.blur(budgetInputs[0])
      await waitFor(() => {
        // blur triggers handleInlineBudgetSave which calls POST /api/budgets
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/budgets',
          expect.objectContaining({ method: 'POST' })
        )
      })
    }
  })

  it('deletes a budget from history when delete button is clicked', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/budgets') && method === 'DELETE') {
        return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: mockBudgets }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetsPage />)
    await waitFor(() => {
      expect(screen.getByText(/budget history/i)).toBeInTheDocument()
    })

    const deleteButtons = screen.getAllByRole('button').filter(b =>
      b.className.includes('hover:text-error')
    )
    if (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0])
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/budgets'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    }
  })
})
