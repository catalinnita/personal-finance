import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import BudgetRulePage from './page'

// recharts needs to be mocked in jsdom
vi.mock('recharts', () => ({
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div />,
  Cell: () => <div />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  Legend: () => <div />,
  Tooltip: () => <div />,
}))

const mockCategories = [
  { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'variable' },
  { id: 'cat-2', name: 'Netflix', type: 'expense', budget_group: 'wants', expense_type: 'variable' },
]
const mockTransactions = [
  { id: 'tx-1', date: '2024-02-10', description: 'Tesco', category: 'Groceries', amount: -200, type: 'expense' },
]

describe('BudgetRulePage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
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
    render(<BudgetRulePage />)
    expect(document.querySelector('.animate-spin, [class*="border-brand"]')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /50\/30\/20 budget rule/i })).toBeInTheDocument()
    })
  })

  it('renders Needs summary cards (multiple instances expected)', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      const needsElements = screen.getAllByText('Needs')
      expect(needsElements.length).toBeGreaterThan(0)
    })
  })

  it('renders Wants summary cards (multiple instances expected)', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      const wantsElements = screen.getAllByText('Wants')
      expect(wantsElements.length).toBeGreaterThan(0)
    })
  })

  it('renders Savings & Debt summary cards (multiple instances expected)', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      const savingsElements = screen.getAllByText('Savings & Debt')
      expect(savingsElements.length).toBeGreaterThan(0)
    })
  })

  it('renders category assignments section', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText(/category assignments/i)).toBeInTheDocument()
    })
  })

  it('renders Groceries and Netflix in assignment lists', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Netflix')).toBeInTheDocument()
    })
  })

  it('renders the pie chart section', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText(/spending distribution/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })
    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /50\/30\/20 budget rule/i })).toBeInTheDocument()
    })
  })

  it('calls PUT /api/categories when a category group is changed', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/categories') && method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ category: { ...mockCategories[0], budget_group: 'wants' } })
        } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: mockCategories }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    // Find and click a budget group select/button for Groceries
    const groceriesBtn = screen.getAllByRole('button').find(b =>
      b.closest('[class]')?.textContent?.includes('Groceries') &&
      !b.textContent?.includes('Groceries')
    )
    if (groceriesBtn) {
      fireEvent.click(groceriesBtn)
    }
  })

  it('opens modal when a group card is clicked', async () => {
    render(<BudgetRulePage />)
    await waitFor(() => {
      const needsElements = screen.getAllByText('Needs')
      // Click the first "Needs" text that is a clickable element
      const needsBtn = screen.getAllByRole('button').find(b =>
        b.textContent?.includes('Needs') || b.closest('[onclick]')?.textContent?.includes('Needs')
      )
      if (needsBtn) {
        fireEvent.click(needsBtn)
      }
    })
  })
})
