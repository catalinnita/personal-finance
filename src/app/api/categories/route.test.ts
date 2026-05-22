import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  single: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

import { GET, POST, PUT } from './route'

function makeRequest(method: string, body?: unknown): NextRequest {
  return new NextRequest('http://localhost/api/categories', {
    method,
    body: body ? JSON.stringify(body) : undefined,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
  })
}

describe('GET /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns categories ordered by name', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const categories = [{ id: 'c-1', name: 'Groceries', type: 'expense' }]
    mockQuery.order.mockResolvedValue({ data: categories, error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.categories).toHaveLength(1)
    expect(body.categories[0].name).toBe('Groceries')
  })

  it('returns 500 when the database returns an error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.order.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/DB error/)
  })

  it('returns 500 on unexpected error (GET)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch categories/)
  })
})

describe('POST /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('POST', { name: 'Travel', type: 'expense' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('creates a category and returns it', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const created = { id: 'c-new', name: 'Travel', type: 'expense', expense_type: 'variable' }
    mockQuery.single.mockResolvedValue({ data: created, error: null })

    const req = makeRequest('POST', { name: 'Travel', type: 'expense' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.category.name).toBe('Travel')
  })

  it('returns 500 when insert returns a database error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Insert failed' } })

    const req = makeRequest('POST', { name: 'Travel', type: 'expense' })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Insert failed/)
  })

  it('returns 500 on unexpected error (POST)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('POST', { name: 'Travel', type: 'expense' })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to create category/)
  })
})

describe('PUT /api/categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest('PUT', { id: 'c-1', expense_type: 'fixed' })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when id is missing', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest('PUT', { expense_type: 'fixed' })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 for an invalid expense_type', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest('PUT', { id: 'c-1', expense_type: 'luxury' })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid expense_type/)
  })

  it('returns 400 for an invalid budget_group', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest('PUT', { id: 'c-1', budget_group: 'splurge' })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid budget_group/)
  })

  it('updates a category and returns it', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const updated = { id: 'c-1', name: 'Groceries', expense_type: 'fixed' }
    mockQuery.single.mockResolvedValue({ data: updated, error: null })

    const req = makeRequest('PUT', { id: 'c-1', expense_type: 'fixed' })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.category.expense_type).toBe('fixed')
  })

  it('returns 500 when update returns a database error', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Update failed' } })

    const req = makeRequest('PUT', { id: 'c-1', expense_type: 'fixed' })
    const res = await PUT(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Update failed/)
  })

  it('returns 500 on unexpected error (PUT)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest('PUT', { id: 'c-1', expense_type: 'fixed' })
    const res = await PUT(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to update category/)
  })
})
