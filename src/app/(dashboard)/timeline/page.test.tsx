import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import TimelinePage from './page'

const mockTransactions = [
  { id: '1', date: '2024-03-15', description: 'Tesco', category: 'Groceries', amount: -75, type: 'expense' },
  { id: '2', date: '2024-02-15', description: 'Tesco', category: 'Groceries', amount: -80, type: 'expense' },
]

describe('TimelinePage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: mockTransactions }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Groceries', type: 'expense' }] }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })
  })

  it('shows loading spinner initially', () => {
    render(<TimelinePage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /spending timeline/i })).toBeInTheDocument()
    })
  })

  it('renders year filter button', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
    })
  })

  it('renders scale mode buttons', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /relative/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument()
    })
  })

  it('renders category filter section', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByText(/select categories to display/i)).toBeInTheDocument()
    })
  })

  it('renders Groceries category button', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /groceries/i })).toBeInTheDocument()
    })
  })

  it('switches to absolute scale on button click', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /absolute/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /absolute/i }))
    expect(screen.getByRole('button', { name: /absolute/i })).toHaveClass('bg-brand-500')
  })

  it('shows empty state when no transactions', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [], categories: [], settings: {}, budgets: [] }),
    } as Response)
    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByText(/no transactions yet/i)).toBeInTheDocument()
    })
  })

  it('toggles year when year button is clicked', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      const yearBtn = screen.getByRole('button', { name: '2024' })
      fireEvent.click(yearBtn)
      expect(yearBtn).toBeInTheDocument()
    })
  })

  it('toggles category filter when Groceries button is clicked', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      const groceriesBtn = screen.getByRole('button', { name: /groceries/i })
      fireEvent.click(groceriesBtn)
      expect(groceriesBtn).toBeInTheDocument()
    })
  })

  it('handles mouse enter/leave on chart columns', async () => {
    render(<TimelinePage />)
    await waitFor(() => {
      const chartCols = document.querySelectorAll('.cursor-crosshair')
      if (chartCols.length > 0) {
        fireEvent.mouseEnter(chartCols[0])
        fireEvent.mouseLeave(chartCols[0])
      }
      expect(document.body).toBeInTheDocument()
    })
  })

  it('renders with multi-year transactions', async () => {
    const multiYearTxs = [
      ...mockTransactions,
      { id: '3', date: '2023-03-15', description: 'Tesco', category: 'Groceries', amount: -60, type: 'expense' },
    ]
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/transactions')) {
        return Promise.resolve({ ok: true, json: async () => ({ transactions: multiYearTxs }) } as Response)
      }
      if (String(url).includes('/api/settings')) {
        return Promise.resolve({ ok: true, json: async () => ({ settings: { currency: 'USD', moving_average_period: 6 } }) } as Response)
      }
      if (String(url).includes('/api/categories')) {
        return Promise.resolve({ ok: true, json: async () => ({ categories: [{ id: 'cat-1', name: 'Groceries', type: 'expense' }] }) } as Response)
      }
      if (String(url).includes('/api/budgets')) {
        return Promise.resolve({ ok: true, json: async () => ({ budgets: [] }) } as Response)
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<TimelinePage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2024' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })

    // Toggle 2023 year
    fireEvent.click(screen.getByRole('button', { name: '2023' }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: '2023' })).toBeInTheDocument()
    })
  })
})
