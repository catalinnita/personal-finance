import { SupabaseClient } from '@supabase/supabase-js'

// Claude pricing per 1M tokens (as of 2024)
const CLAUDE_PRICING = {
  'claude-sonnet-4-20250514': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20241022': { input: 3.00, output: 15.00 },
  'claude-3-5-sonnet-20240620': { input: 3.00, output: 15.00 },
  'claude-3-opus-20240229': { input: 15.00, output: 75.00 },
  'claude-3-sonnet-20240229': { input: 3.00, output: 15.00 },
  'claude-3-haiku-20240307': { input: 0.25, output: 1.25 },
} as const

type ClaudeModel = keyof typeof CLAUDE_PRICING

export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = CLAUDE_PRICING[model as ClaudeModel] || CLAUDE_PRICING['claude-3-5-sonnet-20241022']
  const inputCost = (inputTokens / 1_000_000) * pricing.input
  const outputCost = (outputTokens / 1_000_000) * pricing.output
  return inputCost + outputCost
}

export async function logClaudeUsage(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  model: string,
  inputTokens: number,
  outputTokens: number,
  metadata?: Record<string, unknown>
): Promise<void> {
  const costUsd = calculateCost(model, inputTokens, outputTokens)

  const { error } = await supabase
    .from('claude_usage')
    .insert({
      user_id: userId,
      action,
      model,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      metadata: metadata || null
    })

  if (error) {
    console.error('Failed to log Claude usage:', error)
  }
}
