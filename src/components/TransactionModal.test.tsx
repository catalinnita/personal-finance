import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import TransactionModal from './TransactionModal'
import { Transaction } from '@/types/database'

const mockTransaction: Transaction = {
  id: 'tx-1',
  date: '2024-03-15',
  category: 'Groceries',
  amount: -75.50,
  description: 'Supermarket',
  type: 'expense',
  user_id: 'user-1',
  created_at: '2024-03-15T00:00:00Z',
}

const defaultProps = {
  transaction: null,
  isOpen: true,
  onClose: vi.fn(),
  onSave: vi.fn(),
}

describe('TransactionModal', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: [] }),
    } as Response)
  })

  describe('visibility', () => {
    it('does not render when isOpen is false', () => {
      render(<TransactionModal {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when isOpen is true', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeInTheDocument()
      })
    })

    it('has aria-modal attribute', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
      })
    })

    it('has the correct title', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Edit Transaction')).toBeInTheDocument()
      })
    })
  })

  describe('form fields', () => {
    it('renders date input', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Date')).toBeInTheDocument()
      })
    })

    it('renders type select with income/expense options', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Income' })).toBeInTheDocument()
        expect(screen.getByRole('option', { name: 'Expense' })).toBeInTheDocument()
      })
    })

    it('renders amount number input', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        const amountInput = screen.getByDisplayValue('0')
        expect(amountInput).toBeInTheDocument()
      })
    })

    it('renders description text input', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByText('Description')).toBeInTheDocument()
      })
    })
  })

  describe('pre-fills from transaction', () => {
    it('pre-fills date from transaction', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => {
        expect(screen.getByDisplayValue('2024-03-15')).toBeInTheDocument()
      })
    })

    it('pre-fills description from transaction', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => {
        expect(screen.getByDisplayValue('Supermarket')).toBeInTheDocument()
      })
    })

    it('pre-fills amount as absolute value', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => {
        expect(screen.getByDisplayValue('75.5')).toBeInTheDocument()
      })
    })

    it('pre-fills type from transaction', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => {
        // expense is selected
        const typeSelect = screen.getAllByRole('combobox')[0]
        expect(typeSelect).toHaveValue('expense')
      })
    })
  })

  describe('close behavior', () => {
    it('calls onClose when close button clicked', async () => {
      const onClose = vi.fn()
      render(<TransactionModal {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.click(screen.getByLabelText(/close dialog/i))
      })
      expect(onClose).toHaveBeenCalled()
    })

    it('calls onClose when Cancel button clicked', async () => {
      const onClose = vi.fn()
      render(<TransactionModal {...defaultProps} onClose={onClose} />)
      await waitFor(() => {
        fireEvent.click(screen.getByRole('button', { name: /cancel/i }))
      })
      expect(onClose).toHaveBeenCalled()
    })
  })

  describe('form submission', () => {
    it('calls onSave with negative amount for expense on submit', async () => {
      const onSave = vi.fn()
      const onClose = vi.fn()
      render(
        <TransactionModal
          {...defaultProps}
          transaction={mockTransaction}
          onSave={onSave}
          onClose={onClose}
        />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ amount: -75.5, type: 'expense' })
      )
    })

    it('calls onClose after saving', async () => {
      const onClose = vi.fn()
      render(
        <TransactionModal
          {...defaultProps}
          transaction={mockTransaction}
          onClose={onClose}
        />
      )
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument()
      })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      expect(onClose).toHaveBeenCalled()
    })

    it('saves positive amount for income type', async () => {
      const incomeTransaction: Transaction = { ...mockTransaction, type: 'income', amount: 3000 }
      const onSave = vi.fn()
      render(
        <TransactionModal
          {...defaultProps}
          transaction={incomeTransaction}
          onSave={onSave}
        />
      )
      await waitFor(() => {
        const typeSelect = screen.getAllByRole('combobox')[0]
        expect(typeSelect).toHaveValue('income')
      })
      fireEvent.click(screen.getByRole('button', { name: /save/i }))
      expect(onSave).toHaveBeenCalledWith(
        expect.objectContaining({ amount: 3000, type: 'income' })
      )
    })
  })

  describe('categories fetch', () => {
    it('fetches categories on mount', async () => {
      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith('/api/categories')
      })
    })

    it('adds custom categories to the select', async () => {
      vi.mocked(global.fetch).mockResolvedValue({
        ok: true,
        json: async () => ({ categories: [{ name: 'CustomCat' }] }),
      } as Response)

      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        expect(screen.getByRole('option', { name: 'CustomCat' })).toBeInTheDocument()
      })
    })

    it('keeps default categories when fetch throws (line 43 catch path)', async () => {
      vi.mocked(global.fetch).mockRejectedValue(new Error('Network error'))

      render(<TransactionModal {...defaultProps} />)
      await waitFor(() => {
        // Default categories should still be rendered
        expect(screen.getByRole('option', { name: 'Groceries' })).toBeInTheDocument()
      })
    })
  })

  describe('field interactions', () => {
    it('updates date when date input changes (line 90)', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => expect(screen.getByDisplayValue('2024-03-15')).toBeInTheDocument())

      const dateInput = screen.getByDisplayValue('2024-03-15')
      fireEvent.change(dateInput, { target: { value: '2024-04-01' } })
      expect(screen.getByDisplayValue('2024-04-01')).toBeInTheDocument()
    })

    it('updates type when type select changes (line 98)', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => expect(screen.getAllByRole('combobox')[0]).toBeInTheDocument())

      const typeSelect = screen.getAllByRole('combobox')[0]
      fireEvent.change(typeSelect, { target: { value: 'income' } })
      expect(typeSelect).toHaveValue('income')
    })

    it('updates category when category select changes (line 110)', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => expect(screen.getAllByRole('combobox')[1]).toBeInTheDocument())

      const categorySelect = screen.getAllByRole('combobox')[1]
      fireEvent.change(categorySelect, { target: { value: 'Travel' } })
      expect(categorySelect).toHaveValue('Travel')
    })

    it('updates amount when amount input changes (line 125)', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => expect(screen.getByDisplayValue('75.5')).toBeInTheDocument())

      const amountInput = screen.getByDisplayValue('75.5')
      fireEvent.change(amountInput, { target: { value: '100' } })
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    })

    it('updates description when description input changes (line 135)', async () => {
      render(<TransactionModal {...defaultProps} transaction={mockTransaction} />)
      await waitFor(() => expect(screen.getByDisplayValue('Supermarket')).toBeInTheDocument())

      const descInput = screen.getByDisplayValue('Supermarket')
      fireEvent.change(descInput, { target: { value: 'Tesco' } })
      expect(screen.getByDisplayValue('Tesco')).toBeInTheDocument()
    })
  })
})
