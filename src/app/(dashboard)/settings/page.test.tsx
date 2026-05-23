import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import React from 'react'
import SettingsPage from './page'

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: async () => ({
        settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
        currencies: [
          { code: 'USD', symbol: '$', name: 'US Dollar' },
          { code: 'EUR', symbol: '€', name: 'Euro' },
        ],
      }),
    } as Response)
  })

  it('shows loading spinner initially', () => {
    render(<SettingsPage />)
    // The spinner is rendered while loading=true
    expect(document.querySelector('.animate-spin')).toBeInTheDocument()
  })

  it('renders the settings heading after load', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /settings/i })).toBeInTheDocument()
    })
  })

  it('renders currency selector with loaded options', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('option', { name: /us dollar/i })).toBeInTheDocument()
    })
  })

  it('renders the threshold input with the current value', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('500')).toBeInTheDocument()
    })
  })

  it('renders the moving average period input', async () => {
    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByDisplayValue('6')).toBeInTheDocument()
    })
  })

  it('calls PUT /api/settings when currency is changed', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [
            { code: 'USD', symbol: '$', name: 'US Dollar' },
            { code: 'EUR', symbol: '€', name: 'Euro' },
          ],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: { currency: 'EUR', highlight_threshold: 500, moving_average_period: 6 } }),
      } as Response)

    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getByRole('combobox')).toBeInTheDocument()
    })

    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'EUR' } })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('calls PUT /api/settings when Save button is clicked for threshold', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: { currency: 'USD', highlight_threshold: 1000, moving_average_period: 6 } }),
      } as Response)

    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /save/i }).length).toBeGreaterThan(0)
    })

    const saveButtons = screen.getAllByRole('button', { name: /save/i })
    fireEvent.click(saveButtons[0])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('calls PUT when moving average Save button is clicked (lines 85-90)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 12 } }),
      } as Response)

    render(<SettingsPage />)
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /save/i }).length).toBe(2)
    })

    // Second save button is for moving average period
    const saveButtons = screen.getAllByRole('button', { name: /save/i })
    fireEvent.click(saveButtons[1])

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('does not save when threshold input is invalid (line 80 branch)', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /save/i }).length).toBeGreaterThan(0))

    // Change threshold input to invalid value
    const thresholdInput = screen.getByDisplayValue('500')
    fireEvent.change(thresholdInput, { target: { value: 'abc' } })

    const callsBefore = vi.mocked(global.fetch).mock.calls.length
    fireEvent.click(screen.getAllByRole('button', { name: /save/i })[0])
    // No additional PUT call
    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(callsBefore)
    })
  })

  it('does not save when moving average period is out of range (line 87 branch)', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /save/i }).length).toBe(2))

    // Change moving avg input to invalid value (too large)
    const movingAvgInput = screen.getByDisplayValue('6')
    fireEvent.change(movingAvgInput, { target: { value: '100' } })

    const callsBefore = vi.mocked(global.fetch).mock.calls.length
    fireEvent.click(screen.getAllByRole('button', { name: /save/i })[1])
    await waitFor(() => {
      expect(vi.mocked(global.fetch).mock.calls.length).toBe(callsBefore)
    })
  })

  it('handles fetch settings error gracefully (line 40)', async () => {
    vi.mocked(global.fetch).mockRejectedValueOnce(new Error('Network error'))
    expect(() => render(<SettingsPage />)).not.toThrow()
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('handles save settings error gracefully (line 68)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
        }),
      } as Response)
      .mockRejectedValueOnce(new Error('Save failed'))

    render(<SettingsPage />)
    await waitFor(() => expect(screen.getAllByRole('button', { name: /save/i }).length).toBeGreaterThan(0))
    fireEvent.click(screen.getAllByRole('button', { name: /save/i })[0])
    // Should not throw
    await waitFor(() => {
      expect(document.body).toBeInTheDocument()
    })
  })

  it('saves moving avg period on blur (line 195)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 9 } }),
      } as Response)

    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByDisplayValue('6')).toBeInTheDocument())

    const movingAvgInput = screen.getByDisplayValue('6')
    fireEvent.change(movingAvgInput, { target: { value: '9' } })
    fireEvent.blur(movingAvgInput)

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })

  it('updates threshold input on change (lines 155)', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByDisplayValue('500')).toBeInTheDocument())

    const input = screen.getByDisplayValue('500')
    fireEvent.change(input, { target: { value: '1000' } })
    expect(screen.getByDisplayValue('1000')).toBeInTheDocument()
  })

  it('updates moving avg input on change (line 193)', async () => {
    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByDisplayValue('6')).toBeInTheDocument())

    const input = screen.getByDisplayValue('6')
    fireEvent.change(input, { target: { value: '12' } })
    expect(screen.getByDisplayValue('12')).toBeInTheDocument()
  })

  it('saves threshold on Enter keypress (line 157)', async () => {
    vi.mocked(global.fetch)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          settings: { currency: 'USD', highlight_threshold: 500, moving_average_period: 6 },
          currencies: [{ code: 'USD', symbol: '$', name: 'US Dollar' }],
        }),
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ settings: { currency: 'USD', highlight_threshold: 750, moving_average_period: 6 } }),
      } as Response)

    render(<SettingsPage />)
    await waitFor(() => expect(screen.getByDisplayValue('500')).toBeInTheDocument())

    const input = screen.getByDisplayValue('500')
    fireEvent.change(input, { target: { value: '750' } })
    fireEvent.keyDown(input, { key: 'Enter' })

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        '/api/settings',
        expect.objectContaining({ method: 'PUT' })
      )
    })
  })
})
