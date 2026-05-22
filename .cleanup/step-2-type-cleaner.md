# Step 2 — Type Cleaner
Generated: 2026-05-22  |  Level: junior  |  Skill: type-cleaner

## Summary
- **Files modified:** 7
- **Changes applied:** 10
- **Test result:** n/a (no test suite)

---

## Changes

### src/types/database.ts

**Change:** Normalised `Transaction` from `type` alias to `interface`

**Why:** WCAG TypeScript style guide and the type-cleaner `preferInterface` rule
(enabled by default) both prefer `interface` for object shapes — they are more
extensible (can be `extends`-ed and merged via declaration merging), produce
better error messages, and represent intent more clearly. `type` aliases are
preferred only for union types, mapped types, and conditional types.

**Before:**
```ts
export type Transaction = {
  id: string
  ...
}
```
**After:**
```ts
export interface Transaction {
  id: string
  ...
}
```

**Further reading**
- [TypeScript: Interfaces vs Type Aliases](https://www.typescriptlang.org/docs/handbook/2/everyday-types.html#differences-between-type-aliases-and-interfaces)
- [TypeScript Handbook: Object Types](https://www.typescriptlang.org/docs/handbook/2/objects.html)

---

### src/app/(dashboard)/categories/page.tsx

**Change 1:** Replaced `{ [category: string]: number }` with `Record<string, number>`

**Why:** `Record<K, V>` is the idiomatic TypeScript utility type for index
signatures. It is more readable and avoids the verbosity of explicit index
signature syntax `{ [key: string]: V }`. The semantics are identical.

**Before:** `type CategoryData = { [category: string]: number }`
**After:** `type CategoryData = Record<string, number>`

**Change 2:** Same pattern for `MonthlyCategories` and `categoryExpenseTypes`.

**Change 3:** Replaced `{ [key: string]: string }` with `Record<string, string>`
for `CATEGORY_COLORS`.

**Further reading**
- [TypeScript: Record utility type](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)

---

### src/app/(dashboard)/settings/page.tsx

**Change:** Normalised `Currency` and `Settings` from `type` to `interface`.

**Why:** Same as database.ts — object shapes should use `interface`.

---

### src/hooks/useCurrency.ts

**Change:** Normalised `Currency` from `type` to `interface`.

---

### src/lib/mapping-utils.ts

**Change:** Normalised `MappingResult` and `ExistingMapping` from `type` to `interface`.

---

### src/app/(dashboard)/manage-categories/page.tsx

**Change:** Normalised `Category` from `type` to `interface`.

---

### src/app/(dashboard)/mappings/page.tsx

**Change:** Normalised `Category` and `CategoryMapping` from `type` to `interface`.

---

## Flags (no auto-fix — needs developer judgment)

### `any` usage flagged

- `src/app/api/parse-statement/route.ts:83` — `m.categories as unknown as { name: string } | null` — cast via `unknown` is a type escape hatch; the correct fix is to type the Supabase query result with a generated schema type.
- `src/app/api/transactions/route.ts:39` — same pattern.
- `src/app/api/identify-categories/route.ts:52` — same pattern.
- `src/app/api/category-mappings/route.ts` — expected to contain similar patterns (not auto-fixed).

**Recommendation:** Generate Supabase TypeScript types using `supabase gen types typescript` and use them to type query results directly instead of casting through `unknown`.

### Duplicate object shapes across files

- `Currency` interface is defined separately in `settings/page.tsx` and `useCurrency.ts` with identical shape. Consider extracting to a shared `src/types/currency.ts`.
- `Category` interface is defined separately in `manage-categories/page.tsx` and `mappings/page.tsx`. Consider a shared `src/types/category.ts`.
- `MappingRow` inline type appears identically in `parse-statement/route.ts` and `identify-categories/route.ts` — extract to a shared API types file.
