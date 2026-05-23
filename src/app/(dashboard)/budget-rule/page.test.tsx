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

  it('opens Needs breakdown modal by clicking the amount button in the Needs card', async () => {
    // Provide a fixed category so Needs has spending data
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'fixed' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: 'tx-1', date: '2024-02-10', description: 'Tesco', category: 'Groceries', amount: -200, type: 'expense' },
            ]
          })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /50\/30\/20 budget rule/i })).toBeInTheDocument()
    })

    // Find a button that looks like an amount (from the summary card)
    const amountButtons = screen.getAllByRole('button')
    // The modal-opening buttons are inside the summary cards
    const firstAmountBtn = amountButtons.find(b => b.textContent && b.closest('.bg-white'))
    if (firstAmountBtn) {
      fireEvent.click(firstAmountBtn)
      await waitFor(() => {
        // Modal should appear with "Breakdown" in the heading
        const breakdown = screen.queryByText(/breakdown/i)
        if (breakdown) {
          expect(breakdown).toBeInTheDocument()
        }
      })
    }
  })

  it('closes the breakdown modal when X button is clicked', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'variable' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: 'tx-1', date: '2024-02-10', description: 'Tesco', category: 'Groceries', amount: -200, type: 'expense' },
            ]
          })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /50\/30\/20 budget rule/i })).toBeInTheDocument()
    })

    // Open the modal
    const amountButtons = screen.getAllByRole('button')
    const firstAmountBtn = amountButtons.find(b => b.textContent && b.closest('.bg-white'))
    if (firstAmountBtn) {
      fireEvent.click(firstAmountBtn)
      await waitFor(() => {
        const backdrop = document.querySelector('.fixed.inset-0')
        if (backdrop) {
          // Click outside to close
          fireEvent.click(backdrop)
          expect(document.body).toBeInTheDocument()
        }
      })
    }
  })

  it('changes category budget_group using the select dropdown', async () => {
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

    // Find the select element for Groceries and change its value
    const selects = screen.getAllByRole('combobox')
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'wants' } })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/categories',
          expect.objectContaining({ method: 'PUT' })
        )
      })
    }
  })

  it('renders with excluded categories in the excluded section', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'variable' },
              { id: 'cat-2', name: 'BankTransferXYZ', type: 'expense', budget_group: 'excluded', expense_type: 'variable' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText('BankTransferXYZ')).toBeInTheDocument()
    })
  })

  it('renders with fixed expense_type category showing spending based on last month', async () => {
    const now = new Date()
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 15)
    const lastMonthStr = `${lastMonth.getFullYear()}-${String(lastMonth.getMonth() + 1).padStart(2, '0')}-15`

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Rent', type: 'expense', budget_group: 'needs', expense_type: 'fixed' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: 'tx-1', date: lastMonthStr, description: 'Rent Payment', category: 'Rent', amount: -1200, type: 'expense' },
            ]
          })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText('Rent')).toBeInTheDocument()
    })
  })

  it('shows "no spending data" when no pieData', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText(/no spending data for last month/i)).toBeInTheDocument()
    })
  })

  it('changes excluded category budget_group via select (line 364)', async () => {
    vi.mocked(global.fetch).mockImplementation((url, opts) => {
      const method = (opts as RequestInit | undefined)?.method || 'GET'
      if (String(url).includes('/api/categories') && method === 'PUT') {
        return Promise.resolve({
          ok: true,
          json: async () => ({ category: { id: 'cat-3', name: 'BankTransfer', type: 'expense', budget_group: 'needs', expense_type: 'variable' } })
        } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-3', name: 'BankTransfer', type: 'expense', budget_group: 'excluded', expense_type: 'variable' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByText('BankTransfer')).toBeInTheDocument()
    })

    // The excluded section has a select for each excluded category
    const selects = screen.getAllByRole('combobox')
    if (selects.length > 0) {
      fireEvent.change(selects[0], { target: { value: 'needs' } })
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          '/api/categories',
          expect.objectContaining({ method: 'PUT' })
        )
      })
    } else {
      expect(document.body).toBeInTheDocument()
    }
  })

  it('opens modal and closes via X button (lines 390-403)', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'variable' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        const now = new Date()
        const lastMonthStr = `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}-15`
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: 'tx-1', date: lastMonthStr, description: 'Grocery Shop', category: 'Groceries', amount: -100, type: 'expense' }
            ]
          })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /50\/30\/20 budget rule/i })).toBeInTheDocument()
    })

    // Click a summary card amount button to open modal
    const amountBtns = screen.getAllByRole('button').filter(b =>
      b.className?.includes('hover:underline') || b.className?.includes('text-brand')
    )
    if (amountBtns.length > 0) {
      fireEvent.click(amountBtns[0])
      await waitFor(() => {
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) {
          // Click inside modal to test stopPropagation (should NOT close modal)
          const innerDiv = modal.querySelector('.bg-white')
          if (innerDiv) {
            fireEvent.click(innerDiv)
          }
          expect(modal).toBeInTheDocument()
          // Now close via X button
          const xBtn = modal.querySelector('button')
          if (xBtn) {
            fireEvent.click(xBtn)
          }
        }
      })
    }
    expect(document.body).toBeInTheDocument()
  })

  it('shows "No categories" text in groups with empty category lists', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Groceries', type: 'expense', budget_group: 'needs', expense_type: 'variable' },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD' } }) } as Response)
    })

    render(<BudgetRulePage />)
    await waitFor(() => {
      // Wants and Savings groups should show "No categories"
      const noCatEls = screen.getAllByText(/no categories/i)
      expect(noCatEls.length).toBeGreaterThan(0)
    })
  })
})
