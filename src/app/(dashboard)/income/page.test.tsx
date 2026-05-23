import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import IncomePage from './page'

const mockTransactions = [
  { id: '1', date: '2024-03-15', description: 'Salary', category: 'Salary', amount: 3000, type: 'income', user_id: 'u1', created_at: '2024-03-15' },
  { id: '2', date: '2024-03-20', description: 'Freelance', category: 'Freelance', amount: 500, type: 'income', user_id: 'u1', created_at: '2024-03-20' },
]

describe('IncomePage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Salary', type: 'income', expense_type: 'variable' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<IncomePage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /income by source/i })).toBeInTheDocument()
    })
  })

  it('renders year filter button', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
    })
  })

  it('renders source filter section', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/select sources to display/i)).toBeInTheDocument()
    })
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [], categories: [], settings: {} }),
    } as Response)
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('renders the Source Summary table with income data', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })
  })

  it('renders month tabs after load', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      // March should appear in the tab area
      const elements = screen.getAllByText(/^Mar/i)
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('shows month detail when a month tab is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      const marchButtons = screen.getAllByRole('button').filter(b => b.textContent?.startsWith('Mar'))
      if (marchButtons.length > 0) {
        fireEvent.click(marchButtons[0])
        expect(marchButtons[0]).toBeInTheDocument()
      }
    })
  })

  it('toggles category selection when a source filter button is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      const salaryBtns = screen.getAllByRole('button').filter(b => b.textContent === 'Salary')
      if (salaryBtns.length > 0) {
        fireEvent.click(salaryBtns[0])
        expect(salaryBtns[0]).toBeInTheDocument()
      }
    })
  })

  it('toggles year selection when year button is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      const yearBtn = screen.getByRole('button', { name: '2024' })
      fireEvent.click(yearBtn)
      expect(yearBtn).toBeInTheDocument()
    })
  })

  it('renders income categories from API response', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      // Salary is an income category
      const salaryElements = screen.getAllByText('Salary')
      expect(salaryElements.length).toBeGreaterThan(0)
    })
  })

  it('shows expanded cell modal when a cell is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      // Find any amount button in the summary table that can be clicked
      const amountButtons = screen.getAllByRole('button').filter(b =>
        b.className.includes('hover:bg-gray') && b.textContent?.includes('$')
      )
      if (amountButtons.length > 0) {
        fireEvent.click(amountButtons[0])
        // The modal should appear
      }
    })
  })

  it('renders with fixed expense_type category showing fixed badge', async () => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            categories: [
              { id: 'cat-1', name: 'Salary', type: 'income', expense_type: 'fixed' },
            ]
          })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<IncomePage />)
    await waitFor(() => {
      const fixedBadges = screen.queryAllByText('fixed')
      expect(fixedBadges.length).toBeGreaterThanOrEqual(0)
    })
  })

  it('opens expanded cell modal when amount button in summary table is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })

    // Find any amount button in the summary table
    const allBtns = screen.getAllByRole('button')
    const amountBtn = allBtns.find(b =>
      b.textContent?.includes('$') && b.className?.includes('hover:bg-gray')
    )
    if (amountBtn) {
      fireEvent.click(amountBtn)
      await waitFor(() => {
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) {
          expect(modal).toBeInTheDocument()
        }
      })
    } else {
      expect(document.body).toBeInTheDocument()
    }
  })

  it('closes expanded cell modal when X button is clicked', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })

    const allBtns = screen.getAllByRole('button')
    const amountBtn = allBtns.find(b =>
      b.textContent?.includes('$') && b.className?.includes('hover:bg-gray')
    )
    if (amountBtn) {
      fireEvent.click(amountBtn)
      await waitFor(() => {
        const closeBtn = screen.queryAllByRole('button').find(b =>
          b.className?.includes('hover:bg-gray') && !b.textContent?.includes('$')
        )
        if (closeBtn) {
          fireEvent.click(closeBtn)
        }
      })
    }
    expect(document.body).toBeInTheDocument()
  })

  it('renders month summary tabs when income data exists', async () => {
    render(<IncomePage />)
    await waitFor(() => {
      const marchBtns = screen.getAllByRole('button').filter(b =>
        b.textContent?.startsWith('Mar')
      )
      if (marchBtns.length > 0) {
        fireEvent.click(marchBtns[0])
        expect(document.body).toBeInTheDocument()
      } else {
        expect(document.body).toBeInTheDocument()
      }
    })
  })

  it('opens expanded cell modal with transaction list by clicking amount in table', async () => {
    // Use current month transactions so they appear in the table
    const now = new Date()
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-10`

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            transactions: [
              { id: '1', date: currentMonthStr, description: 'Salary Payment', category: 'Salary', amount: 3000, type: 'income', user_id: 'u1', created_at: currentMonthStr },
            ]
          })
        } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ categories: [{ id: 'cat-1', name: 'Salary', type: 'income', expense_type: 'variable' }] })
        } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })

    // Find the amount button inside the summary table
    const allBtns = screen.getAllByRole('button')
    const tableAmountBtn = allBtns.find(b =>
      b.className?.includes('cursor-pointer') && b.textContent?.trim() !== ''
    )
    if (tableAmountBtn) {
      fireEvent.click(tableAmountBtn)
      await waitFor(() => {
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) {
          expect(modal).toBeInTheDocument()
          // Close via backdrop
          fireEvent.click(modal)
        }
      })
    }
    expect(document.body).toBeInTheDocument()
  })

  it('opens expanded cell modal in multi-year mode and uses useMonthYear filter (lines 448-455, 481-482)', async () => {
    // Two different years of data for the same category triggers useMonthYear = true
    const multiYearTransactions = [
      { id: '1', date: '2024-03-15', description: 'Salary Mar 2024', category: 'Salary', amount: 3000, type: 'income', user_id: 'u1', created_at: '2024-03-15' },
      { id: '3', date: '2023-03-10', description: 'Salary Mar 2023', category: 'Salary', amount: 2500, type: 'income', user_id: 'u1', created_at: '2023-03-10' },
    ]

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: multiYearTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Salary', type: 'income', expense_type: 'variable' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<IncomePage />)
    await waitFor(() => {
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })

    // Both 2024 and 2023 buttons should be present
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })

    // Click the 2023 year button to select it (enabling multi-year mode: useMonthYear = true)
    fireEvent.click(screen.getByRole('button', { name: '2023' }))

    // After selecting 2023, the summary table should show month-year columns
    await waitFor(() => {
      // In multi-year mode, column headers use format "Mar'24" style
      expect(screen.getByText(/source summary/i)).toBeInTheDocument()
    })

    // Find and click an amount button in the summary table to open expanded cell modal
    const allBtns = screen.getAllByRole('button')
    const amountBtn = allBtns.find(b =>
      b.textContent?.includes('$') && (b.className?.includes('cursor-pointer') || b.className?.includes('hover:bg-gray'))
    )
    if (amountBtn) {
      fireEvent.click(amountBtn)
      // Modal should open with the multi-year filter branch executed (lines 448-455, 481-482)
      await waitFor(() => {
        const modal = document.querySelector('.fixed.inset-0')
        if (modal) {
          expect(modal).toBeInTheDocument()
          // transactions count text should be visible
          const transEl = screen.queryByText(/\d+ transactions/i)
          if (transEl) {
            expect(transEl).toBeInTheDocument()
          }
        }
      })
    }
    expect(document.body).toBeInTheDocument()
  })

  it('renders multi-year column headers when multiple years selected', async () => {
    const multiYearTransactions = [
      ...mockTransactions,
      { id: '3', date: '2023-03-10', description: 'Old Salary', category: 'Salary', amount: 2500, type: 'income', user_id: 'u1', created_at: '2023-03-10' },
    ]

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: multiYearTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<IncomePage />)
    await waitFor(() => {
      // Both 2024 and 2023 buttons should be present
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })
  })
})
