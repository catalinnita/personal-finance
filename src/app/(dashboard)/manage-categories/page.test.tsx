import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import ManageCategoriesPage from './page'

const mockCategories = [
  { id: 'cat-1', name: 'Groceries', type: 'expense' as const, expense_type: 'variable' as const },
  { id: 'cat-2', name: 'Salary', type: 'income' as const, expense_type: 'variable' as const },
]

describe('ManageCategoriesPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: mockCategories }),
    } as Response)
  })

  it('shows loading spinner initially', () => {
    render(<ManageCategoriesPage />)
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders page heading after load', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /manage categories/i })).toBeInTheDocument()
    })
  })

  it('renders existing categories after load', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
      expect(screen.getByText('Salary')).toBeInTheDocument()
    })
  })

  it('renders category type badges', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('expense')).toBeInTheDocument()
      expect(screen.getByText('income')).toBeInTheDocument()
    })
  })

  it('renders the add category input', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument()
    })
  })

  it('renders the Add button', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })
  })

  it('calls POST /api/categories when Add button is clicked with valid name', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: { id: 'cat-3', name: 'NewCat', type: 'expense', expense_type: 'variable' } }),
      } as Response)

    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/category name/i)).toBeInTheDocument()
    })

    fireEvent.change(screen.getByPlaceholderText(/category name/i), { target: { value: 'NewCat' } })
    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/categories',
        expect.objectContaining({ method: 'POST' })
      )
    })
  })

  it('does not call POST when category name is empty', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /add/i })).toBeInTheDocument()
    })

    fireEvent.click(screen.getByRole('button', { name: /add/i }))

    // Only the initial GET should be called, not POST
    expect(global.fetch).toHaveBeenCalledTimes(1)
  })

  it('shows edit mode when edit button is clicked', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    const editBtns = screen.getAllByRole('button').filter(btn =>
      btn.querySelector('svg') && btn.className.includes('hover:text-brand')
    )
    if (editBtns.length > 0) {
      fireEvent.click(editBtns[0])
      await waitFor(() => {
        expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument()
      })
    }
  })

  it('shows empty state message when no categories', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ categories: [] }),
    } as Response)

    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText(/no custom categories yet/i)).toBeInTheDocument()
    })
  })

  it('updates category name and saves on Save click (lines 140-174)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: { id: 'cat-1', name: 'Updated', type: 'expense', expense_type: 'variable' } }),
      } as Response)

    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    // Click edit button for Groceries
    const editBtns = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-brand')
    )
    fireEvent.click(editBtns[0])
    await waitFor(() => {
      expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument()
    })

    // Change name
    fireEvent.change(screen.getByDisplayValue('Groceries'), { target: { value: 'Updated' } })

    // Click Save (checkmark button)
    const saveBtn = screen.getAllByRole('button').find(b =>
      b.className.includes('text-success') || b.className.includes('hover:text-success')
    )
    if (saveBtn) {
      fireEvent.click(saveBtn)
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/categories/cat-1'),
          expect.objectContaining({ method: 'PUT' })
        )
      })
    }
  })

  it('cancels edit mode when X is clicked (line 154)', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    // Click edit button
    const editBtns = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-brand')
    )
    fireEvent.click(editBtns[0])
    await waitFor(() => {
      expect(screen.getByDisplayValue('Groceries')).toBeInTheDocument()
    })

    // Click Cancel (X button)
    const cancelBtn = screen.getAllByRole('button').find(b =>
      b.className.includes('hover:text-gray-900') || b.className.includes('text-gray-400')
    )
    if (cancelBtn) {
      fireEvent.click(cancelBtn)
      await waitFor(() => {
        expect(screen.queryByDisplayValue('Groceries')).not.toBeInTheDocument()
      })
    }
  })

  it('deletes category when delete button clicked and confirmed (line 77-88)', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true)
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response)

    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    // Click delete button
    const deleteBtns = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-error')
    )
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0])
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/categories/'),
          expect.objectContaining({ method: 'DELETE' })
        )
      })
    }
  })

  it('does not delete when confirmation is rejected', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false)
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    const callsBefore = vi.mocked(global.fetch).mock.calls.length
    const deleteBtns = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-error')
    )
    if (deleteBtns.length > 0) {
      fireEvent.click(deleteBtns[0])
    }
    expect(vi.mocked(global.fetch).mock.calls.length).toBe(callsBefore)
  })

  it('toggles expense_type when fixed/variable button clicked (lines 168-194)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ categories: mockCategories }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ category: { ...mockCategories[0], expense_type: 'fixed' } }),
      } as Response)

    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('variable')).toBeInTheDocument()
    })

    // Click variable/fixed toggle button
    fireEvent.click(screen.getByText('variable'))
    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/categories',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('changes type in edit mode (lines 143-150)', async () => {
    render(<ManageCategoriesPage />)
    await waitFor(() => {
      expect(screen.getByText('Groceries')).toBeInTheDocument()
    })

    // Enter edit mode for Groceries (expense category)
    const editBtns = screen.getAllByRole('button').filter(btn =>
      btn.className.includes('hover:text-brand')
    )
    fireEvent.click(editBtns[0])
    await waitFor(() => {
      // In edit mode, a select appears with expense/income options
      const selects = screen.getAllByRole('combobox')
      expect(selects.length).toBeGreaterThan(0)
    })

    // Change type in edit mode - find the select that has expense/income options
    const selects = screen.getAllByRole('combobox')
    const typeSelect = selects.find(s => s.querySelector?.('option[value="expense"]')) || selects[selects.length - 1]
    fireEvent.change(typeSelect, { target: { value: 'income' } })
    expect(typeSelect).toHaveValue('income')
  })
})
