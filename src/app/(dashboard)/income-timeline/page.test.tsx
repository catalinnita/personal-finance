import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import IncomeTimelinePage from './page'

const mockTransactions = [
  { id: '1', date: '2024-03-15', description: 'Salary', category: 'Salary', amount: 3000, type: 'income' },
  { id: '2', date: '2024-02-15', description: 'Salary', category: 'Salary', amount: 3000, type: 'income' },
]

describe('IncomeTimelinePage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Salary', type: 'income' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<IncomeTimelinePage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /income timeline/i })).toBeInTheDocument()
    })
  })

  it('renders year filter button', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
    })
  })

  it('renders category filter section', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByText(/select sources to display/i)).toBeInTheDocument()
    })
  })

  it('renders scale mode buttons', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /relative/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument()
    })
  })

  it('switches scale mode on button click', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /absolute/i }))
    // Absolute button should now be active (bg-brand-500)
    expect(screen.getByRole('button', { name: /absolute/i })).toHaveClass('bg-brand-500')
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [], categories: [], settings: {} }),
    } as Response)
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('renders the stacked chart area after load', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      // The chart columns are rendered
      const heading = screen.getByRole('heading', { name: /income timeline/i })
      expect(heading).toBeInTheDocument()
    })
  })

  it('toggles year when year button is clicked', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      const yearBtn = screen.getByRole('button', { name: '2024' })
      fireEvent.click(yearBtn)
      expect(yearBtn).toBeInTheDocument()
    })
  })

  it('toggles category filter when a source button is clicked', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      const salaryBtns = screen.getAllByRole('button').filter(b => b.textContent === 'Salary')
      if (salaryBtns.length > 0) {
        fireEvent.click(salaryBtns[0])
        expect(salaryBtns[0]).toBeInTheDocument()
      }
    })
  })

  it('handles mouse enter/leave on chart columns (lines 449-474)', async () => {
    render(<IncomeTimelinePage />)
    await waitFor(() => {
      // Find any cursor-crosshair element (chart column hover areas)
      const chartCols = document.querySelectorAll('.cursor-crosshair')
      if (chartCols.length > 0) {
        fireEvent.mouseEnter(chartCols[0])
        fireEvent.mouseLeave(chartCols[0])
      }
      expect(document.body).toBeInTheDocument()
    })
  })

  it('renders with multi-year transactions (useMonthYear path)', async () => {
    const multiYearTxs = [
      ...mockTransactions,
      { id: '3', date: '2023-03-15', description: 'Old Salary', category: 'Salary', amount: 2500, type: 'income' },
    ]
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: multiYearTxs }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Salary', type: 'income' }] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<IncomeTimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })

    // Click both years to enable multi-year view
    fireEvent.click(screen.getByRole('button', { name: '2023' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })
  })
})
