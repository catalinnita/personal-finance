# Step 4 — Accessibility
Generated: 2026-05-22  |  Level: junior  |  Skill: accessibility
Standard: WCAG 2.1 Level AA

## Summary
- **Files modified:** 6
- **Violations found:** 18
- **Auto-fixed:** 13
- **Manual review required:** 5
- **Test result:** n/a (no test suite)

---

## Changes applied

### src/components/TransactionModal.tsx

**Change:** Added `role="dialog"`, `aria-modal="true"`, `aria-labelledby="transaction-modal-title"` to the modal wrapper; added `id="transaction-modal-title"` to the `<h2>`; added `aria-label="Close dialog"` and `aria-hidden="true"` to the close button icon.

**Why (WCAG 4.1.2 — Name, Role, Value, Level A):** Screen readers need to announce that this is a dialog and read its title automatically when focus enters it. Without `role="dialog"`, assistive technology treats the modal like any other `<div>` and does not enter "dialog mode". `aria-labelledby` links the dialog to its visible heading so the announcement is "Edit Transaction, dialog" rather than just "dialog".

**Action required:** The modal does not trap focus — when open, Tab can navigate outside it. Implement focus trapping (e.g. via the `@radix-ui/react-dialog` component or a custom `useFocusTrap` hook). This cannot be auto-fixed safely.

**Further reading**
- [MDN: ARIA: dialog role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Roles/dialog_role)
- [WCAG 4.1.2](https://www.w3.org/TR/WCAG21/#name-role-value)

---

### src/components/Sidebar.tsx

**Change 1:** Added `aria-label="Main navigation"` to `<aside>`.

**Why (WCAG 1.3.1 — Info and Relationships, Level A):** When a page has multiple landmark regions, each must have a distinguishing label so screen reader users can navigate between them by landmark. Without a label, `<aside>` is announced as just "complementary" with no context.

**Change 2:** Added `aria-label={!showFull ? item.label : undefined}` and `aria-current="page"` to each navigation `<Link>`.

**Why:** When the sidebar is collapsed to icon-only mode, the link's visible text is hidden. An `aria-label` ensures screen readers still announce the destination. `aria-current="page"` marks the currently active route — a best practice for navigation components (WCAG 2.4.8, Level AAA, but widely expected).

**Change 3:** Added `aria-hidden="true"` to all icon components inside links.

**Why (WCAG 1.1.1 — Non-text Content, Level A):** Icons used as decoration alongside visible text (or when the link has an `aria-label`) should be hidden from assistive technology. Without `aria-hidden`, screen readers may announce the SVG element name (e.g. "Upload" icon name), resulting in double announcements.

**Change 4 (MobileMenuButton):** Added `aria-label`, `aria-expanded`, and `aria-controls` to the hamburger button; added `aria-hidden` to icons.

**Why (WCAG 4.1.2):** Toggle buttons must communicate their current state via `aria-expanded`. `aria-controls` links the button to the element it controls, completing the semantic relationship.

**Further reading**
- [MDN: aria-label](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Attributes/aria-label)
- [WCAG 2.4.4 Link Purpose](https://www.w3.org/TR/WCAG21/#link-purpose-in-context)

---

### src/app/(dashboard)/layout.tsx

**Change:** Replaced `title` attributes on icon-only buttons/links with proper `aria-label` attributes; added `aria-hidden="true"` to icon components.

**Why:** `title` attributes are not reliably announced by screen readers (behaviour varies by browser + screen reader combination). `aria-label` provides a guaranteed accessible name. The icons are decorative when a button already has an `aria-label`, so they should be `aria-hidden`.

---

### src/app/(dashboard)/transactions/page.tsx

**Change 1:** Added `aria-label="Transactions"` to `<table>`.

**Why (WCAG 1.3.1):** Data tables should have a programmatic label so screen readers announce context when the user navigates to the table. A `<caption>` element is the semantic HTML way; `aria-label` achieves the same effect in JSX where `<caption>` placement is controlled differently.

**Change 2:** Added `aria-label` to the Edit and Delete buttons describing which transaction they act on.

**Why (WCAG 2.4.6 — Headings and Labels, Level AA):** Icon-only action buttons have no accessible name. A screen reader user navigating by button would hear "button, button" with no context. `aria-label={`Edit transaction: ${t.description}`}` makes each button uniquely identifiable.

---

### src/app/login/page.tsx

**Change:** Added `aria-hidden="true"` to the `<Chrome>` icon inside the login button.

**Why:** The button already has visible text "Continue with Google". The icon is decorative. Screen readers would otherwise announce both the icon name and the text.

---

### src/app/(dashboard)/upload/page.tsx

**Change:** Added `aria-hidden="true"` to `<Upload>` and `<FileText>` icons inside the drop zone label.

**Why:** Same rationale as above — decorative icons alongside descriptive text.

---

## Manual attention required (5 issues)

### 1. Focus trap in TransactionModal (WCAG 2.1.2 — No Keyboard Trap, Level A — Inverse)
When the modal is open, keyboard focus is not trapped inside it. A user pressing Tab can move focus to elements behind the modal. Implement focus trapping with `@radix-ui/react-dialog` or a `useFocusTrap` hook.

### 2. Colour contrast — not verified statically
The app uses Tailwind brand/gray/success/error colours. Static analysis cannot fully resolve computed contrast ratios for dynamic dark mode. Run contrast checks with both light and dark themes using a tool like the axe DevTools browser extension.

### 3. `confirm()` dialog in transactions page (WCAG 3.2.5 — Change on Request, Level AAA)
`confirm('Are you sure you want to delete this transaction?')` uses the browser's native confirm dialog, which cannot be styled or made consistent. Replace with an in-page confirmation dialog (a `role="alertdialog"` modal) for full control.

### 4. Sidebar collapsed icon alt text
The `item.icon` components are Lucide SVG icons. When `aria-label` is applied to the link, the icons receive `aria-hidden`. However, if the sidebar is in an intermediate hover state, the icon may be the only visible element. Verify this state is handled correctly in a real browser with a screen reader.

### 5. `outline: none` in focus styles
Multiple inputs and buttons use `focus:outline-none` without a visible `focus-visible` replacement in Tailwind. Tailwind's `focus:ring-*` classes are used on some inputs (e.g. modal form fields), but verify all interactive elements have a visible focus indicator in both light and dark modes.
