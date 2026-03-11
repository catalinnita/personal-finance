import { SupabaseClient } from '@supabase/supabase-js'

const BATCH_SIZE = 1000

export async function fetchAllRows<T>(
  supabase: SupabaseClient,
  table: string,
  select: string,
  filters: { column: string; value: string }[],
  orderBy?: { column: string; ascending?: boolean }
): Promise<T[]> {
  const allData: T[] = []
  let from = 0

  while (true) {
    let query = supabase.from(table).select(select)
    
    filters.forEach(f => {
      query = query.eq(f.column, f.value)
    })
    
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true })
    }
    
    const { data: batch, error } = await query.range(from, from + BATCH_SIZE - 1)

    if (error) {
      throw error
    }

    if (!batch || batch.length === 0) break

    allData.push(...(batch as T[]))

    if (batch.length < BATCH_SIZE) break
    from += BATCH_SIZE
  }

  return allData
}
