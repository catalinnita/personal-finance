import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Use vi.hoisted to avoid temporal dead zone ───────────────────────────────
const { mockUpdateSession } = vi.hoisted(() => ({
  mockUpdateSession: vi.fn(),
}))

vi.mock('@/lib/supabase/middleware', () => ({
  updateSession: mockUpdateSession,
}))

import { proxy, config } from './proxy'

describe('proxy', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('calls updateSession with the request and returns the result', async () => {
    const mockResponse = new Response(null, { status: 200 })
    mockUpdateSession.mockResolvedValue(mockResponse)

    const req = new NextRequest('http://localhost/dashboard')
    const result = await proxy(req)

    expect(mockUpdateSession).toHaveBeenCalledWith(req)
    expect(result).toBe(mockResponse)
  })

  it('exports the config matcher for Next.js middleware', () => {
    expect(config).toBeDefined()
    expect(config.matcher).toBeDefined()
    expect(Array.isArray(config.matcher)).toBe(true)
    expect(config.matcher.length).toBeGreaterThan(0)
  })

  it('propagates errors thrown by updateSession', async () => {
    mockUpdateSession.mockRejectedValue(new Error('Middleware error'))

    const req = new NextRequest('http://localhost/dashboard')
    await expect(proxy(req)).rejects.toThrow('Middleware error')
  })
})
