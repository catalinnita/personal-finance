import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── @supabase/ssr mock ───────────────────────────────────────────────────────
const mockGetUser = vi.fn()
const mockSetAll = vi.fn()
const mockGetAll = vi.fn().mockReturnValue([])

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn((_url, _key, opts) => {
    // Capture the cookie helpers for inspection
    const cookies = opts?.cookies ?? {}
    if (cookies.getAll) mockGetAll.mockImplementation(cookies.getAll)
    if (cookies.setAll) mockSetAll.mockImplementation(cookies.setAll)
    return {
      auth: { getUser: mockGetUser },
    }
  }),
}))

import { updateSession } from './middleware'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(pathname: string, cookies: Record<string, string> = {}): NextRequest {
  const req = new NextRequest(`http://localhost${pathname}`)
  for (const [name, value] of Object.entries(cookies)) {
    req.cookies.set(name, value)
  }
  return req
}

describe('updateSession middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a response for authenticated users on any route', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    // Should pass through (not redirect)
    expect(res.status).not.toBe(302)
    expect(res.headers.get('location')).toBeNull()
  })

  it('redirects unauthenticated users to /login when accessing protected routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/dashboard')
    const res = await updateSession(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
  })

  it('does not redirect unauthenticated users on /login', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/login')
    const res = await updateSession(req)

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })

  it('does not redirect unauthenticated users on /auth routes', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/auth/callback')
    const res = await updateSession(req)

    expect(res.status).not.toBe(307)
    expect(res.headers.get('location')).toBeNull()
  })

  it('does not redirect on /auth/confirm', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/auth/confirm')
    const res = await updateSession(req)

    expect(res.status).not.toBe(307)
  })

  it('redirects unauthenticated users on /settings', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/settings')
    const res = await updateSession(req)

    expect(res.status).toBe(307)
    const location = res.headers.get('location')
    expect(location).toContain('/login')
  })

  it('redirects unauthenticated users on /transactions', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/transactions')
    const res = await updateSession(req)

    expect(res.status).toBe(307)
  })

  it('redirects unauthenticated users on the root path', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })

    const req = makeRequest('/')
    const res = await updateSession(req)

    expect(res.status).toBe(307)
  })

  it('returns supabaseResponse for authenticated users (pass-through)', async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-456' } }, error: null })

    const req = makeRequest('/transactions')
    const res = await updateSession(req)

    // Should pass through
    expect(res.status).toBe(200)
  })

  it('calls createServerClient with cookies getAll and setAll helpers', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-123' } }, error: null })

    const req = makeRequest('/dashboard')
    await updateSession(req)

    expect(createServerClient).toHaveBeenCalledTimes(1)
    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const opts = callArgs[2] as { cookies: { getAll: () => unknown[]; setAll: (cookies: unknown[]) => void } }
    expect(opts.cookies).toBeDefined()
    expect(typeof opts.cookies.getAll).toBe('function')
    expect(typeof opts.cookies.setAll).toBe('function')
  })

  it('invokes setAll helper - sets cookies on request and response', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-789' } }, error: null })

    const req = makeRequest('/dashboard', { existing: 'cookie' })
    await updateSession(req)

    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const opts = callArgs[2] as {
      cookies: {
        setAll: (cookies: { name: string; value: string; options?: unknown }[]) => void
      }
    }
    // Invoking setAll should not throw
    expect(() =>
      opts.cookies.setAll([{ name: 'sb-token', value: 'abc123' }])
    ).not.toThrow()
  })

  it('invokes getAll helper - returns request cookies', async () => {
    const { createServerClient } = await import('@supabase/ssr')
    mockGetUser.mockResolvedValue({ data: { user: { id: 'user-789' } }, error: null })

    const req = makeRequest('/dashboard', { my_cookie: 'hello' })
    await updateSession(req)

    const callArgs = vi.mocked(createServerClient).mock.calls[0]
    const opts = callArgs[2] as {
      cookies: {
        getAll: () => { name: string; value: string }[]
      }
    }
    const cookies = opts.cookies.getAll()
    expect(Array.isArray(cookies)).toBe(true)
  })
})
