# Step 5 — SEO
Generated: 2026-05-22  |  Level: junior  |  Skill: seo

## Summary
- **Files modified:** 1 (`src/app/layout.tsx`)
- **Files created:** 2 (`src/app/login/layout.tsx`, `public/robots.txt`)
- **Issues found:** 8
- **Auto-fixed:** 5
- **Manual review required:** 3
- **Test result:** n/a (no test suite)

---

## Changes applied

### src/app/layout.tsx — Metadata improvements

**Change 1:** Replaced flat `title: "Personal Finance"` with a title template.

**Why:** A title template (`"%s | Kentic"`) causes each page-specific title to be
appended with the app name automatically. Without a template, every dashboard
page would inherit the root title "Personal Finance", making all pages appear
identical in browser tabs and search results.

**Before:** `title: "Personal Finance"`
**After:**
```ts
title: {
  default: "Kentic — Personal Finance Tracker",
  template: "%s | Kentic",
}
```

**Change 2:** Improved the meta description.

**Why:** The previous description ("Track your personal finances") is 28 characters — well below the recommended 50–160 character range and not distinctive enough to improve click-through from search results.

**Change 3:** Added `robots: { index: false, follow: false }` to the root layout.

**Why:** This is a personal finance app where all meaningful content is behind authentication. Allowing search engine indexing of authenticated pages is not only unhelpful (the pages require a login to render) but could leak user interface structure. The global `noindex` protects all routes by default; the login page (below) explicitly overrides this.

**Change 4:** Added basic `openGraph` metadata.

**Why:** Open Graph tags control how the app appears when shared on social media. Without them, platforms use heuristics to guess the title and description, which often produces poor results. Added `og:title`, `og:description`, and `og:type`.

**Action required:** Add `og:image` with an absolute URL once a social preview image is created. The image should be 1200×630 px.

---

### src/app/login/layout.tsx — Login page metadata (new file)

**Change:** Created a server-component layout specifically for the `/login` route
that sets `robots: { index: true, follow: true }`.

**Why:** The login page is the only public-facing entry point. It should be
indexable so that users who search for the app can find the sign-in page. The
root layout sets `noindex` globally; this segment-level override enables
indexing only for `/login`.

**Further reading**
- [Next.js: generateMetadata](https://nextjs.org/docs/app/api-reference/functions/generate-metadata)
- [Google: robots meta tag](https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag)

---

### public/robots.txt — Crawl directives (new file)

**Change:** Created `robots.txt` that explicitly disallows all dashboard routes
and the API, while allowing `/login` and `/auth/callback`.

**Why:** Without a `robots.txt`, well-behaved crawlers follow `<meta robots>`
tags but have no path-level guidance. Providing explicit `Disallow` directives
for `/api/` prevents accidental indexing of API error pages, which can contain
sensitive error messages.

---

## Manual attention required (3 issues)

### 1. og:image missing
An Open Graph image URL is required for good social sharing previews. Create a
`1200×630` static image (e.g. `public/og-image.png`) and add it:
```ts
openGraph: {
  images: [{ url: 'https://your-domain.com/og-image.png', width: 1200, height: 630 }],
}
```

### 2. Page-specific titles for dashboard routes
The dashboard pages (balance, transactions, etc.) are all Client Components
(`'use client'`) so they cannot export `metadata`. To add page-specific titles,
create a `layout.tsx` server component for each dashboard route (or for the
`(dashboard)` group). Example for the balance page:
```ts
// src/app/(dashboard)/balance/layout.tsx
export const metadata = { title: 'Balance' }
```
With the template set on the root layout, this renders as "Balance | Kentic".

### 3. Sitemap
A `sitemap.xml` is not critical since the app is primarily private, but a
minimal sitemap for the `/login` URL can help indexing. Create
`src/app/sitemap.ts` using Next.js's built-in sitemap generation:
```ts
import type { MetadataRoute } from 'next'
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: 'https://your-domain.com/login', lastModified: new Date() }]
}
```
