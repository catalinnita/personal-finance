import { describe, it, expect, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

// ─── Anthropic mock ─────────────────────────────────────────────
// vi.hoisted runs before module imports/mocks, so the ref is available in all factory closures
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
  batchMatchDescriptions: vi.fn().mockResolvedValue({ matched: [], needsAI: ['TESCO', 'NETFLIX'] }),
}))

// ─── logClaudeUsage mock ──────────────────────────────────────────────────────
vi.mock('@/lib/claude-usage', () => ({
  logClaudeUsage: vi.fn().mockResolvedValue(undefined),
}))

import { POST } from './route'
import { batchMatchDescriptions } from '@/lib/mapping-utils'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function makeTextResponse(text: string) {
  return {
    model: 'claude-sonnet-4-6',
    usage: { input_tokens: 100, output_tokens: 200 },
    content: [{ type: 'text', text }],
  }
}

function makeFormRequest(fields: Record<string, File>): NextRequest {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) {
    formData.append(key, value)
  }
  return new NextRequest('http://localhost/api/parse-statement', {
    method: 'POST',
    body: formData,
  })
}

function makeTextFile(content: string, name = 'statement.txt', type = 'text/plain'): File {
  return new File([content], name, { type })
}

const validTransactions = JSON.stringify([
  { date: '2024-01-15', amount: -45, description: 'TESCO', type: 'expense' },
  { date: '2024-01-16', amount: -12, description: 'NETFLIX', type: 'expense' },
])

const validCategorizeResponse = JSON.stringify([
  { description: 'TESCO', category: 'Groceries' },
  { description: 'NETFLIX', category: 'Subscriptions' },
])

describe('POST /api/parse-statement', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSupabase.from.mockReturnValue(mockQuery)
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: mockUser }, error: null })
    mockQuery.eq.mockReturnThis()
    mockQuery.select.mockReturnThis()
    mockQuery.range.mockResolvedValue({ data: [], error: null })
    mockQuery.single.mockResolvedValue({ data: null, error: null })
    mockQuery.insert.mockReturnThis()
    // Default: needsAI for both descriptions
    vi.mocked(batchMatchDescriptions).mockResolvedValue({
      matched: [],
      needsAI: ['TESCO', 'NETFLIX'],
    })
  })

  it('returns 401 when unauthenticated', async () => {
    mockSupabase.auth.getUser.mockResolvedValue({ data: { user: null }, error: null })
    const req = makeFormRequest({ file: makeTextFile('dummy') })
    const res = await POST(req)
    expect(res.status).toBe(401)
  })

  it('returns 400 when no file is provided', async () => {
    const formData = new FormData()
    const req = new NextRequest('http://localhost/api/parse-statement', {
      method: 'POST',
      body: formData,
    })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No file provided/)
  })

  it('returns 400 when no transactions found in statement', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('[]'))
    const req = makeFormRequest({ file: makeTextFile('no transactions here') })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const body = await res.json()
    expect(body.error).toMatch(/No transactions found/)
  })

  it('returns 500 when Claude response contains no JSON', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('No valid data here'))
    const req = makeFormRequest({ file: makeTextFile('statement content') })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to parse transactions/)
  })

  it('successfully parses a text statement and categorizes with AI', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validCategorizeResponse))

    const req = makeFormRequest({ file: makeTextFile('bank statement text') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions).toHaveLength(2)
    expect(body.matchStats).toBeDefined()
    expect(body.matchStats.total).toBe(2)
  })

  it('calls Anthropic twice: once to parse, once to categorize', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validCategorizeResponse))

    const req = makeFormRequest({ file: makeTextFile('bank statement content') })
    await POST(req)

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
  })

  it('skips AI categorize call when all descriptions are pre-matched', async () => {
    vi.mocked(batchMatchDescriptions).mockResolvedValueOnce({
      matched: [
        { description: 'TESCO', category: 'Groceries', category_id: 'c-1', matchType: 'exact' },
        { description: 'NETFLIX', category: 'Subscriptions', category_id: 'c-2', matchType: 'exact' },
      ],
      needsAI: [],
    })

    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))

    const req = makeFormRequest({ file: makeTextFile('bank statement content') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    // Only one Anthropic call (parse only, not categorize)
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
  })

  it('assigns "Other" category when AI result is missing for a description', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    // AI only returns Groceries for TESCO; NETFLIX gets no match
    mockMessagesCreate.mockResolvedValueOnce(
      makeTextResponse(JSON.stringify([{ description: 'TESCO', category: 'Groceries' }]))
    )

    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    const netflix = body.transactions.find((t: { description: string }) => t.description === 'NETFLIX')
    expect(netflix?.category).toBe('Other')
  })

  it('accepts JSON in a code block from Claude', async () => {
    const codeBlock = '```json\n' + validTransactions + '\n```'
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(codeBlock))
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validCategorizeResponse))

    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.transactions).toHaveLength(2)
  })

  it('sends base64 document block for PDF files', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validCategorizeResponse))

    const pdfFile = new File(['%PDF fake content'], 'statement.pdf', { type: 'application/pdf' })
    const req = makeFormRequest({ file: pdfFile })
    const res = await POST(req)
    expect(res.status).toBe(200)

    // The first Anthropic call should use a document block for PDF
    const firstCall = mockMessagesCreate.mock.calls[0][0]
    const userContent = firstCall.messages[0].content
    expect(Array.isArray(userContent)).toBe(true)
    const docBlock = userContent.find((c: { type: string }) => c.type === 'document')
    expect(docBlock).toBeDefined()
    expect(docBlock.source.type).toBe('base64')
  })

  it('returns 500 on unexpected Anthropic error', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('Anthropic API error'))
    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toContain('Anthropic API error')
  })

  it('returns newCategories array in the response', async () => {
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    mockMessagesCreate.mockResolvedValueOnce(
      makeTextResponse(JSON.stringify([
        { description: 'TESCO', category: 'Groceries' },
        { description: 'NETFLIX', category: 'Entertainment' },
      ]))
    )

    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.newCategories).toBeDefined()
    expect(Array.isArray(body.newCategories)).toBe(true)
  })

  it('returns 500 when Claude response JSON cannot be parsed (lines 183-185)', async () => {
    // Return a response that matches \[[\s\S]*\] but after truncation-recovery produces invalid JSON
    // A string like "[INVALID" matches the regex but JSON.parse would fail... however
    // the code checks for "]" at end. Use a string that ends with "]" but is not valid JSON.
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('[{broken:json}]'))
    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    expect(res.status).toBe(500)
    const body = await res.json()
    expect(body.error).toMatch(/Failed to parse transaction data/)
  })

  it('handles invalid JSON in AI categorization response (line 253)', async () => {
    // Parse step returns valid transactions, categorize step returns invalid JSON inside brackets
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    // Return something that matches the JSON regex but is not parseable JSON
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse('[{invalid json here}]'))

    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    // Should still return 200; categorization failure is non-fatal
    expect(res.status).toBe(200)
  })

  it('logs error when category insert fails after parsing (line 297)', async () => {
    // Make categories API return empty (no existing cats)
    // So new categories need to be inserted, but insert fails
    mockMessagesCreate.mockResolvedValueOnce(makeTextResponse(validTransactions))
    mockMessagesCreate.mockResolvedValueOnce(
      makeTextResponse(JSON.stringify([
        { description: 'TESCO', category: 'NewCat1' },
        { description: 'NETFLIX', category: 'NewCat2' },
      ]))
    )

    const mockInsert = vi.fn().mockReturnThis()
    const mockInsertSelect = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'Insert error' },
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

    const req = makeFormRequest({ file: makeTextFile('statement') })
    const res = await POST(req)
    // Should still return 200; insert error is logged but non-fatal
    expect(res.status).toBe(200)
  })
})
