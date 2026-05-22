import { describe, it, expect, vi, beforeEach } from 'vitest'
import { fetchAllRows } from './paginate'
import type { SupabaseClient } from '@supabase/supabase-js'

function buildRangeChain(batches: unknown[][]) {
  let callCount = 0
  const rangeMock = vi.fn(() => {
    const batch = batches[callCount] ?? []
    callCount++
    return Promise.resolve({ data: batch, error: null })
  })
  const chain = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    range: rangeMock,
  }
  return { chain, rangeMock }
}

describe('fetchAllRows', () => {
  it('returns all rows when they fit in a single batch', async () => {
    const rows = [{ id: '1' }, { id: '2' }]
    const { chain } = buildRangeChain([rows])
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient

    const result = await fetchAllRows(supabase, 'transactions', '*', [{ column: 'user_id', value: 'u1' }])
    expect(result).toEqual(rows)
  })

  it('paginates when there are more than 1000 rows', async () => {
    const batch1 = Array.from({ length: 1000 }, (_, i) => ({ id: String(i) }))
    const batch2 = [{ id: '1000' }, { id: '1001' }]
    const { chain } = buildRangeChain([batch1, batch2])
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient

    const result = await fetchAllRows(supabase, 'transactions', '*', [{ column: 'user_id', value: 'u1' }])
    expect(result).toHaveLength(1002)
  })

  it('returns an empty array when no rows exist', async () => {
    const { chain } = buildRangeChain([[]])
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient

    const result = await fetchAllRows(supabase, 'transactions', '*', [{ column: 'user_id', value: 'u1' }])
    expect(result).toEqual([])
  })

  it('applies all filters via .eq()', async () => {
    const rows = [{ id: '1' }]
    const { chain } = buildRangeChain([rows])
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient

    await fetchAllRows(supabase, 'transactions', '*', [
      { column: 'user_id', value: 'u1' },
      { column: 'type', value: 'expense' },
    ])
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(chain.eq).toHaveBeenCalledWith('type', 'expense')
  })

  it('applies orderBy when provided', async () => {
    const { chain } = buildRangeChain([[]])
    const supabase = { from: vi.fn(() => chain) } as unknown as SupabaseClient

    await fetchAllRows(supabase, 'transactions', '*', [], { column: 'date', ascending: false })
    expect(chain.order).toHaveBeenCalledWith('date', { ascending: false })
  })

  it('throws when the database returns an error', async () => {
    const errorChain = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: null, error: { message: 'DB failure' } }),
    }
    const supabase = { from: vi.fn(() => errorChain) } as unknown as SupabaseClient

    await expect(fetchAllRows(supabase, 'transactions', '*', [])).rejects.toMatchObject({ message: 'DB failure' })
  })
})
