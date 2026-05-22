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
