import { vi } from 'vitest'

/**
 * Creates a chainable Supabase query builder mock.
 * Each method returns `this` so chains like .select().eq().single() work.
 * The final resolution is controlled by `resolvedValue`.
 */
export function createSupabaseQueryMock(resolvedValue: { data?: unknown; error?: { message: string; code?: string } | null }) {
  const query = {
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    upsert: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    ilike: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    range: vi.fn().mockResolvedValue(resolvedValue),
    single: vi.fn().mockResolvedValue(resolvedValue),
    maybeSingle: vi.fn().mockResolvedValue(resolvedValue),
    then: undefined as unknown,
  }
  // Make the object itself thenable (resolves when awaited directly)
  query.then = undefined
  // Allow `await query` to resolve
  Object.defineProperty(query, Symbol.toStringTag, { value: 'Promise' })

  // Override range/single with the resolved value
  query.range = vi.fn().mockResolvedValue(resolvedValue)
  query.single = vi.fn().mockResolvedValue(resolvedValue)
  query.maybeSingle = vi.fn().mockResolvedValue(resolvedValue)

  return query
}

/**
 * Creates a mock Supabase client with a spy on .from().
 * Pass a map of table name -> resolved value to control responses.
 */
export function createSupabaseClientMock(
  tableResponses: Record<string, { data?: unknown; error?: { message: string; code?: string } | null }> = {}
) {
  const mockUser = { id: 'user-123', email: 'test@example.com' }

  const client = {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: mockUser }, error: null }),
      exchangeCodeForSession: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
    from: vi.fn((table: string) => {
      const response = tableResponses[table] ?? { data: null, error: null }
      return createSupabaseQueryMock(response)
    }),
  }

  return { client, mockUser }
}

export function createUserMock(overrides: Partial<{ id: string; email: string }> = {}) {
  return {
    id: 'user-123',
    email: 'test@example.com',
    ...overrides,
  }
}
