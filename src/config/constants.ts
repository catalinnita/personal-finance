// ─────────────────────────────────────────────────────────────────────────────
// Application-wide constants
// Extracted from source files — edit here to change behaviour globally.
// ─────────────────────────────────────────────────────────────────────────────

// ── Storage keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEY_UPLOAD = 'upload_process_state'
export const STORAGE_KEY_SELECTED_CATEGORIES = 'selected-categories'
export const STORAGE_KEY_SELECTED_YEARS = 'personal-finance-selected-years'

// ── UI breakpoints ────────────────────────────────────────────────────────────
/** Width in pixels below which the app is considered "mobile" */
export const MOBILE_BREAKPOINT = 1024

// ── Default settings ─────────────────────────────────────────────────────────
export const DEFAULT_CURRENCY = 'USD'
export const DEFAULT_HIGHLIGHT_THRESHOLD = 500
export const DEFAULT_MOVING_AVERAGE_PERIOD = 6

// ── Claude AI ────────────────────────────────────────────────────────────────
export const CLAUDE_MODEL = 'claude-sonnet-4-20250514'
export const CLAUDE_MAX_TOKENS_PARSE = 8192
export const CLAUDE_MAX_TOKENS_CATEGORIZE = 4096

// ── Transaction categories ────────────────────────────────────────────────────
/** Default categories available to all users before any custom categories are created */
export const DEFAULT_CATEGORIES = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transportation',
  'Healthcare', 'Shopping', 'Dining', 'Subscriptions', 'Transfer',
  'Investment', 'Insurance', 'Education', 'Travel', 'Loans',
  'AI', 'Theraphy', 'Housing', 'Taxes', 'Private School',
] as const

/** Default categories used in the UI mappings screen (subset of DEFAULT_CATEGORIES) */
export const DEFAULT_CATEGORIES_UI = [
  'Salary', 'Groceries', 'Utilities', 'Entertainment', 'Transportation',
  'Healthcare', 'Shopping', 'Dining', 'Subscriptions', 'Transfer',
  'Investment', 'Rent', 'Insurance', 'Education', 'Travel', 'Other',
] as const
