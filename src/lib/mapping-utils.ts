import { SupabaseClient } from '@supabase/supabase-js'

// Common stop words to remove from descriptions
const STOP_WORDS = new Set([
  'payment', 'transaction', 'transfer', 'purchase', 'debit', 'credit',
  'card', 'pos', 'atm', 'ref', 'reference', 'txn', 'trx', 'fee', 'charge',
  'online', 'mobile', 'bank', 'banking', 'account', 'direct', 'standing',
  'order', 'mandate', 'dd', 'so', 'ft', 'trf', 'pmt', 'pymt', 'chq', 'cheque',
  'the', 'a', 'an', 'and', 'or', 'of', 'to', 'for', 'in', 'on', 'at', 'by',
  'from', 'with', 'ltd', 'limited', 'inc', 'corp', 'plc', 'co', 'uk', 'gb',
])

type MappingResult = {
  description: string
  category: string | null
  category_id: string | null
  matchType: 'exact' | 'fuzzy' | 'ai' | 'none'
}

type ExistingMapping = {
  description_pattern: string
  category_id: string
  category_name: string
}

/**
 * Extract the key word from a description by removing stop words and short words
 */
export function extractKeyWord(description: string): string | null {
  const words = description
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(word => 
      word.length > 2 && 
      !STOP_WORDS.has(word) &&
      !/^\d+$/.test(word) // exclude pure numbers
    )
  
  return words.length > 0 ? words[0] : null
}

/**
 * Step 1: Find exact match for description
 */
export async function findExactMatch(
  supabase: SupabaseClient,
  userId: string,
  description: string
): Promise<ExistingMapping | null> {
  const { data } = await supabase
    .from('category_mappings')
    .select('description_pattern, category_id, categories (name)')
    .eq('user_id', userId)
    .ilike('description_pattern', description)
    .limit(1)
    .single()
  
  if (data && data.category_id) {
    return {
      description_pattern: data.description_pattern,
      category_id: data.category_id,
      category_name: (data.categories as unknown as { name: string } | null)?.name || ''
    }
  }
  return null
}

/**
 * Step 2: Find fuzzy match using LIKE on key word
 */
export async function findFuzzyMatch(
  supabase: SupabaseClient,
  userId: string,
  description: string
): Promise<ExistingMapping | null> {
  const keyWord = extractKeyWord(description)
  if (!keyWord) return null
  
  const { data } = await supabase
    .from('category_mappings')
    .select('description_pattern, category_id, categories (name)')
    .eq('user_id', userId)
    .ilike('description_pattern', `%${keyWord}%`)
    .limit(1)
    .single()
  
  if (data && data.category_id) {
    return {
      description_pattern: data.description_pattern,
      category_id: data.category_id,
      category_name: (data.categories as unknown as { name: string } | null)?.name || ''
    }
  }
  return null
}

/**
 * Batch process descriptions with 3-step matching
 * Returns descriptions that need AI categorization
 */
export async function batchMatchDescriptions(
  supabase: SupabaseClient,
  userId: string,
  descriptions: string[],
  existingMappings: ExistingMapping[]
): Promise<{
  matched: MappingResult[]
  needsAI: string[]
}> {
  const matched: MappingResult[] = []
  const needsAI: string[] = []
  
  // Build lookup maps for faster matching
  const exactMap = new Map<string, ExistingMapping>()
  const fuzzyMap = new Map<string, ExistingMapping>()
  
  for (const mapping of existingMappings) {
    // Exact match map (case-insensitive)
    exactMap.set(mapping.description_pattern.toLowerCase(), mapping)
    
    // Fuzzy match map - extract key word from existing patterns
    const keyWord = extractKeyWord(mapping.description_pattern)
    if (keyWord && !fuzzyMap.has(keyWord)) {
      fuzzyMap.set(keyWord, mapping)
    }
  }
  
  for (const description of descriptions) {
    // Step 1: Exact match
    const exactMatch = exactMap.get(description.toLowerCase())
    if (exactMatch) {
      matched.push({
        description,
        category: exactMatch.category_name,
        category_id: exactMatch.category_id,
        matchType: 'exact'
      })
      continue
    }
    
    // Step 2: Fuzzy match using key word
    const keyWord = extractKeyWord(description)
    if (keyWord) {
      const fuzzyMatch = fuzzyMap.get(keyWord)
      if (fuzzyMatch) {
        matched.push({
          description,
          category: fuzzyMatch.category_name,
          category_id: fuzzyMatch.category_id,
          matchType: 'fuzzy'
        })
        continue
      }
    }
    
    // Step 3: Needs AI
    needsAI.push(description)
  }
  
  return { matched, needsAI }
}
