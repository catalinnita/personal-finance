# Step 3 — Config Extractor
Generated: 2026-05-22  |  Level: junior  |  Skill: config-extractor

## Summary
- **Files modified:** 9
- **Files created:** 1 (`src/config/constants.ts`)
- **Values extracted:** 10
- **Test result:** n/a (no test suite)

---

## New file: src/config/constants.ts

A single source of truth for all application-wide constants. Previously these
values were scattered across multiple source files, meaning a change (e.g. to
the Claude model version or a storage key) required editing several files and
risked inconsistency.

---

## Changes by file

### src/app/(dashboard)/upload/page.tsx

**Change:** Replaced `const STORAGE_KEY = 'upload_process_state'` with an
import from `@/config/constants`.

**Why:** localStorage keys are a cross-cutting concern. If another part of the
app reads the same key, they must agree on its value. A single constant
eliminates the risk of a typo causing silent data loss.

**Before:** `const STORAGE_KEY = 'upload_process_state'`
**After:** `const STORAGE_KEY = STORAGE_KEY_UPLOAD` (imported from `@/config/constants`)

---

### src/hooks/useSelectedCategories.ts

**Change:** `'selected-categories'` extracted to `STORAGE_KEY_SELECTED_CATEGORIES`.

---

### src/hooks/useSelectedYears.ts

**Change:** `'personal-finance-selected-years'` extracted to `STORAGE_KEY_SELECTED_YEARS`.

---

### src/context/SidebarContext.tsx

**Change:** `window.innerWidth < 1024` breakpoint extracted to `MOBILE_BREAKPOINT`.

**Why:** The `1024` breakpoint matches Tailwind's `lg:` prefix. If the breakpoint
is ever changed, it needs to match in both CSS (Tailwind config) and JavaScript
(this runtime check). A named constant makes the intent clear and the value
discoverable.

---

### src/app/api/parse-statement/route.ts

**Changes:**
1. Removed local `DEFAULT_CATEGORIES` array — now imported from `@/config/constants`.
2. `'claude-sonnet-4-20250514'` → `CLAUDE_MODEL`
3. `max_tokens: 8192` → `CLAUDE_MAX_TOKENS_PARSE`
4. `max_tokens: 4096` → `CLAUDE_MAX_TOKENS_CATEGORIZE`

**Why:** The model name was duplicated in two API routes. Updating the model
version now requires changing one line in `constants.ts` instead of hunting for
all string occurrences across the codebase.

---

### src/app/api/identify-categories/route.ts

**Changes:** Same as parse-statement — model and token limits now use constants.
The `DEFAULT_CATEGORIES` duplication is also eliminated.

---

### src/app/(dashboard)/mappings/page.tsx

**Change:** Local `DEFAULT_CATEGORIES` array replaced with `DEFAULT_CATEGORIES_UI`
from `@/config/constants`.

**Note:** The UI mappings page uses a slightly different subset of categories
than the API routes (includes `'Rent'` and `'Other'`, excludes `'Loans'`,
`'AI'`, `'Theraphy'`, `'Housing'`, `'Taxes'`, `'Private School'`). Both
variants are now named and documented in `constants.ts`.

---

### src/app/api/settings/route.ts

**Changes:**
1. Default `currency: 'USD'` → `DEFAULT_CURRENCY`
2. Default `highlight_threshold: 500` → `DEFAULT_HIGHLIGHT_THRESHOLD`
3. Default `moving_average_period: 6` → `DEFAULT_MOVING_AVERAGE_PERIOD`

---

## Manual attention required

### Typo in category name
`'Theraphy'` (misspelled) appears in `DEFAULT_CATEGORIES` in `constants.ts`.
The correct spelling is `'Therapy'`. This was preserved as-is to avoid a
data-migration requirement (existing transactions categorised as 'Theraphy'
would no longer match after correction). **Developer action:** Decide whether
to fix the spelling and migrate existing data, or leave it to maintain
backwards compatibility.

### `DEFAULT_CURRENCY = 'USD'` exposed to client
The `useCurrency` hook hardcodes `|| CURRENCIES.USD` as a fallback. Consider
importing `DEFAULT_CURRENCY` there too for full consistency (low priority).

### `.env` file is committed to the repository
The `.env` file contains real API keys and database credentials and is present
in the working tree. This is addressed in detail in Step 6 (security).
