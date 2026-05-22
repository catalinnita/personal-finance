import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabase = {
  auth: {
    exchangeCodeForSession: vi.fn(),
  },
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET } from './route'

function makeRequest(params: Record<string, string>): Request {
  const url = new URL('http://localhost/auth/callback')
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v))
  return new Request(url.toString())
}

describe('GET /auth/callback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('redirects to the next path when code exchange succeeds', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })
    const req = makeRequest({ code: 'valid-code', next: '/dashboard' })
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/dashboard')
  })

  it('redirects to / when next is not specified', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })
    const req = makeRequest({ code: 'valid-code' })
    const res = await GET(req)
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toBe('http://localhost/')
  })

  it('redirects to login with error when code exchange fails', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: { message: 'Invalid code' } })
    const req = makeRequest({ code: 'bad-code' })
    const res = await GET(req)
    expect(res.headers.get('location')).toContain('/login')
    expect(res.headers.get('location')).toContain('error=')
  })

  it('redirects to login with error when no code is provided', async () => {
    const req = makeRequest({})
    const res = await GET(req)
    expect(res.headers.get('location')).toContain('/login')
  })

  it('prevents open redirects by ignoring absolute next URLs', async () => {
    mockSupabase.auth.exchangeCodeForSession.mockResolvedValue({ data: {}, error: null })
    // next starts with // which is an open redirect attempt
    const req = makeRequest({ code: 'valid-code', next: '//evil.com/steal' })
    const res = await GET(req)
    // Should redirect to / not //evil.com/steal
    expect(res.headers.get('location')).not.toContain('evil.com')
    expect(res.headers.get('location')).toBe('http://localhost/')
  })
})
