import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const mockUser = { id: 'user-123' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
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

import { GET, PUT } from './route'

function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/settings', {
    method: 'PUT',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('GET /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const res = await GET()
    expect(res.status).toBe(401)
  })

  it('returns default settings when no settings row exists (PGRST116 error)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'No rows' } })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.currency).toBe('USD')
    expect(body.currencies).toBeDefined()
  })

  it('returns user settings when they exist', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const settings = { user_id: 'user-123', currency: 'EUR', highlight_threshold: 200, moving_average_period: 3 }
    mockQuery.single.mockResolvedValue({ data: settings, error: null })

    const res = await GET()
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.currency).toBe('EUR')
  })

  it('includes the currencies list in the response', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { code: 'PGRST116', message: 'Not found' } })

    const res = await GET()
    const body = await res.json()
    expect(Array.isArray(body.currencies)).toBe(true)
    expect(body.currencies.some((c: { code: string }) => c.code === 'EUR')).toBe(true)
  })

  it('returns 500 when non-PGRST116 DB error occurs (line 44-46)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { code: 'OTHER_ERROR', message: 'DB failure' } })

    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/DB failure/)
  })

  it('returns 500 on unexpected error (GET)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const res = await GET()
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to fetch settings/)
  })
})

describe('PUT /api/settings', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest({ currency: 'EUR' })
    const res = await PUT(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 for an invalid currency code', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest({ currency: 'XYZ' })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/Invalid currency/)
  })

  it('returns 400 when highlight_threshold is negative', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest({ highlight_threshold: -1 })
    const res = await PUT(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when moving_average_period is out of range', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const req = makeRequest({ moving_average_period: 100 })
    const res = await PUT(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/between 1 and 24/)
  })

  it('upserts and returns settings', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    const saved = { user_id: 'user-123', currency: 'GBP', highlight_threshold: 300, moving_average_period: 6 }
    mockQuery.single.mockResolvedValue({ data: saved, error: null })

    const req = makeRequest({ currency: 'GBP', highlight_threshold: 300, moving_average_period: 6 })
    const res = await PUT(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.settings.currency).toBe('GBP')
  })

  it('returns 500 when upsert returns a database error (line 95)', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: { message: 'Upsert failed' } })

    const req = makeRequest({ currency: 'GBP', highlight_threshold: 100, moving_average_period: 3 })
    const res = await PUT(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Upsert failed/)
  })

  it('returns 500 on unexpected error (PUT, lines 100-101)', async () => {
    mockSupabase.auth.getUser.mockRejectedValueOnce(new Error('Unexpected'))
    const req = makeRequest({ currency: 'GBP' })
    const res = await PUT(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to update settings/)
  })
})
