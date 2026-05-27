'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import type { Transaction } from '@/types/database'

// ---------------------------------------------------------------------------
// Query keys — centralised to make invalidation calls refactor-safe
// ---------------------------------------------------------------------------
export const queryKeys = {
  transactions:     ['transactions']     as const,
  categories:       ['categories']       as const,
  settings:         ['settings']         as const,
  budgets:          ['budgets']          as const,
  categoryMappings: ['categoryMappings'] as const,
}

// ---------------------------------------------------------------------------
// Fetchers
// ---------------------------------------------------------------------------
async function fetchTransactions(): Promise<Transaction[]> {
  const res = await fetch('/api/transactions')
  if (!res.ok) throw new Error('Failed to fetch transactions')
  const data = await res.json()
  return data.transactions ?? []
}

export interface Category {
  id: string
  name: string
  type: string
  expense_type: 'fixed' | 'variable'
  budget_group?: 'needs' | 'wants' | 'savings' | 'excluded'
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch('/api/categories')
  if (!res.ok) throw new Error('Failed to fetch categories')
  const data = await res.json()
  return data.categories ?? []
}

export interface Settings {
  currency: string
  highlight_threshold: number
  moving_average_period: number
}

export interface SettingsResponse {
  settings: Settings
  currencies: { code: string; symbol: string; name: string }[]
}

async function fetchSettings(): Promise<SettingsResponse> {
  const res = await fetch('/api/settings')
  if (!res.ok) throw new Error('Failed to fetch settings')
  return res.json()
}

export interface Budget {
  id: string
  category_id: string
  category_name: string
  amount: number
  effective_from: string
  created_at: string
}

async function fetchBudgets(): Promise<Budget[]> {
  const res = await fetch('/api/budgets')
  if (!res.ok) throw new Error('Failed to fetch budgets')
  const data = await res.json()
  return data.budgets ?? []
}

export interface CategoryMapping {
  id: string
  description_pattern: string
  category_id: string
  category_name?: string
}

async function fetchCategoryMappings(): Promise<CategoryMapping[]> {
  const res = await fetch('/api/category-mappings')
  if (!res.ok) throw new Error('Failed to fetch category mappings')
  const data = await res.json()
  return data.mappings ?? []
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------
export function useTransactionsQuery() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: fetchTransactions,
  })
}

export function useCategoriesQuery() {
  return useQuery({
    queryKey: queryKeys.categories,
    queryFn: fetchCategories,
  })
}

export function useSettingsQuery() {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: fetchSettings,
  })
}

export function useBudgetsQuery() {
  return useQuery({
    queryKey: queryKeys.budgets,
    queryFn: fetchBudgets,
  })
}

export function useCategoryMappingsQuery() {
  return useQuery({
    queryKey: queryKeys.categoryMappings,
    queryFn: fetchCategoryMappings,
  })
}

// ---------------------------------------------------------------------------
// Re-export useQueryClient for mutation invalidation in page components
// ---------------------------------------------------------------------------
export { useQueryClient }
