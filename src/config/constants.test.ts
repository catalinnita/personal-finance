import { describe, it, expect } from 'vitest'
import {
  STORAGE_KEY_UPLOAD,
  STORAGE_KEY_SELECTED_CATEGORIES,
  STORAGE_KEY_SELECTED_YEARS,
  MOBILE_BREAKPOINT,
  DEFAULT_CURRENCY,
  DEFAULT_HIGHLIGHT_THRESHOLD,
  DEFAULT_MOVING_AVERAGE_PERIOD,
  CLAUDE_MODEL,
  CLAUDE_MAX_TOKENS_PARSE,
  CLAUDE_MAX_TOKENS_CATEGORIZE,
  DEFAULT_CATEGORIES,
} from './constants'

describe('constants', () => {
  it('exports the correct storage keys', () => {
    expect(STORAGE_KEY_UPLOAD).toBe('upload_process_state')
    expect(STORAGE_KEY_SELECTED_CATEGORIES).toBe('selected-categories')
    expect(STORAGE_KEY_SELECTED_YEARS).toBe('personal-finance-selected-years')
  })

  it('exports the correct mobile breakpoint', () => {
    expect(MOBILE_BREAKPOINT).toBe(1024)
  })

  it('exports the correct default currency', () => {
    expect(DEFAULT_CURRENCY).toBe('USD')
  })

  it('exports sensible numeric defaults', () => {
    expect(DEFAULT_HIGHLIGHT_THRESHOLD).toBeGreaterThan(0)
    expect(DEFAULT_MOVING_AVERAGE_PERIOD).toBeGreaterThanOrEqual(1)
    expect(DEFAULT_MOVING_AVERAGE_PERIOD).toBeLessThanOrEqual(24)
  })

  it('exports a valid Claude model string', () => {
    expect(typeof CLAUDE_MODEL).toBe('string')
    expect(CLAUDE_MODEL.length).toBeGreaterThan(0)
  })

  it('exports positive token limits', () => {
    expect(CLAUDE_MAX_TOKENS_PARSE).toBeGreaterThan(0)
    expect(CLAUDE_MAX_TOKENS_CATEGORIZE).toBeGreaterThan(0)
  })

  it('exports DEFAULT_CATEGORIES as a non-empty readonly array', () => {
    expect(Array.isArray(DEFAULT_CATEGORIES)).toBe(true)
    expect(DEFAULT_CATEGORIES.length).toBeGreaterThan(0)
  })

  it('DEFAULT_CATEGORIES includes common finance categories', () => {
    expect(DEFAULT_CATEGORIES).toContain('Groceries')
    expect(DEFAULT_CATEGORIES).toContain('Salary')
  })
})
