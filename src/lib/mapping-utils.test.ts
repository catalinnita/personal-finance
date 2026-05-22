import { describe, it, expect, vi } from 'vitest'
import { extractKeyWord, findExactMatch, findFuzzyMatch, batchMatchDescriptions } from './mapping-utils'
import type { SupabaseClient } from '@supabase/supabase-js'

// ── Helpers to build a lightweight Supabase query-chain mock ──────────────────
function buildQueryChain(result: { data: unknown; error: unknown }) {
  const chain: Record<string, unknown> = {}
  const fn = () => chain
  chain.from = fn
  chain.select = fn
  chain.eq = fn
  chain.ilike = fn
  chain.limit = fn
  chain.single = vi.fn().mockResolvedValue(result)
  return chain
}

function makeSupabase(result: { data: unknown; error: unknown }) {
  const chain = buildQueryChain(result)
  return {
    from: vi.fn(() => chain),
    _chain: chain,
  } as unknown as SupabaseClient & { _chain: Record<string, unknown> }
}

// ── extractKeyWord ─────────────────────────────────────────────────────────────

describe('extractKeyWord', () => {
  it('returns the first meaningful word from a description', () => {
    expect(extractKeyWord('NETFLIX SUBSCRIPTION')).toBe('netflix')
  })

  it('ignores stop words', () => {
    // "payment" and "for" are stop words, "netflix" is not
    expect(extractKeyWord('PAYMENT FOR NETFLIX')).toBe('netflix')
  })

  it('ignores pure numbers', () => {
    expect(extractKeyWord('12345 TESCO STORE')).toBe('tesco')
  })

  it('ignores words shorter than 3 characters', () => {
    // "to" is 2 chars → skip; "amazon" is meaningful
    expect(extractKeyWord('TO AMAZON UK')).toBe('amazon')
  })

  it('returns null when all words are stop words or short', () => {
    expect(extractKeyWord('POS DD SO')).toBeNull()
  })

  it('returns null for an empty string', () => {
    expect(extractKeyWord('')).toBeNull()
  })

  it('is case-insensitive', () => {
    expect(extractKeyWord('Spotify Premium')).toBe('spotify')
  })

  it('strips special characters before processing', () => {
    expect(extractKeyWord('AMAZON.COM/BILL')).toBe('amazon')
  })
})

// ── findExactMatch ─────────────────────────────────────────────────────────────

describe('findExactMatch', () => {
  it('returns a mapping when an exact match is found', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'NETFLIX', category_id: 'cat-1', categories: { name: 'Subscriptions' } },
      error: null,
    })
    const result = await findExactMatch(supabase, 'user-1', 'NETFLIX')
    expect(result).not.toBeNull()
    expect(result?.category_id).toBe('cat-1')
    expect(result?.category_name).toBe('Subscriptions')
  })

  it('returns null when no exact match is found', async () => {
    const supabase = makeSupabase({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
    const result = await findExactMatch(supabase, 'user-1', 'UNKNOWN')
    expect(result).toBeNull()
  })

  it('returns null when data has no category_id', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'FOO', category_id: null, categories: null },
      error: null,
    })
    const result = await findExactMatch(supabase, 'user-1', 'FOO')
    expect(result).toBeNull()
  })

  it('handles null categories gracefully (empty category_name)', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'BAR', category_id: 'cat-2', categories: null },
      error: null,
    })
    const result = await findExactMatch(supabase, 'user-1', 'BAR')
    expect(result?.category_name).toBe('')
  })
})

// ── findFuzzyMatch ─────────────────────────────────────────────────────────────

describe('findFuzzyMatch', () => {
  it('returns a mapping when a fuzzy match is found', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'TESCO SUPERSTORE', category_id: 'cat-2', categories: { name: 'Groceries' } },
      error: null,
    })
    const result = await findFuzzyMatch(supabase, 'user-1', 'TESCO EXPRESS')
    expect(result).not.toBeNull()
    expect(result?.category_name).toBe('Groceries')
  })

  it('returns null when description has no key word (all stop words)', async () => {
    const supabase = makeSupabase({ data: null, error: null })
    const result = await findFuzzyMatch(supabase, 'user-1', 'POS DD SO')
    expect(result).toBeNull()
  })

  it('returns null when no fuzzy match is found in database', async () => {
    const supabase = makeSupabase({ data: null, error: { code: 'PGRST116', message: 'No rows' } })
    const result = await findFuzzyMatch(supabase, 'user-1', 'SPOTIFY PREMIUM')
    expect(result).toBeNull()
  })

  it('returns null when data has no category_id', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'AMAZON', category_id: null, categories: null },
      error: null,
    })
    const result = await findFuzzyMatch(supabase, 'user-1', 'AMAZON PRIME')
    expect(result).toBeNull()
  })

  it('handles null categories gracefully (empty category_name)', async () => {
    const supabase = makeSupabase({
      data: { description_pattern: 'AMAZON', category_id: 'cat-3', categories: null },
      error: null,
    })
    const result = await findFuzzyMatch(supabase, 'user-1', 'AMAZON UK')
    expect(result?.category_name).toBe('')
  })
})

// ── batchMatchDescriptions ─────────────────────────────────────────────────────

describe('batchMatchDescriptions', () => {
  const mockSupabase = {} as Parameters<typeof batchMatchDescriptions>[0]

  const existingMappings = [
    { description_pattern: 'NETFLIX', category_id: 'cat-1', category_name: 'Subscriptions' },
    { description_pattern: 'TESCO SUPERSTORE', category_id: 'cat-2', category_name: 'Groceries' },
    { description_pattern: 'AMAZON PRIME', category_id: 'cat-3', category_name: 'Subscriptions' },
  ]

  it('resolves exact matches case-insensitively', async () => {
    const { matched, needsAI } = await batchMatchDescriptions(
      mockSupabase,
      'user-1',
      ['netflix', 'NETFLIX'],
      existingMappings
    )
    expect(matched).toHaveLength(2)
    expect(matched[0].matchType).toBe('exact')
    expect(matched[0].category).toBe('Subscriptions')
    expect(needsAI).toHaveLength(0)
  })

  it('resolves fuzzy matches by key word', async () => {
    // "TESCO EXPRESS" should fuzzy-match to "TESCO SUPERSTORE" via keyword "tesco"
    const { matched, needsAI } = await batchMatchDescriptions(
      mockSupabase,
      'user-1',
      ['TESCO EXPRESS'],
      existingMappings
    )
    expect(matched).toHaveLength(1)
    expect(matched[0].matchType).toBe('fuzzy')
    expect(matched[0].category).toBe('Groceries')
    expect(needsAI).toHaveLength(0)
  })

  it('puts unmatched descriptions in needsAI', async () => {
    const { matched, needsAI } = await batchMatchDescriptions(
      mockSupabase,
      'user-1',
      ['VET CLINIC INVOICE'],
      existingMappings
    )
    expect(matched).toHaveLength(0)
    expect(needsAI).toContain('VET CLINIC INVOICE')
  })

  it('handles a mix of exact, fuzzy, and unmatched descriptions', async () => {
    const { matched, needsAI } = await batchMatchDescriptions(
      mockSupabase,
      'user-1',
      ['NETFLIX', 'TESCO EXPRESS', 'UNKNOWN VENDOR XYZ'],
      existingMappings
    )
    expect(matched).toHaveLength(2)
    expect(needsAI).toHaveLength(1)
    expect(needsAI[0]).toBe('UNKNOWN VENDOR XYZ')
  })

  it('returns empty results for an empty descriptions array', async () => {
    const { matched, needsAI } = await batchMatchDescriptions(mockSupabase, 'user-1', [], existingMappings)
    expect(matched).toHaveLength(0)
    expect(needsAI).toHaveLength(0)
  })
})
