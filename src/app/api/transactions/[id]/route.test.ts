import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  delete: vi.fn().mockReturnThis(),
  upsert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makePutRequest(id: string, body: unknown): NextRequest {
  return new NextRequest(`http://localhost/api/transactions/${id}`, {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeDeleteRequest(id: string): NextRequest {
  return new NextRequest(`http://localhost/api/transactions/${id}`, {
    method: 'DELETE',
  })
}

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) }
}

describe('PUT /api/transactions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.select.mockReturnThis()
    mockQuery.update.mockReturnThis()
    mockQuery.upsert.mockResolvedValue({ data: null, error: null })
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makePutRequest('tx-1', { description: 'TESCO' })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(401)
  })

  it('updates a transaction and returns it', async () => {
    const originalTx = { description: 'TESCO' }
    const updatedTx = { id: 'tx-1', description: 'TESCO', amount: -50, type: 'expense', user_id: 'user-123' }

    // First single() call: get original transaction
    // Second single() call: update and return updated
    mockQuery.single
      .mockResolvedValueOnce({ data: originalTx, error: null })
      .mockResolvedValueOnce({ data: updatedTx, error: null })

    const req = makePutRequest('tx-1', { amount: -50 })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction).toBeDefined()
    expect(body.transaction.id).toBe('tx-1')
  })

  it('returns 500 when update fails', async () => {
    mockQuery.single
      .mockResolvedValueOnce({ data: { description: 'TESCO' }, error: null })
      .mockResolvedValueOnce({ data: null, error: { message: 'Update failed' } })

    const req = makePutRequest('tx-1', { amount: -50 })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Update failed/)
  })

  it('updates category mapping when category is provided', async () => {
    const mockUpsert = vi.fn().mockResolvedValue({ data: null, error: null })

    const originalTx = { description: 'TESCO' }
    const updatedTx = { id: 'tx-1', description: 'TESCO', type: 'expense', user_id: 'user-123' }

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'transactions') {
        return {
          ...mockQuery,
          select: vi.fn().mockReturnThis(),
          update: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn()
            .mockResolvedValueOnce({ data: originalTx, error: null })
            .mockResolvedValueOnce({ data: updatedTx, error: null }),
        }
      }
      if (table === 'category_mappings') {
        return { upsert: mockUpsert }
      }
      return mockQuery
    })

    const req = makePutRequest('tx-1', { category: 'Groceries' })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(200)
    expect(mockUpsert).toHaveBeenCalled()
  })

  it('does not call category mapping upsert when no category is provided', async () => {
    const mockUpsert = vi.fn()

    mockQuery.single
      .mockResolvedValueOnce({ data: { description: 'TESCO' }, error: null })
      .mockResolvedValueOnce({ data: { id: 'tx-1', description: 'TESCO', user_id: 'user-123' }, error: null })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'category_mappings') {
        return { upsert: mockUpsert }
      }
      return mockQuery
    })

    const req = makePutRequest('tx-1', { description: 'Updated TESCO' })
    await PUT(req, makeParams('tx-1'))
    expect(mockUpsert).not.toHaveBeenCalled()
  })

  it('returns transaction with "Other" category when no category in request', async () => {
    const updatedTx = { id: 'tx-1', description: 'TESCO', user_id: 'user-123' }
    mockQuery.single
      .mockResolvedValueOnce({ data: { description: 'TESCO' }, error: null })
      .mockResolvedValueOnce({ data: updatedTx, error: null })

    const req = makePutRequest('tx-1', { description: 'Updated TESCO' })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transaction.category).toBe('Other')
  })

  it('returns 500 on unexpected error', async () => {
    mockQuery.single.mockRejectedValueOnce(new Error('DB error'))
    const req = makePutRequest('tx-1', { description: 'TESCO' })
    const res = await PUT(req, makeParams('tx-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to update transaction/)
  })
})

describe('DELETE /api/transactions/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.delete.mockReturnThis()
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeDeleteRequest('tx-1')
    const res = await DELETE(req, makeParams('tx-1'))
    expect(res.status).toBe(401)
  })

  it('deletes a transaction and returns success', async () => {
    // eq chain resolves with no error
    mockQuery.eq.mockReturnThis()
    // The delete().eq().eq() chain ultimately resolves
    const lastEq = vi.fn().mockResolvedValue({ data: null, error: null })
    mockQuery.eq.mockReturnValueOnce(mockQuery).mockReturnValueOnce({ ...mockQuery, eq: lastEq })

    // Simpler approach: just make the delete chain resolve
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      // The final awaited call
      then: undefined,
    })

    // Actually the simplest mock: from('transactions').delete().eq().eq()
    const mockDelete = { delete: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis() }
    // Chain: .delete().eq('id', id).eq('user_id', user.id) → resolves
    const eqChain = vi.fn()
      .mockReturnValueOnce({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })

    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({ eq: eqChain }),
    })

    const req = makeDeleteRequest('tx-1')
    const res = await DELETE(req, makeParams('tx-1'))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
  })

  it('returns 500 when deletion fails', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: null, error: { message: 'Delete failed' } }),
        }),
      }),
    })

    const req = makeDeleteRequest('tx-1')
    const res = await DELETE(req, makeParams('tx-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Delete failed/)
  })

  it('returns 500 on unexpected error', async () => {
    mockSupabase.from.mockReturnValue({
      delete: vi.fn().mockImplementation(() => {
        throw new Error('Unexpected DB error')
      }),
    })

    const req = makeDeleteRequest('tx-1')
    const res = await DELETE(req, makeParams('tx-1'))
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to delete transaction/)
  })
})
