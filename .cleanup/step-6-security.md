# Step 6 — Security
Generated: 2026-05-22  |  Level: junior  |  Skill: security

## Summary
- **Files modified:** 4
- **Issues found:** 9
- **Auto-fixed:** 5
- **Manual review required:** 4 (including 1 Critical)
- **Test result:** n/a (no test suite)

---

## CRITICAL — Secrets committed to repository

### `.env` — Real credentials committed

**Severity:** Critical (A02 — Cryptographic Failures / Secrets Exposure)

The `.env` file in the project root contains **live production credentials**:

- `ANTHROPIC_API_KEY` — starts with `sk-ant-api03-****` (real Anthropic API key)
- `SUPABASE_SERVICE_ROLE_KEY` — a full JWT service role key that bypasses Row Level Security
- `SUPABASE_DB_PASSWORD` — database password in plain text
- `DATABASE_URL` — full connection string including password
- `SUPABASE_TOKEN` — personal Supabase management token
- `GOOGLE_CLIENT_SECRET` — OAuth 2.0 client secret

**The `.env` file must never be committed to version control.** If this
repository has been pushed to a remote (GitHub, GitLab, etc.), these credentials
are compromised regardless of any future deletion, because git history retains
them.

**Immediate action required:**
1. Rotate all exposed credentials immediately:
   - Regenerate the Anthropic API key at console.anthropic.com
   - Rotate the Supabase service role key and anon key
   - Reset the Supabase database password
   - Revoke and re-create the Google OAuth client secret
2. Add `.env` to `.gitignore` (see below)
3. Remove `.env` from git history using `git filter-repo`:
   ```bash
   git filter-repo --path .env --invert-paths
   ```
4. Force-push the cleaned history and notify all collaborators to re-clone

**Auto-fix applied:** Added `.env` to `.gitignore` (created in step below) to
prevent future accidental commits. This does NOT remove the already-committed
file from history.

---

## Changes applied

### next.config.ts — Security headers added

**Change:** Added HTTP security headers via Next.js `headers()` config.

**Why (OWASP A05 — Security Misconfiguration):** Missing security headers are
a common finding in web security audits. Each header prevents a specific
class of attack:

| Header | Value | Protection |
|---|---|---|
| `X-Content-Type-Options` | `nosniff` | Prevents MIME-type sniffing — stops the browser from interpreting a script served as `text/plain` as executable JavaScript |
| `X-Frame-Options` | `DENY` | Prevents clickjacking — stops the app from being embedded in an `<iframe>` on a malicious site |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Controls what URL is sent in the `Referer` header — prevents leaking the full URL (which may contain tokens) to third parties |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Restricts browser API access — prevents any embedded third-party code from requesting camera/mic/location without explicit permission |

**Action required (not auto-fixed):**
- `Content-Security-Policy` (CSP): Not auto-fixed because it requires knowing all
  allowed script, style, and image sources. A misconfigured CSP can break the app.
  Start with `default-src 'self'` and relax as needed. TODO comment added in config.
- `Strict-Transport-Security` (HSTS): Add once deployed to HTTPS:
  `Strict-Transport-Security: max-age=31536000; includeSubDomains`

**Further reading**
- [MDN: HTTP security headers](https://developer.mozilla.org/en-US/docs/Web/HTTP/Headers#security)
- [OWASP: Security Headers](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

---

### src/app/auth/callback/route.ts — Open redirect fix

**Change:** Added validation of the `next` query parameter to prevent open redirect.

**Why (OWASP A01 — Broken Access Control):** The original code accepted any
value for `next` and redirected to it after authentication. An attacker could
craft a link like:
```
/auth/callback?code=...&next=https://evil.com
```
After the legitimate OAuth exchange, the user would be silently redirected to
an attacker-controlled site — a classic open redirect / phishing vector.

**Fix:** The `next` value is now validated to ensure it starts with `/` and does
not start with `//` (which browsers treat as a protocol-relative URL, equivalent
to `https://...`). Any invalid value falls back to `/`.

**Before:**
```ts
const next = searchParams.get('next') ?? '/'
```
**After:**
```ts
const nextParam = searchParams.get('next') ?? '/'
const next = nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '/'
```

**Further reading**
- [OWASP: Unvalidated Redirects and Forwards](https://cheatsheetseries.owasp.org/cheatsheets/Unvalidated_Redirects_and_Forwards_Cheat_Sheet.html)

---

### src/app/api/parse-statement/route.ts — Sensitive data logging removed

**Change:** Removed `console.log('Claude response:', responseText.substring(0, 500))` which logged up to 500 characters of the parsed bank statement content. Also removed logging of category names created.

**Why (OWASP A09 — Security Logging and Monitoring Failures):** Bank statement
content is sensitive financial data (PII). Logging it to stdout means it may
appear in server logs, which could be accessible to ops teams, stored
indefinitely, or leaked in a log management system breach. The log statement
was replaced with a safe count-only version.

---

### src/app/api/transactions/route.ts — User data logging reduced

**Change:** Removed `console.log('Category distribution:', categoryCounts)` which
logged user spending patterns across all categories; removed category name logging.

**Why:** Same as above — category distribution is user PII (reveals spending habits).
Replaced with count-only log statements.

---

## Manual attention required (4 issues)

### 1. [CRITICAL] Rotate all committed credentials — see above

### 2. Add .gitignore entry for .env files

**Severity:** High

There is no `.gitignore` file in the project root. Create one to prevent
future accidental commits of `.env` files:

```gitignore
# Environment variables — NEVER commit these
.env
.env.local
.env.*.local
.env.development
.env.production

# Dependencies
node_modules/

# Build output
.next/
out/
dist/
```

### 3. No rate limiting on API routes (OWASP A04 — Insecure Design)

**Severity:** Medium

The `/api/parse-statement` and `/api/identify-categories` routes call the
Anthropic API and do not have rate limiting. An authenticated user (or a
compromised session) could make unlimited requests, leading to significant
API cost. Implement rate limiting per `user_id` using a token bucket or a
service like Upstash Ratelimit with Vercel.

### 4. Content-Security-Policy not configured (OWASP A05)

**Severity:** High

Add a CSP header to `next.config.ts` once all external script and style sources
are identified. At minimum, block inline scripts and restrict to known origins.
A CSP prevents XSS attacks from executing injected scripts.
