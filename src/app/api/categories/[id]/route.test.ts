import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-123' }

// Build a chainable mock where the last call in the chain returns the resolved value.
// For DELETE routes the chain is: .delete().eq(id).eq(user_id) — the final .eq() must resolve.
function buildDeleteChain(result: { error: { message: string } | null }) {
  const chain = {
    delete: vi.fn().mockReturnThis(),
    // First .eq() returns this (more chaining coming), second .eq() resolves
    eq: vi.fn(),
    select: vi.fn().mockReturnThis(),
    single: vi.fn(),
  }
  // mockReturnThis for all but the last call, then resolve
  chain.eq.mockReturnValue({ ...chain, eq: vi.fn().mockResolvedValue(result) })
  return chain
}

const mockQuery = {
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { PUT, DELETE } from './route'

function makeRequest(method: string, id: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/categories/${id}`, {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

const paramsFactory = (id: string) => ({ params: Promise.resolve({ id }) })

describe('PUT /api/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('PUT', 'c-1', { name: 'Updated', type: 'expense' })
    const res = await PUT(req, paramsFactory('c-1'))
    expect(res.status).toBe(401)
  })

  it('updates a category and returns it', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const updated = { id: 'c-1', name: 'Updated Name', type: 'income' }
    mockQuery.single.mockResolvedValue({ data: updated, error: null })

    const req = makeRequest('PUT', 'c-1', { name: 'Updated Name', type: 'income' })
    const res = await PUT(req, paramsFactory('c-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.category.name).toBe('Updated Name')
  })

  it('returns 500 when the database returns an error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const req = makeRequest('PUT', 'c-1', { name: 'X', type: 'expense' })
    const res = await PUT(req, paramsFactory('c-1'))
    expect(res.status).toBe(500)
  })

  it('returns 500 on unexpected error (PUT)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('PUT', 'c-1', { name: 'X', type: 'expense' })
    const res = await PUT(req, paramsFactory('c-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to update category/)
  })
})

describe('DELETE /api/categories/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('DELETE', 'c-1')
    const res = await DELETE(req, paramsFactory('c-1'))
    expect(res.status).toBe(401)
  })

  it('deletes a category and returns success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const deleteChain = buildDeleteChain({ error: null })
    mockSupabase.from.mockReturnValue(deleteChain)

    const req = makeRequest('DELETE', 'c-1')
    const res = await DELETE(req, paramsFactory('c-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when the database returns an error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const deleteChain = buildDeleteChain({ error: { message: 'DB error' } })
    mockSupabase.from.mockReturnValue(deleteChain)

    const req = makeRequest('DELETE', 'c-1')
    const res = await DELETE(req, paramsFactory('c-1'))
    expect(res.status).toBe(500)
  })

  it('returns 500 on unexpected error (DELETE)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('DELETE', 'c-1')
    const res = await DELETE(req, paramsFactory('c-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to delete category/)
  })
})
