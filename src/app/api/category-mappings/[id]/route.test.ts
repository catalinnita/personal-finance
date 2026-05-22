import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-123' }

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { DELETE } from './route'

// DELETE chain: .delete().eq(id).eq(user_id) — the second .eq() resolves the promise
function buildDeleteChain(result: { error: { message: string } | null }) {
  const chain = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  }
  chain.eq.mockReturnValue({ ...chain, eq: vi.fn().mockResolvedValue(result) })
  return chain
}

function makeRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/category-mappings/${id}`, { method: 'DELETE' })
}

const paramsFactory = (id: string) => ({ params: Promise.resolve({ id }) })

describe('DELETE /api/category-mappings/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    mockSupabase.from.mockReturnValue(buildDeleteChain({ error: null }))
    const res = await DELETE(makeRequest('m-1'), paramsFactory('m-1'))
    expect(res.status).toBe(401)
  })

  it('deletes the mapping and returns success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSupabase.from.mockReturnValue(buildDeleteChain({ error: null }))

    const res = await DELETE(makeRequest('m-1'), paramsFactory('m-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when the database returns an error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockSupabase.from.mockReturnValue(buildDeleteChain({ error: { message: 'DB error' } }))

    const res = await DELETE(makeRequest('m-1'), paramsFactory('m-1'))
    expect(res.status).toBe(500)
  })

  it('returns 500 on unexpected error', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const res = await DELETE(makeRequest('m-1'), paramsFactory('m-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to delete category mapping/)
  })
})
