import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ── Supabase mock ──────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' }

// For DELETE chains: .delete().eq(id).eq(user_id) - last .eq() must resolve
function buildDeleteChain(result: { error: { message: string } | null }) {
  const chain = {
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn(),
  }
  chain.eq.mockReturnValue({ ...chain, eq: vi.fn().mockResolvedValue(result) })
  return chain
}

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET, POST, DELETE } from './route'

function makeRequest(method: string, body?: unknown, searchParams?: Record<string, string>): NextRequest {
  const url = new URL('http://localhost/api/budgets')
  if (searchParams) {
    Object.entries(searchParams).forEach(([k, v]) => url.searchParams.set(k, v))
  }
  return new NextRequest(url.toString(), {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('GET /api/budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when user is not authenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
    const body = await res.json()
    expect(body.error).toBe('Unauthorized')
  })

  it('returns a list of budgets for an authenticated user', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const budgets = [{ id: 'b-1', category_id: 'c-1', amount: 500, effective_from: '2024-01-01', created_at: '2024-01-01', categories: { name: 'Groceries' } }]
    mockQuery.order.mockResolvedValue({ data: budgets, error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.budgets).toHaveLength(1)
    expect(body.budgets[0].category_name).toBe('Groceries')
  })

  it('returns 500 when the database returns an error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.order.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET()
    expect(res.status).toBe(500)
  })

  it('returns 500 on unexpected error (GET catch block)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected network error'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch budgets/)
  })
})

describe('POST /api/budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('POST', { category_id: 'c-1', amount: 500 })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when category_id is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest('POST', { amount: 500 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/category_id/)
  })

  it('creates a budget and returns it', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const created = { id: 'b-new', category_id: 'c-1', amount: 500, effective_from: '2024-01-01', created_at: '2024-01-01' }
    mockQuery.single.mockResolvedValue({ data: created, error: null })

    const req = makeRequest('POST', { category_id: 'c-1', amount: 500 })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.budget.id).toBe('b-new')
  })

  it('returns 500 when upsert returns a database error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Upsert failed' } })

    const req = makeRequest('POST', { category_id: 'c-1', amount: 500 })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Upsert failed/)
  })

  it('returns 500 on unexpected error (POST)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('POST', { category_id: 'c-1', amount: 500 })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to create budget/)
  })
})

describe('DELETE /api/budgets', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('DELETE', undefined, { id: 'b-1' })
    const res = await DELETE(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest('DELETE')
    const res = await DELETE(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/id/)
  })

  it('deletes a budget and returns success', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const deleteChain = buildDeleteChain({ error: null })
    mockSupabase.from.mockReturnValue(deleteChain)

    const req = makeRequest('DELETE', undefined, { id: 'b-1' })
    const res = await DELETE(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when delete returns a database error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const deleteChain = buildDeleteChain({ error: { message: 'Delete failed' } })
    mockSupabase.from.mockReturnValue(deleteChain)

    const req = makeRequest('DELETE', undefined, { id: 'b-1' })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Delete failed/)
  })

  it('returns 500 on unexpected error (DELETE)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('DELETE', undefined, { id: 'b-1' })
    const res = await DELETE(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to delete budget/)
  })
})
