import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { useCurrency } from './useCurrency'

describe('useCurrency', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts in loading state with USD as default', () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useCurrency())
    expect(result.current.loading).toBe(true)
    expect(result.current.currencyCode).toBe('USD')
  })

  it('loads currency from settings API', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'EUR' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.currencyCode).toBe('EUR')
    expect(result.current.currency.symbol).toBe('€')
  })

  it('falls back to USD when fetch fails', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'))

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.currencyCode).toBe('USD')
  })

  it('falls back to USD when settings response is not ok', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: false,
      json: async () => ({}),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.currencyCode).toBe('USD')
  })

  it('formatAmount returns a formatted amount with currency symbol', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'GBP' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.formatAmount(1234.56)).toBe('£1,234.56')
  })

  it('formatAmount uses absolute value (ignores negative sign)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'USD' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.formatAmount(-500)).toBe('$500.00')
  })

  it('formatAmountWithSign prefixes + for positive amounts', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'USD' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.formatAmountWithSign(100)).toBe('+$100.00')
  })

  it('formatAmountWithSign prefixes - for negative amounts', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'USD' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.formatAmountWithSign(-100)).toBe('-$100.00')
  })

  it('falls back to USD when currencyCode is not in the CURRENCIES map (line 46)', async () => {
    ;(global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
      ok: true,
      json: async () => ({ settings: { currency: 'XYZ' } }),
    })

    const { result } = renderHook(() => useCurrency())
    await waitFor(() => expect(result.current.loading).toBe(false))
    // XYZ is not in CURRENCIES, so it falls back to USD
    expect(result.current.currency.code).toBe('USD')
    expect(result.current.currency.symbol).toBe('$')
  })
})
