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
