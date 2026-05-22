import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import UploadPage from './page'

describe('UploadPage', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({ transactions: [], saved: 0, duplicates: 0 }),
    } as Response)
  })

  it('renders the page heading', () => {
    render(<UploadPage />)
    expect(screen.getByRole('heading', { name: /upload statements/i })).toBeInTheDocument()
  })

  it('renders the file drop area', () => {
    render(<UploadPage />)
    expect(screen.getByText(/drop your statements here/i)).toBeInTheDocument()
  })

  it('renders file input accepting csv/txt/pdf', () => {
    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    expect(input).toBeInTheDocument()
    expect(input.accept).toBe('.csv,.txt,.pdf')
    expect(input.multiple).toBe(true)
  })

  it('does not show Process button without files selected', () => {
    render(<UploadPage />)
    expect(screen.queryByRole('button', { name: /process/i })).not.toBeInTheDocument()
  })

  it('shows selected file count after file selection', async () => {
    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', {
      value: [file],
      configurable: true,
    })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByText(/1 file\(s\) selected/i)).toBeInTheDocument()
    })
  })

  it('shows Process button after file selection', async () => {
    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument()
    })
  })

  it('shows file name in list after selection', async () => {
    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'mystatement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByText('mystatement.csv')).toBeInTheDocument()
    })
  })

  it('removes file when X is clicked', async () => {
    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'mystatement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByText('mystatement.csv')).toBeInTheDocument()
    })
    // Click the remove button
    const removeBtn = screen.getAllByRole('button').find(b => !b.textContent?.includes('Process'))
    if (removeBtn) fireEvent.click(removeBtn)
    await waitFor(() => {
      expect(screen.queryByText('mystatement.csv')).not.toBeInTheDocument()
    })
  })

  it('shows processing section and calls fetch when processing starts', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [{ date: '2024-01-01', amount: -50, description: 'Test', category: 'Other', type: 'expense' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: 1, duplicates: 0 }),
      } as Response)

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['date,amount\n2024-01-01,-50'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))
    await waitFor(() => {
      expect(screen.getByText(/processing files/i)).toBeInTheDocument()
    })
  })

  it('shows error status when parse-statement API returns an error (lines 176-178)', async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Parse failed' }),
    } as Response)

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['bad data'], 'bad.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))
    await waitFor(() => {
      expect(screen.getByText('Parse failed')).toBeInTheDocument()
    })
  })

  it('shows completed status with saved and duplicates (lines 205-209)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [{ date: '2024-01-01', amount: -50, description: 'Test', category: 'Other', type: 'expense' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: 1, duplicates: 2 }),
      } as Response)

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument()
    })
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))
    await waitFor(() => {
      expect(screen.getByText(/saved 1 transactions.*2 duplicates skipped/i)).toBeInTheDocument()
    })
  })

  it('shows save error status when transactions API fails (lines 210-212)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          transactions: [{ date: '2024-01-01', amount: -50, description: 'Test', category: 'Other', type: 'expense' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: 'Save failed' }),
      } as Response)

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))
    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeInTheDocument()
    })
  })

  it('loads persisted completed state from localStorage on mount (lines 54-57)', async () => {
    const persistedState = {
      files: [{ name: 'old.csv', status: 'completed', transactions: [], saved: 5, duplicates: 0 }],
      isProcessing: false,
      currentIndex: 0,
      cancelled: false,
    }
    localStorage.setItem('upload_process_state', JSON.stringify(persistedState))

    render(<UploadPage />)
    await waitFor(() => {
      // The persisted completed state should be displayed
      const elements = screen.queryAllByText('old.csv')
      expect(elements.length).toBeGreaterThan(0)
    })
  })

  it('handles cancel button during processing (lines 224-228)', async () => {
    // Use a delayed parse response so we can click cancel
    let resolveparse: (value: unknown) => void
    const parsePromise = new Promise(resolve => { resolveparse = resolve })

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (String(url).includes('/api/parse-statement')) {
        return parsePromise as Promise<Response>
      }
      return Promise.resolve({ ok: true, json: async () => ({}) } as Response)
    })

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))

    await waitFor(() => expect(screen.getByText(/processing files/i)).toBeInTheDocument())

    const cancelBtn = screen.getByRole('button', { name: /cancel/i })
    fireEvent.click(cancelBtn)

    // Resolve the fetch after cancel
    resolveparse!({ ok: false, json: async () => ({ error: 'Cancelled' }) })

    // After cancel, isProcessing becomes false, so cancel button disappears
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /cancel/i })).not.toBeInTheDocument()
    })
  })

  it('handles reset button after processing (line 230-235)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ transactions: [{ date: '2024-01-01', amount: -50, description: 'Test', category: 'Other', type: 'expense' }] }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ saved: 1, duplicates: 0 }),
      } as Response)

    render(<UploadPage />)
    const input = document.querySelector('input[type="file"]') as HTMLInputElement
    const file = new File(['data'], 'statement.csv', { type: 'text/csv' })
    Object.defineProperty(input, 'files', { value: [file], configurable: true })
    fireEvent.change(input)
    await waitFor(() => expect(screen.getByRole('button', { name: /process 1 statement/i })).toBeInTheDocument())
    fireEvent.click(screen.getByRole('button', { name: /process 1 statement/i }))
    await waitFor(() => expect(screen.getByText(/saved 1 transactions/i)).toBeInTheDocument())

    // Reset button is labeled "Upload More"
    const resetBtn = screen.getByRole('button', { name: /upload more/i })
    fireEvent.click(resetBtn)
    await waitFor(() => {
      expect(screen.queryByText('statement.csv')).not.toBeInTheDocument()
    })
  })
})
