# Changes Report

Generated: 2026-05-27 | Scope: React Query migration | Level: junior

## Cost

| | Tokens | Est. API cost |
|---|---|---|
| Input | 894 | $0.00 |
| Output | 391,520 | $5.87 |
| Cache read | 68,274,598 | $20.48 |
| Cache write | 1,784,014 | $6.69 |
| **Total** | **70,451,026** | **$33.05** |

> Session `c4121cd8` · Model: `claude-sonnet-4-6` · 2026-05-23 · 2026-05-23T18:42

---

We migrated the entire data-fetching layer from manual `useState` + `useEffect` + `fetch` calls to
React Query. Every page in the app was touching this pattern, so this affected 14 files. Here's what
changed and — more importantly — why it matters when this runs in production.

---

## New files

### `src/providers/QueryProvider.tsx`

This wraps the whole app with React Query's `QueryClientProvider`. Think of it as the cache registry —
every component below it in the tree can read from and write to the shared cache without knowing
about each other.

The client is configured with `staleTime: 5 minutes` and `retry: 1`. The stale time means that after
a successful fetch, React Query will serve the cached response for 5 minutes before it considers it
outdated. Retry 1 means a failed request gets one automatic retry before it surfaces an error to the
user — enough to handle a blip without masking a real outage.

Without this provider, none of the hooks below would work. It sits in `src/app/layout.tsx` wrapping
`ThemeProvider`, so it's available everywhere.

---

### `src/hooks/queries.ts`

This is the single source of truth for every API call in the app. Previously, each page had its own
`fetch('/api/...')` buried in a `useEffect`. That's fine when you have one page. When you have ten
pages all fetching the same `/api/settings` endpoint independently, you're making ten network
requests for identical data every time the user navigates.

The hooks exported here:

| Hook | Endpoint |
|---|---|
| `useTransactionsQuery()` | `GET /api/transactions` |
| `useCategoriesQuery()` | `GET /api/categories` |
| `useSettingsQuery()` | `GET /api/settings` |
| `useBudgetsQuery()` | `GET /api/budgets` |
| `useCategoryMappingsQuery()` | `GET /api/category-mappings` |

Also exports `queryKeys` — typed const arrays used in `invalidateQueries` calls — and re-exports
`useQueryClient`. The `queryKeys` object matters because if you pass a typo'd string to
`invalidateQueries`, the cache never gets cleared after a mutation and the user sees stale data.
Typed constants make that impossible.

---

## Updated files

### `src/hooks/useCurrency.ts`

This hook was making its own `fetch('/api/settings')` call internally, completely separate from every
other settings fetch in the app. So if you loaded a page that used `useCurrency` and also fetched
settings itself, you were paying for two network requests and potentially getting two slightly
different responses if one resolved before a save completed.

It now delegates to `useSettingsQuery()`. Same data, one request, shared cache.

---

### `src/app/(dashboard)/transactions/page.tsx`

Replaced manual fetch with `useTransactionsQuery()` + `useSettingsQuery()`. The mutation handlers
(add, edit, delete) now call `queryClient.invalidateQueries({ queryKey: queryKeys.transactions })`
instead of re-running the full fetch manually.

The invalidation pattern is worth understanding: when you invalidate a query key, React Query marks
that cache entry as stale and refetches it in the background. Every component using that query key
— not just this page — gets the updated data automatically. Before, after you deleted a transaction
you'd refetch the list on this page only. Any other component showing transaction data would still
be showing the old state until the user navigated away and back.

`years` and `filteredTransactions` are now `useMemo` — they're derived from the cached query data
rather than stored in separate state. This matters because derived state stored in `useState` can
get out of sync with its source. `useMemo` recomputes whenever the source changes, so there's no
window where they can diverge.

---

### `src/components/TransactionModal.tsx`

Replaced manual fetch with `useCategoriesQuery()`. The modal was fetching categories on open, which
meant a loading delay every time it appeared. Now it reads from the cache — if the categories were
already fetched by the page, the modal opens with data immediately.

---

### `src/app/(dashboard)/balance/page.tsx`

Single-query replacement — `useTransactionsQuery()` instead of a local `useEffect` fetch. The
balance page was always going to show the same transactions as every other page. There's no reason
for it to maintain a separate request lifecycle.

---

### `src/app/(dashboard)/categories/page.tsx`

This was one of the more involved pages — it was running 3 parallel `fetch` calls on mount for
transactions, settings, and categories, and storing the results in 5 separate `useState` variables
including `movingAvgPeriod`, `allUserCategories`, and `categoryExpenseTypes`.

The problem with storing derived data in state is that you have to keep it in sync manually. Every
time categories updated, you'd need to remember to re-derive `allUserCategories` and
`categoryExpenseTypes`. Forget once and you're showing stale derived data while the source data has
moved on.

All three fetches are now shared queries. The derived values are `useMemo` — they recompute
automatically when `categoriesRaw` changes. The synchronisation problem is gone structurally, not
by discipline.

---

### `src/app/(dashboard)/timeline/page.tsx`

Was running 4 parallel fetches. Now uses `useTransactionsQuery()`, `useSettingsQuery()`,
`useCategoriesQuery()`, and `useBudgetsQuery()`. The `allUserCategories` and `movingAvgPeriod`
values are `useMemo`-derived from the cache.

Worth noting: this page and the categories page now share the same cached transactions. On a first
load of the app, transactions are fetched once. Navigating between these two pages within the 5-minute
stale window makes zero additional network requests.

---

### `src/app/(dashboard)/income-timeline/page.tsx`

Same pattern as timeline. Replaced 3 parallel fetches. `allUserCategories` is now derived via
`useMemo` from the categories cache, filtered to income-type categories only.

---

### `src/app/(dashboard)/income/page.tsx`

Same 3-query pattern as the categories page. `allUserCategories` and `categoryExpenseTypes` now
derived from the cache via `useMemo`, filtered to income categories.

---

### `src/app/(dashboard)/budgets/page.tsx`

Was fetching categories, budgets, and transactions separately on mount. Now uses the shared queries.

The save and delete handlers previously called a full `fetchData()` re-run after every mutation.
That's a round-trip to all three endpoints every time you edit a budget. Now they call
`queryClient.invalidateQueries({ queryKey: queryKeys.budgets })` — only the budgets cache is
invalidated and refetched. The transactions and categories data you already have stays untouched.

---

### `src/app/(dashboard)/budget-rule/page.tsx`

Was fetching categories and transactions in parallel on mount. The category group update handler
now invalidates `queryKeys.categories` instead of re-fetching. Since `budget-rule` and
`manage-categories` share the same query key, updating a budget group here automatically reflects
in the category management page without any extra coordination.

---

### `src/app/(dashboard)/mappings/page.tsx`

This was the most stateful page — it maintained its own categories, mappings, and transactions
state, plus a derived `unmappedDescriptions` list that had to be manually recalculated after every
change.

`unmappedDescriptions` is now a `useMemo` derived from the transactions and mappings cache. It
recomputes whenever either changes. You can't forget to update it after a mutation — there's nothing
to update.

Mutation handlers now call `invalidateQueries` for `queryKeys.categoryMappings` or
`queryKeys.categories` depending on what changed. The AI-identification flow that can create new
categories invalidates `queryKeys.categories` so the new categories appear everywhere immediately.

---

### `src/app/(dashboard)/cleanup/page.tsx`

Was running `fetchTransactions()` and `fetchCategoriesAndMappings()` independently. Now reads from
the shared cache.

The destructive handlers (delete transactions, delete categories+mappings) invalidate the relevant
query keys after completion. Because the cleanup page uses the same `queryKeys.transactions` as
every other page, deleting transactions here correctly clears the cache that the balance, timeline,
and income pages are also reading from. Before, those pages would show stale counts until the user
navigated away.

---

### `src/app/(dashboard)/manage-categories/page.tsx`

The simplest migration — single categories fetch replaced with `useCategoriesQuery()`. All four
mutation handlers (add, update, delete, toggle expense type) invalidate `queryKeys.categories`.

One thing worth keeping in mind: the expense type toggle was an inline `async` function directly on
a button's `onClick`. It still works, but if this component grows it's worth extracting that into
a named handler so it's easier to test and trace in error logs.

---

### `src/app/(dashboard)/settings/page.tsx`

Replaced the manual fetch with `useSettingsQuery()`. The controlled inputs (`thresholdInput`,
`movingAvgInput`) initialise from query data via a single `useEffect` that fires when the data
first loads.

The key production implication here: saving settings now calls
`queryClient.invalidateQueries({ queryKey: queryKeys.settings })`. Because `useCurrency` delegates
to `useSettingsQuery()`, changing the currency in settings automatically propagates to every
component that displays formatted amounts — without any prop drilling, context updates, or manual
re-fetches. The cache is the communication channel.

---

## What changed architecturally

**Before:** Every page mounted → each fired its own `fetch` calls → stored results in local state.
Navigating between pages triggered duplicate requests for the same data. A mutation on one page had
no way to notify other pages that their state was stale.

**After:** React Query deduplicates requests within the same stale window and provides a shared
invalidation model. Mutations invalidate the affected cache key, which triggers a single refetch
that updates every consumer simultaneously. The app makes fewer network requests and the data
across pages is always consistent — not by coordinating components, but by having one source of
truth per endpoint.
