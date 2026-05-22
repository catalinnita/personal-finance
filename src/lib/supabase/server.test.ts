import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── @supabase/ssr mock ────────────────────────────────────────────────────────
const { mockCreateServerClient } = vi.hoisted(() => ({
  mockCreateServerClient: vi.fn(() => ({ auth: { getUser: vi.fn() } })),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: mockCreateServerClient,
}))

// ── next/headers mock ─────────────────────────────────────────────────────────
const mockCookieStore = {
  getAll: vi.fn().mockReturnValue([]),
  set: vi.fn(),
}

vi.mock('next/headers', () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}))

import { createClient } from './server'

describe('createClient (server)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
    mockCookieStore.getAll.mockReturnValue([])
  })

  it('calls createServerClient with the correct env vars', async () => {
    await createClient()
    expect(mockCreateServerClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key',
      expect.objectContaining({ cookies: expect.any(Object) })
    )
  })

  it('returns the value from createServerClient', async () => {
    const fakeClient = { auth: { getUser: vi.fn() } }
    mockCreateServerClient.mockReturnValueOnce(fakeClient)
    const client = await createClient()
    expect(client).toBe(fakeClient)
  })

  it('passes cookie helpers that call cookieStore.getAll', async () => {
    await createClient()
    const callArgs = mockCreateServerClient.mock.calls[0]
    const opts = callArgs[2] as { cookies: { getAll: () => unknown[]; setAll: (cookies: unknown[]) => void } }
    // Invoke the getAll helper and verify it proxies to the store
    mockCookieStore.getAll.mockReturnValueOnce([{ name: 'sb-token', value: 'abc' }])
    const result = opts.cookies.getAll()
    expect(result).toEqual([{ name: 'sb-token', value: 'abc' }])
  })

  it('setAll silently ignores errors from Server Component context', async () => {
    mockCookieStore.set.mockImplementationOnce(() => { throw new Error('Server Component') })
    await createClient()
    const callArgs = mockCreateServerClient.mock.calls[0]
    const opts = callArgs[2] as { cookies: { setAll: (cookies: { name: string; value: string; options?: unknown }[]) => void } }
    // Should not throw
    expect(() => opts.cookies.setAll([{ name: 'foo', value: 'bar' }])).not.toThrow()
  })

  it('setAll calls cookieStore.set for each cookie when successful', async () => {
    await createClient()
    const callArgs = mockCreateServerClient.mock.calls[0]
    const opts = callArgs[2] as { cookies: { setAll: (cookies: { name: string; value: string; options?: unknown }[]) => void } }
    opts.cookies.setAll([
      { name: 'a', value: '1' },
      { name: 'b', value: '2' },
    ])
    expect(mockCookieStore.set).toHaveBeenCalledTimes(2)
  })
})
