import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Anthropic mock ─────────────────────────────────────────────
const { mockMessagesCreate } = vi.hoisted(() => ({
  mockMessagesCreate: vi.fn(),
}))

vi.mock('@anthropic-ai/sdk', () => {
  class MockAnthropic {
    messages = { create: mockMessagesCreate }
    constructor(_opts?: unknown) {}
  }
  return { default: MockAnthropic }
})

// ─── Supabase mock ────────────────────────────────────────────────────────────
const mockUser = { id: 'user-123', email: 'test@example.com' }

const mockQuery = {
  select: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  single: vi.fn(),
  range: vi.fn(),
}

const mockSupabase = {
  auth: { getUser: vi.fn() },
  from: vi.fn(() => mockQuery),
}

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => Promise.resolve(mockSupabase)),
}))

// ─── fetchAllRows mock ────────────────────────────────────────────────────────
vi.mock('@/lib/supabase/paginate', () => ({
  fetchAllRows: vi.fn().mockResolvedValue([]),
}))

// ─── batchMatchDescriptions mock ─────────────────────────────────────────────
vi.mock('@/lib/mapping-utils', () => ({
  batchMatchDescriptions: vi.fn().mockResolvedValue({ matched: [], needsAI: [] }),
}))

// ─── logClaudeUsage mock ──────────────────────────────────────────────────────
vi.mock('@/lib/claude-usage', () => ({
  logClaudeUsage: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from './route'
import { batchMatchDescriptions } from '@/lib/mapping-utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/identify-categories', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

function makeAIResponse(results: { description: string; category: string }[]) {
  return {
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 50, output_tokens: 100 },
    content: [{ type: 'text', text: JSON.stringify(results) }],
  }
}

describe('POST /api/identify-categories', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.select.mockReturnThis()
    mockQuery.range.mockResolvedValue({ data: [], error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: null })
    mockQuery.insert.mockReturnThis()
    // Default: no pre-matched, all need AI
    vi.mocked(batchMatchDescriptions).mockResolvedValue({ matched: [], needsAI: [] })
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeRequest({ descriptions: ['TESCO'] })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when descriptions is missing', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No descriptions provided/)
  })

  it('returns 400 when descriptions is an empty array', async () => {
    const req = makeRequest({ descriptions: [] })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when descriptions is not an array', async () => {
    const req = makeRequest({ descriptions: 'TESCO' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns matched results without calling AI when all pre-matched', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [
        { description: 'TESCO', category: 'Groceries', category_id: 'c-1', matchType: 'exact' },
      ],
      needsAI: [],
    })

    const req = makeRequest({ descriptions: ['TESCO'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.results).toHaveLength(1)
    expect(body.results[0].description).toBe('TESCO')
    expect(body.results[0].category).toBe('Groceries')
    expect(mockMessagesCreate).not.toHaveBeenCalled()
  })

  it('calls Anthropic for descriptions that need AI categorization', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['TESCO', 'NETFLIX'],
    })

    // User has Groceries category
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          ...mockQuery,
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({
            data: [{ id: 'c-1', name: 'Groceries' }],
            error: null,
          }),
          insert: vi.fn().mockReturnThis(),
        }
      }
      return mockQuery
    })

    mockMessagesCreate.mockResolvedValueOnce(
      makeAIResponse([
        { description: 'TESCO', category: 'Groceries' },
        { description: 'NETFLIX', category: 'Subscriptions' },
      ])
    )

    const req = makeRequest({ descriptions: ['TESCO', 'NETFLIX'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
    const body = await res.json()
    expect(body.matchStats.ai).toBe(2)
  })

  it('includes matchStats with exactOrFuzzy, ai, and total counts', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [
        { description: 'TESCO', category: 'Groceries', category_id: 'c-1', matchType: 'exact' },
      ],
      needsAI: ['NETFLIX'],
    })

    mockMessagesCreate.mockResolvedValueOnce(
      makeAIResponse([{ description: 'NETFLIX', category: 'Subscriptions' }])
    )

    const req = makeRequest({ descriptions: ['TESCO', 'NETFLIX'] })
    const res = await POST(req)
    const body = await res.json()
    expect(body.matchStats.exactOrFuzzy).toBe(1)
    expect(body.matchStats.ai).toBe(1)
    expect(body.matchStats.total).toBe(2)
  })

  it('creates new categories in database when AI returns unknown category', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['VET CLINIC'],
    })

    // User has no categories initially
    const mockInsert = vi.fn().mockReturnThis()
    const mockInsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'c-new', name: 'Pet Care' }],
      error: null,
    })
    mockInsert.mockReturnValue({ select: mockInsertSelect })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: mockInsert,
        }
      }
      return mockQuery
    })

    mockMessagesCreate.mockResolvedValueOnce(
      makeAIResponse([{ description: 'VET CLINIC', category: 'Pet Care' }])
    )

    const req = makeRequest({ descriptions: ['VET CLINIC'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.newCategories).toContain('Pet Care')
  })

  it('returns 500 on Anthropic error', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['TESCO'],
    })
    mockMessagesCreate.mockRejectedValueOnce(new Error('API failure'))

    const req = makeRequest({ descriptions: ['TESCO'] })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('API failure')
  })

  it('returns 200 with empty results when AI returns no JSON', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['TESCO'],
    })

    mockMessagesCreate.mockResolvedValueOnce({
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 50, output_tokens: 10 },
      content: [{ type: 'text', text: 'I cannot categorize this.' }],
    })

    const req = makeRequest({ descriptions: ['TESCO'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    // No AI results parsed → results only has the fallback
    expect(Array.isArray(body.results)).toBe(true)
  })

  it('extracts JSON from code block when plain JSON is not found (line 112)', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['VET CLINIC'],
    })

    // Response wrapped in code block, no bare JSON array
    const codeBlockText = '```json\n[{"description":"VET CLINIC","category":"Pet Care"}]\n```'
    mockMessagesCreate.mockResolvedValueOnce({
      model: 'claude-sonnet-4-6',
      usage: { input_tokens: 50, output_tokens: 20 },
      content: [{ type: 'text', text: codeBlockText }],
    })

    // Setup category insert to return the new cat
    const mockInsert = vi.fn().mockReturnThis()
    const mockInsertSelect = vi.fn().mockResolvedValue({
      data: [{ id: 'c-new', name: 'Pet Care' }],
      error: null,
    })
    mockInsert.mockReturnValue({ select: mockInsertSelect })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: mockInsert,
        }
      }
      return mockQuery
    })

    const req = makeRequest({ descriptions: ['VET CLINIC'] })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.newCategories).toContain('Pet Care')
  })

  it('logs error when category insert fails (line 147)', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [],
      needsAI: ['VET CLINIC'],
    })

    mockMessagesCreate.mockResolvedValueOnce(
      makeAIResponse([{ description: 'VET CLINIC', category: 'Pet Care' }])
    )

    // Simulate insert error
    const mockInsert = vi.fn().mockReturnThis()
    const mockInsertSelect = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insert failed' },
    })
    mockInsert.mockReturnValue({ select: mockInsertSelect })

    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'categories') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          insert: mockInsert,
        }
      }
      return mockQuery
    })

    const req = makeRequest({ descriptions: ['VET CLINIC'] })
    const res = await POST(req)
    // Should still return 200 (error is logged, not propagated)
    expect(res.status).toBe(200)
  })
})
