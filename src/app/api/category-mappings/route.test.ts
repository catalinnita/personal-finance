import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// fetchAllRows is used in GET
vi.mock('@/lib/supabase/paginate', () => ({
  fetchAllRows: vi.fn(),
}))

import { GET, POST } from './route'
import { fetchAllRows } from '@/lib/supabase/paginate'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/category-mappings', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleMappingRow = {
  id: 'm-1',
  description_pattern: 'TESCO',
  category_id: 'c-1',
  categories: { id: 'c-1', name: 'Groceries' },
}

describe('GET /api/category-mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns all mappings with category names', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([sampleMappingRow])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mappings).toHaveLength(1)
    expect(body.mappings[0].description_pattern).toBe('TESCO')
    expect(body.mappings[0].category).toBe('Groceries')
    expect(body.count).toBe(1)
  })

  it('returns empty mappings when user has none', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mappings).toHaveLength(0)
    expect(body.count).toBe(0)
  })

  it('returns empty string for category when categories is null', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([
      { id: 'm-2', description_pattern: 'ORPHAN', category_id: 'c-deleted', categories: null },
    ])

    const res = await GET()
    const body = await res.json()
    expect(body.mappings[0].category).toBe('')
  })

  it('returns 500 on unexpected error', async () => {
    vi.mocked(fetchAllRows).mockRejectedValueOnce(new Error('DB error'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch category mappings/)
  })

  it('returns multiple mappings sorted by description_pattern', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([
      { id: 'm-1', description_pattern: 'AMAZON', category_id: 'c-1', categories: { id: 'c-1', name: 'Shopping' } },
      { id: 'm-2', description_pattern: 'TESCO', category_id: 'c-2', categories: { id: 'c-2', name: 'Groceries' } },
    ])

    const res = await GET()
    const body = await res.json()
    expect(body.mappings).toHaveLength(2)
    expect(body.count).toBe(2)
  })
})

describe('POST /api/category-mappings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.select.mockReturnThis()
    mockQuery.update.mockReturnThis()
    mockQuery.insert.mockReturnThis()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest({ description_pattern: 'TESCO', category_id: 'c-1' })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('inserts a new mapping when none exists', async () => {
    const savedMapping = {
      id: 'm-new',
      description_pattern: 'TESCO',
      category_id: 'c-1',
      categories: { id: 'c-1', name: 'Groceries' },
    }

    // maybeSingle for existence check → not found
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    // insert().select().single() → new mapping
    mockQuery.single.mockResolvedValueOnce({ data: savedMapping, error: null })

    const req = makeRequest({ description_pattern: 'TESCO', category_id: 'c-1' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mapping.description_pattern).toBe('TESCO')
    expect(body.mapping.category).toBe('Groceries')
  })

  it('updates existing mapping when one already exists', async () => {
    const existingId = 'm-existing'
    const updatedMapping = {
      id: existingId,
      description_pattern: 'TESCO',
      category_id: 'c-2',
      categories: { id: 'c-2', name: 'Supermarket' },
    }

    // maybeSingle for existence check → found
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: { id: existingId }, error: null })
    // update().eq().select().single() → updated mapping
    mockQuery.single.mockResolvedValueOnce({ data: updatedMapping, error: null })

    const req = makeRequest({ description_pattern: 'TESCO', category_id: 'c-2' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mapping.category).toBe('Supermarket')
  })

  it('returns 500 when save fails', async () => {
    mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockQuery.single.mockResolvedValueOnce({ data: null, error: { message: 'Insert failed' } })

    const req = makeRequest({ description_pattern: 'TESCO', category_id: 'c-1' })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Insert failed/)
  })

  it('returns empty string for category when categories join is null', async () => {
    const savedMapping = {
      id: 'm-new',
      description_pattern: 'ORPHAN',
      category_id: 'c-deleted',
      categories: null,
    }

    mockQuery.maybeSingle.mockResolvedValueOnce({ data: null, error: null })
    mockQuery.single.mockResolvedValueOnce({ data: savedMapping, error: null })

    const req = makeRequest({ description_pattern: 'ORPHAN', category_id: 'c-deleted' })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.mapping.category).toBe('')
  })

  it('returns 500 on unexpected error', async () => {
    mockQuery.maybeSingle.mockRejectedValueOnce(new Error('Unexpected DB error'))

    const req = makeRequest({ description_pattern: 'TESCO', category_id: 'c-1' })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to create category mapping/)
  })
})
