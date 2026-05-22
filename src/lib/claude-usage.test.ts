import { describe, it, expect, vi, beforeEach } from 'vitest'
import { calculateCost, logClaudeUsage } from './claude-usage'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── calculateCost ──────────────────────────────────────────────────────────────

describe('calculateCost', () => {
  it('calculates cost correctly for a known model', () => {
    // claude-3-5-sonnet: $3.00/1M input, $15.00/1M output
    // 1_000_000 input tokens = $3.00, 1_000_000 output tokens = $15.00 → total $18.00
    expect(calculateCost('claude-3-5-sonnet-20241022', 1_000_000, 1_000_000)).toBeCloseTo(18.0)
  })

  it('calculates cost correctly for haiku', () => {
    // claude-3-haiku: $0.25/1M input, $1.25/1M output
    expect(calculateCost('claude-3-haiku-20240307', 1_000_000, 1_000_000)).toBeCloseTo(1.5)
  })

  it('calculates cost correctly for opus', () => {
    // claude-3-opus: $15.00/1M input, $75.00/1M output
    expect(calculateCost('claude-3-opus-20240229', 1_000_000, 1_000_000)).toBeCloseTo(90.0)
  })

  it('returns a small cost for small token counts', () => {
    // 1000 input + 500 output with sonnet pricing = $0.003 + $0.0075 = $0.0105
    const cost = calculateCost('claude-3-5-sonnet-20241022', 1000, 500)
    expect(cost).toBeGreaterThan(0)
    expect(cost).toBeLessThan(1)
  })

  it('falls back to sonnet pricing for unknown models', () => {
    const knownCost = calculateCost('claude-3-5-sonnet-20241022', 500_000, 500_000)
    const fallbackCost = calculateCost('unknown-model-xyz', 500_000, 500_000)
    expect(fallbackCost).toBeCloseTo(knownCost)
  })

  it('returns 0 for zero tokens', () => {
    expect(calculateCost('claude-3-5-sonnet-20241022', 0, 0)).toBe(0)
  })
})

// ── logClaudeUsage ─────────────────────────────────────────────────────────────

describe('logClaudeUsage', () => {
  const buildMockSupabase = (insertResult: { data?: unknown; error?: { message: string } | null }) => {
    const insertFn = vi.fn().mockResolvedValue(insertResult)
    const fromFn = vi.fn(() => ({ insert: insertFn }))
    return { supabase: { from: fromFn } as unknown as SupabaseClient, insertFn, fromFn }
  }

  it('inserts a usage record into claude_usage table', async () => {
    const { supabase, fromFn, insertFn } = buildMockSupabase({ data: {}, error: null })
    await logClaudeUsage(supabase, 'user-1', 'parse-statement', 'claude-3-5-sonnet-20241022', 1000, 500)
    expect(fromFn).toHaveBeenCalledWith('claude_usage')
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-1',
        action: 'parse-statement',
        model: 'claude-3-5-sonnet-20241022',
        input_tokens: 1000,
        output_tokens: 500,
      })
    )
  })

  it('includes a computed cost_usd in the insert payload', async () => {
    const { supabase, insertFn } = buildMockSupabase({ data: {}, error: null })
    await logClaudeUsage(supabase, 'user-1', 'test', 'claude-3-5-sonnet-20241022', 1_000_000, 0)
    const payload = insertFn.mock.calls[0][0]
    expect(payload.cost_usd).toBeCloseTo(3.0)
  })

  it('includes optional metadata when provided', async () => {
    const { supabase, insertFn } = buildMockSupabase({ data: {}, error: null })
    await logClaudeUsage(supabase, 'user-1', 'test', 'claude-3-haiku-20240307', 100, 50, { file_name: 'bank.pdf' })
    const payload = insertFn.mock.calls[0][0]
    expect(payload.metadata).toEqual({ file_name: 'bank.pdf' })
  })

  it('does not throw when the insert fails', async () => {
    const { supabase } = buildMockSupabase({ data: null, error: { message: 'DB error' } })
    await expect(
      logClaudeUsage(supabase, 'user-1', 'test', 'claude-3-5-sonnet-20241022', 100, 50)
    ).resolves.toBeUndefined()
  })
})
