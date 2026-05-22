import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockCreateBrowserClient } = vi.hoisted(() => ({
  mockCreateBrowserClient: vi.fn(() => ({ from: vi.fn() })),
}))

vi.mock('@supabase/ssr', () => ({
  createBrowserClient: mockCreateBrowserClient,
}))

import { createClient } from './client'

describe('createClient (browser)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  })

  it('calls createBrowserClient with the correct env vars', () => {
    createClient()
    expect(mockCreateBrowserClient).toHaveBeenCalledWith(
      'https://test.supabase.co',
      'test-anon-key'
    )
  })

  it('returns the value from createBrowserClient', () => {
    const fakeClient = { from: vi.fn() }
    mockCreateBrowserClient.mockReturnValueOnce(fakeClient)
    const client = createClient()
    expect(client).toBe(fakeClient)
  })
})
