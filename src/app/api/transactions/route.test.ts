import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  range: vi.fn(),
  single: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// fetchAllRows returns different values depending on the table.
// We configure this per-test via the vi.mocked().mockResolvedValueOnce pattern.
vi.mock('@/lib/supabase/paginate', () => ({
  fetchAllRows: vi.fn(),
}))

import { GET, POST } from './route'
import { fetchAllRows } from '@/lib/supabase/paginate'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/transactions', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

const sampleTransaction = { id: 'tx-1', date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', user_id: 'user-123' }
const sampleMapping = { description_pattern: 'TESCO', category_id: 'c-1', categories: { name: 'Groceries' } }

describe('GET /api/transactions', () => {
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

  it('returns transactions with category from mapping', async () => {
    vi.mocked(fetchAllRows)
      .mockResolvedValueOnce([sampleTransaction])  // transactions
      .mockResolvedValueOnce([sampleMapping])        // category_mappings

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions).toHaveLength(1)
    expect(body.transactions[0].category).toBe('Groceries')
  })

  it('assigns "Other" category when no mapping exists', async () => {
    vi.mocked(fetchAllRows)
      .mockResolvedValueOnce([sampleTransaction])
      .mockResolvedValueOnce([])  // no mappings

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions[0].category).toBe('Other')
  })

  it('returns empty transactions array when user has no transactions', async () => {
    vi.mocked(fetchAllRows)
      .mockResolvedValueOnce([])  // no transactions
      .mockResolvedValueOnce([])  // no mappings

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions).toHaveLength(0)
  })

  it('returns 500 on unexpected error', async () => {
    vi.mocked(fetchAllRows).mockRejectedValueOnce(new Error('DB error'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch transactions/)
  })

  it('maps multiple transactions with correct categories', async () => {
    const txs = [
      { id: 'tx-1', date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', user_id: 'user-123' },
      { id: 'tx-2', date: '2024-01-16', description: 'NETFLIX', amount: -12, type: 'expense', user_id: 'user-123' },
    ]
    const mappings = [
      { description_pattern: 'TESCO', category_id: 'c-1', categories: { name: 'Groceries' } },
      { description_pattern: 'NETFLIX', category_id: 'c-2', categories: { name: 'Subscriptions' } },
    ]
    vi.mocked(fetchAllRows)
      .mockResolvedValueOnce(txs)
      .mockResolvedValueOnce(mappings)

    const res = await GET()
    const body = await res.json()
    expect(body.transactions[0].category).toBe('Groceries')
    expect(body.transactions[1].category).toBe('Subscriptions')
  })
})

describe('POST /api/transactions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.select.mockReturnThis()
    mockQuery.insert.mockReturnThis()
    mockQuery.upsert.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest({ transactions: [] })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('inserts new transactions and returns saved count', async () => {
    // fetchAllRows for existing transactions → empty (no duplicates)
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    // Categories lookup
    const savedTx = { id: 'tx-new', date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', user_id: 'user-123' }
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          ...mockQuery,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'c-1', name: 'Groceries' }], error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { ...mockQuery, upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      }
      if (table === 'transactions') {
        return {
          ...mockQuery,
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [savedTx], error: null }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(1)
    expect(body.duplicates).toBe(0)
  })

  it('skips duplicate transactions', async () => {
    // Existing transaction matches incoming one
    vi.mocked(fetchAllRows).mockResolvedValueOnce([
      { date: '2024-01-15', description: 'TESCO', amount: -45 },
    ])

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          ...mockQuery,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(0)
    expect(body.duplicates).toBe(1)
  })

  it('creates category mappings for new transactions', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'c-1', name: 'Groceries' }], error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { upsert: mockUpsert }
      }
      if (table === 'transactions') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    await POST(req)
    expect(mockUpsert).toHaveBeenCalled()
  })

  it('returns 500 when inserting transactions fails', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      }
      if (table === 'transactions') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: null, error: { message: 'Insert failed' } }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Insert failed/)
  })

  it('returns 500 on unexpected error', async () => {
    vi.mocked(fetchAllRows).mockRejectedValueOnce(new Error('DB failure'))
    const req = makeRequest({ transactions: [] })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to create transactions/)
  })

  it('handles empty transactions array gracefully', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({ transactions: [] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.saved).toBe(0)
    expect(body.duplicates).toBe(0)
  })

  it('logs error when category_mappings upsert fails (line 139)', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: { message: 'Mapping upsert failed' } })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'c-1', name: 'Groceries' }], error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { upsert: mockUpsert }
      }
      if (table === 'transactions') {
        return {
          insert: vi.fn().mockReturnThis(),
          select: vi.fn().mockResolvedValue({ data: [], error: null }),
        }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    const res = await POST(req)
    // Mapping error is logged but non-fatal; should still return 200
    expect(res.status).toBe(200)
  })

  it('strips the category field before inserting to transactions table', async () => {
    vi.mocked(fetchAllRows).mockResolvedValueOnce([])

    let insertedData: Record<string, unknown>[] = []
    const mockInsert = vi.fn().mockImplementation((data: Record<string, unknown>[]) => {
      insertedData = data
      return { select: vi.fn().mockResolvedValue({ data: [], error: null }) }
    })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [{ id: 'c-1', name: 'Groceries' }], error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { upsert: vi.fn().mockResolvedValue({ data: null, error: null }) }
      }
      if (table === 'transactions') {
        return { insert: mockInsert }
      }
      return mockQuery
    })

    const req = makeRequest({
      transactions: [
        { date: '2024-01-15', description: 'TESCO', amount: -45, type: 'expense', category: 'Groceries' },
      ],
    })
    await POST(req)
    // Inserted data should not have 'category' field
    expect(insertedData[0]).not.toHaveProperty('category')
    expect(insertedData[0]).toHaveProperty('user_id', 'user-123')
  })
})
