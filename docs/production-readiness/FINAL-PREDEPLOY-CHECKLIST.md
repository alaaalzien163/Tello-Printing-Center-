# Tello Printing Center — final pre-deploy checklist

**Prepared:** 22 November 2026  
**Repository:** `D:\tello-frontend`  
**Branch / HEAD at start:** `feature/seo-phase-a` / `3853409`  
**Scope:** safe code-level remediation, test isolation, verification, and the
exact owner-operated Supabase/Vercel actions that remain.

**Verdict: NOT READY for final domain cutover.** The code-level blockers are
fixed and verified. Cloud-console controls, Staging isolation, live RLS proof,
and recovery evidence remain owner actions.

Status values in this document are limited to:

- **PASS** — directly verified with evidence in this run.
- **FAIL** — verified defect.
- **BLOCKED** — requires owner action, live access, or missing cloud evidence.
- **NOT APPLICABLE** — genuinely not relevant.

---

## 1. What changed

### 1.1 Rate-limit trust model

| Item | Result | Evidence |
|---|---|---|
| Trusted IP source | **PASS** | `x-vercel-forwarded-for` only; Vercel overwrites client values |
| `cf-connecting-ip` ignored | **PASS** | Unit tests prove it cannot override or supply an identity |
| `x-real-ip` ignored in deployed runtime | **PASS** | Unit test |
| `x-forwarded-for` ignored in deployed runtime | **PASS** | Unit test |
| IP syntax validation | **PASS** | `node:net` `isIP`; IPv4, IPv6 and bracketed IPv6 covered |
| Missing trusted IP in Production/Preview | **PASS** | Route returns `503 SERVICE_UNAVAILABLE`; no insert, no fresh identity |
| Invalid trusted IP | **PASS** | Treated as missing; fails closed |
| Local development behavior | **PASS** | `next dev` uses `x-forwarded-for` or loopback `127.0.0.1` |
| HMAC-only storage | **PASS** | Existing `hashClientIp` preserved; no raw IP logged or stored |
| Limits and window | **PASS** | Still 3 requests / 900 seconds |
| RPC error handling | **PASS** | Existing `SERVICE_UNAVAILABLE` fail-closed path unchanged and tested |

Production/Preview flow:

1. Read `x-vercel-forwarded-for`.
2. Take the first value, normalize brackets/lowercase, validate with `isIP`.
3. Hash with `HMAC-SHA256(PRINT_REQUEST_RATE_LIMIT_SECRET, ip)`.
4. If missing or invalid, return 503 before parsing/storing the request.

The route logs only a correlation id, operation and reason. It never logs the
raw IP or any forwarded header.

Vercel documents `x-vercel-forwarded-for` as the sanitized, platform-owned
client address. If another reverse proxy (for example Cloudflare) is ever placed
in front of Vercel, that header becomes the proxy's address and every visitor
would share one rate-limit bucket. Re-evaluate the trust model before adding a
proxy; do not reintroduce `cf-connecting-ip` without a documented edge
sanitization guarantee.

### 1.2 E2E isolation

| Item | Result | Evidence |
|---|---|---|
| `.env.local` loaded by Playwright | **PASS** | Removed; only `.env.test.local` is loaded |
| Dedicated example file | **PASS** | `.env.test.example` contains names/placeholders only |
| Git ignore coverage | **PASS** | `.env*` ignored; `!.env.test.example` explicitly allowed |
| Explicit write opt-in | **PASS** | `E2E_ALLOW_DATABASE_WRITES=true` required |
| Expected Staging reference | **PASS** | `E2E_EXPECTED_STAGING_PROJECT_REF` required |
| Production reference refusal | **PASS** | Guard throws when the URL matches `E2E_PRODUCTION_PROJECT_REF` |
| Mismatch refusal | **PASS** | Guard throws when URL ref ≠ expected Staging ref |
| Missing Staging | **PASS** | Destructive tests skip with a clear reason; no Production fallback |
| Write helper guard | **PASS** | `createRequestThroughApi` and `signIn` assert access |
| Test declarations guarded | **PASS** | Submission, upload, rate-limit and admin tests skip |
| Credentials gated | **PASS** | Admin/non-admin fixtures are `null` unless the guard passes |
| Server-target handshake | **PASS** | `/api/health/supabase` fingerprint checked before every write path |
| Production health endpoint | **PASS** | Returns `404` on Production; no fingerprint exposed |
| Secret output | **PASS** | Guard messages use 8-character SHA-256 fingerprints only |

Handshake design:

- Playwright forwards the four Staging Supabase variables to the dev server it
  starts, so `.env.local` cannot override them.
- Before a write, the test calls `GET /api/health/supabase`.
- The route returns only `{ projectFingerprint }` (8 hex characters).
- The test compares it with the fingerprint derived from
  `NEXT_PUBLIC_SUPABASE_URL` in `.env.test.local`.
- A reused/externally started server that loaded Production `.env.local`
  reports a different fingerprint and the test aborts before writing.
- The route is `404` when `VERCEL_ENV=production` or in a production-mode
  runtime that is not Preview.

### 1.3 Session cookies

| Item | Result | Evidence |
|---|---|---|
| `Secure` on Vercel Production | **PASS** | `serverSessionCookieOptions({ VERCEL_ENV: "production" })` |
| `Secure` on Vercel Preview | **PASS** | `serverSessionCookieOptions({ VERCEL_ENV: "preview" })` |
| Local HTTP development | **PASS** | `secure: false`; browser helper uses page protocol |
| Browser/server consistency | **PASS** | Browser uses `https:` protocol; server uses `VERCEL_ENV` |
| `httpOnly` | **PASS** | Left at `@supabase/ssr` default `false`; required for browser refresh |
| `sameSite` / `path` | **PASS** | `lax` / `/` preserved |
| HSTS | **BLOCKED** | No app-level HSTS; verify at the edge after DNS cutover |

No custom session mechanism was introduced. `@supabase/ssr` still merges its
400-day `maxAge` default; only `secure` is set explicitly.

### 1.4 Files changed in this remediation

| File | Change |
|---|---|
| `src/lib/print-requests/rate-limit.ts` | Trusted-header resolver, IP validation, fail-closed result |
| `src/app/api/public/print-requests/route.ts` | 503 before processing when identity is unavailable |
| `src/lib/supabase/cookies.ts` | Server/browser `Secure` cookie options |
| `src/lib/supabase/project-reference.ts` | Project-reference parsing and fingerprinting |
| `src/app/api/health/supabase/route.ts` | Non-sensitive E2E target fingerprint (disabled on Production) |
| `src/lib/supabase/server.ts` | Applies server cookie options |
| `src/lib/supabase/proxy.ts` | Applies server cookie options |
| `src/lib/supabase/client.ts` | Applies browser cookie options |
| `playwright.config.ts` | Loads `.env.test.local`; forwards Staging variables |
| `tests/e2e/staging.ts` | Staging guard, write refusal, server handshake |
| `tests/e2e/helpers.ts` | Gated credentials, guarded sign-in |
| `tests/e2e/print-request.spec.ts` | Guarded submissions/uploads; trusted-header rate-limit test |
| `tests/e2e/admin.spec.ts` | Guarded dashboard tests |
| `tests/e2e/auth.spec.ts` | Guarded authenticated tests |
| `tests/unit/print-request-rate-limit.test.ts` | Header-precedence and fail-closed regressions |
| `tests/unit/print-request-route.test.ts` | Missing-identity 503 regression |
| `tests/unit/supabase-cookies.test.ts` | Production/Preview/local cookie regressions |
| `tests/unit/e2e-staging-guard.test.ts` | Guard/refusal/fingerprint regressions |
| `tests/unit/health-supabase-route.test.ts` | Production 404 / Preview fingerprint / unconfigured regressions |
| `.env.test.example` | Staging-only placeholders |
| `.env.example` | Points E2E values at `.env.test.local` |
| `.gitignore` | Allows the safe example file |
| `docs/production-readiness/rls-diagnostics.sql` | Read-only live RLS/SQL diagnostics |
| `docs/production-readiness/E2E-PRODUCTION-CLEANUP.md` | Cleanup dry run |
| `docs/production-readiness/FINAL-PREDEPLOY-CHECKLIST.md` | This document |

Pre-existing modifications were preserved and not edited by this remediation:

- `package-lock.json`
- `tests/e2e/brand.spec.ts`
- `tests/e2e/public.spec.ts`
- `tests/e2e/seo.spec.ts`
- `tests/unit/navigation.test.tsx`

No public content, branding, layout, navigation, translations, login link, or
Services route was changed.

### 1.5 What did not change

| Item | Status |
|---|---|
| Production database data/schema/policies | **PASS** — untouched |
| Production Storage objects/buckets | **PASS** — untouched |
| Supabase Auth users/settings | **PASS** — untouched |
| Vercel variables/settings/domains | **PASS** — untouched |
| Six Production E2E requests | **PASS** — not deleted |
| `profiles` table | **PASS** — not read or modified |
| Production admin credentials | **PASS** — not used or stored in this run |
| Git commit/push/merge | **PASS** — none |
| Deploy/DNS | **PASS** — none |

---

## 2. Verification results

Run from `D:\tello-frontend` after the code changes:

| Command | Result |
|---|---|
| `npm run lint` | **PASS** — 0 errors, 0 warnings |
| `npm run typecheck` | **PASS** |
| `npm test` | **PASS** — 37 files, 333 tests |
| `npm run build` | **PASS** — Next.js 16.4.6 production build |
| `npm run e2e` | **PASS** — non-destructive result: 85 passed, 15 skipped, 0 failed |
| `npm audit --omit=dev` | **PASS** — 0 vulnerabilities |
| `npm audit` | **FAIL** — dev-only: 4 moderate findings in the shadcn/ts-morph/minimatch chain |
| `npm ci` | **NOT APPLICABLE** — lockfile/package state was not changed by this remediation |

Of the 15 skips, 14 are write-capable or authenticated tests blocked by the
missing Staging configuration:

- 6 admin dashboard tests
- 3 authenticated admin/non-admin tests
- 4 print-request submission/upload/rate-limit tests
- 1 admin print-request lifecycle test

The remaining skip is data-dependent: the catalog “empty state for a category
without active products” test requires an active category with no active
products, which the current catalog does not contain. It is unrelated to
Staging and does not write.

No skipped test is reported as passed. No destructive test ran against
Production in either E2E run.

The dev-only audit findings require a breaking shadcn downgrade to “fix” and do
not affect the production runtime. They were intentionally not force-upgraded.

---

## 3. Required Supabase Dashboard actions

### 3.1 Disable public signup

| Step | Detail |
|---|---|
| Location | Supabase Dashboard → Authentication → **Sign In / Up** (older dashboards: **Providers** → **Email**) |
| Setting | Turn off **Allow new users to sign up** |
| Keep enabled | Email provider, email confirmation, existing users |
| Effect | New self-service registrations are rejected; existing admins and passwords remain intact |

This does **not** delete or disable existing admin accounts. The application has
no public signup, password-reset, or email-redirect flow.

Post-change smoke test:

1. Sign out of the admin dashboard.
2. Sign in with an existing Production admin account.
3. Confirm `/en/admin` loads and the request list is visible.
4. Confirm a new signup attempt is rejected in the Auth settings/API.
5. Confirm the login page still shows invalid credentials for a wrong password.

Status: **BLOCKED** until the owner performs the change.

### 3.2 Run the live RLS diagnostics

1. Open `docs/production-readiness/rls-diagnostics.sql`.
2. Run it as a project owner in the SQL Editor.
3. Confirm every application table has `rls_enabled = true` and the expected
   policies.
4. Confirm `consume_print_request_rate_limit` is `security definer`, has a
   fixed `search_path`, and is not executable by `anon`.
5. Run the rolled-back non-admin/admin behavior blocks.
6. Run Advisors → Security and resolve critical/high findings.

Expected non-admin result: `0` visible requests/files and `is_admin() = false`.
Expected admin result: visible requests and `is_admin() = true`.

Status: **BLOCKED** — requires owner SQL access and a non-admin test user.

### 3.3 Storage MIME allowlist

Current Production bucket: private, 50 MiB, `allowed_mime_types = null`.

The application accepts these extensions and declared MIME types:

| Extension | Accepted declared types |
|---|---|
| `stl` | `model/stl`, `application/sla`, `application/vnd.ms-pki.stl`, `application/octet-stream`, `text/plain` |
| `obj` | `model/obj`, `text/plain`, `application/octet-stream` |
| `3mf` | `model/3mf`, `application/vnd.ms-package.3dmanufacturing-3dmodel+xml`, `application/zip`, `application/octet-stream` |
| `step`, `stp` | `application/step`, `text/plain`, `application/octet-stream` |
| `iges`, `igs` | `model/iges`, `application/iges`, `text/plain`, `application/octet-stream` |
| `dxf` | `image/vnd.dxf`, `application/dxf`, `application/x-dxf`, `text/plain`, `application/octet-stream` |
| `pdf` | `application/pdf` |
| `jpg`, `jpeg` | `image/jpeg` |
| `png` | `image/png` |
| `webp` | `image/webp` |
| `zip` | `application/zip`, `application/x-zip-compressed`, `application/octet-stream` |

Proposed exact bucket allowlist (do not apply until upload regression tests pass
on Staging):

```text
application/dxf
application/iges
application/octet-stream
application/pdf
application/sla
application/step
application/vnd.ms-package.3dmanufacturing-3dmodel+xml
application/vnd.ms-pki.stl
application/x-dxf
application/x-zip-compressed
application/zip
image/jpeg
image/png
image/vnd.dxf
image/webp
model/3mf
model/iges
model/obj
model/stl
text/plain
```

Limitations:

- `application/octet-stream` and `text/plain` are currently accepted for CAD
  text formats, so the bucket cannot become a strict format allowlist without
  changing the client metadata strategy.
- Safe tightening option: map each extension to a canonical MIME type in the
  TUS `contentType` metadata, remove broad types from the app allowlist, then
  apply a narrower bucket list. This requires a live upload regression test for
  every accepted format. Do not do it silently.
- Application-side controls remain: extension allowlist, declared type check,
  actual size check, magic-byte/signature sampling, private bucket, signed
  upload/download, and forced attachment downloads.

Status: **BLOCKED** — waiting for upload regression on Staging and owner
approval.

### 3.4 Security Advisor

Run Dashboard → Advisors → Security. Resolve at minimum:

- RLS disabled on a public table.
- RLS enabled with no policy.
- `SECURITY DEFINER` function with mutable `search_path`.
- Publicly executable privileged function.
- Leaked-password protection disabled.
- Signup/CAPTCHA configuration if signup remains enabled.

Status: **BLOCKED**.

---

## 4. Vercel environment scopes

Target:

| Environment | Supabase project | Secrets |
|---|---|---|
| Production | Production | Production-only |
| Preview | Staging | Staging-only |
| Development (`vercel dev`) | Staging | Staging-only |
| Local `.env.local` | Staging | Staging-only |
| E2E `.env.test.local` | Staging | Staging-only |

Variables that must be scoped separately:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_SECRET_KEY`
- `PRINT_REQUEST_RATE_LIMIT_SECRET`

Current verified defect (from the audit evidence; there is no `vercel.json` in
the repository and Vercel settings were not modified in this run): Production
and Preview share one `NEXT_PUBLIC_SUPABASE_URL` entry, so Preview targets
Production. Preview also has secret-key and rate-limit entries, enabling writes
to Production.

Owner procedure:

1. Vercel → Project → Settings → Environment Variables.
2. For each of the four names, keep the Production value on the Production
   scope only.
3. Add a separate Preview-scoped entry with the Staging value. Do not reuse a
   Production secret.
4. Optionally add Development-scoped Staging values for `vercel dev`.
5. Redeploy a Preview branch and confirm it reads Staging data.
6. Do not redeploy Production until the production release is approved.
7. Confirm the Production project reference is present only in the Production
   scope (and in `E2E_PRODUCTION_PROJECT_REF` for refusal, never as a target).

Never copy `SUPABASE_SECRET_KEY` or `PRINT_REQUEST_RATE_LIMIT_SECRET` between
environments. Never put a secret in a `NEXT_PUBLIC_*` variable.

Status: **BLOCKED**.

---

## 5. Staging environment setup (ordered)

1. **Create the project.** Supabase Dashboard → New Project. Use a dedicated
   Staging project; do not clone Production customer data.
2. **Apply migrations in order** to Staging only:
   - `20261114000000_catalog_storage_admin.sql`
   - `20261114190000_print_requests.sql`
   - `20261115090000_print_requests_reconcile.sql`
   - `20261115120000_print_request_rate_limit_shape.sql`
   - `20261115130000_print_request_rate_limit_ip_hash.sql`
3. **Create the `catalog-images` bucket** (the migrations define its policies but
   not the bucket): public, 10 MiB, MIME `image/jpeg`, `image/png`,
   `image/webp`, `image/avif`.
4. **Confirm `print-request-files`** is created by the migration as private,
   50 MiB. Apply the MIME allowlist only after the upload regression.
5. **Seed a minimal catalog** through the admin UI or reviewed seed SQL:
   at least one active category, one active product, and two variants with
   different images for the variant tests. Do not copy customer requests.
6. **Create a Staging admin**: Dashboard → Authentication → Users → Add user,
   then insert the user UUID into `public.admin_users`. Use a staging-only
   password.
7. **Create a Staging non-admin**: add a second user and do not insert an
   `admin_users` row.
8. **Verify** the Staging RLS with `rls-diagnostics.sql`.
9. **Write `.env.test.local`** from `.env.test.example` with Staging values and:
   - `E2E_ALLOW_DATABASE_WRITES=true`
   - `E2E_EXPECTED_STAGING_PROJECT_REF=<staging ref>`
   - `E2E_PRODUCTION_PROJECT_REF=<production ref>`
   - `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` (Staging admin)
   - `E2E_NON_ADMIN_EMAIL` / `E2E_NON_ADMIN_PASSWORD` (Staging non-admin)
10. **Point local `.env.local` at Staging** (owner action; do not copy
    Production secrets into it).
11. **Run the destructive E2E tests** only after the guard passes. Confirm
    `/api/health/supabase` returns the Staging fingerprint.
12. **Keep Production exclusive**: no Preview, Development, local, or E2E
    variable may reference the Production project reference except
    `E2E_PRODUCTION_PROJECT_REF`, which is used only for refusal.

Status: **BLOCKED**.

---

## 6. Auth and public signup checklist

| Check | Result | Evidence |
|---|---|---|
| No user-facing signup flow | **PASS** | Source/routes; `/en/admin/signup` renders login |
| Admin login uses password flow | **PASS** | `signInWithPassword` server action |
| Admin membership checked | **PASS** | `getClaims()` + `admin_users` |
| Non-admin signed out | **PASS** | Code review; E2E blocked by missing Staging user |
| Login/dashboard noindex | **PASS** | Metadata + E2E |
| Logout revokes access | **PASS** | Code review; E2E blocked by missing Staging user |
| Email confirmation enabled | **PASS** | Live `/auth/v1/settings` from prior audit |
| Public signup disabled | **BLOCKED** | Live setting still `disable_signup=false` |
| Auth redirect allowlist | **BLOCKED** | Management API unavailable; no redirect flow used |
| Login rate limiting | **BLOCKED** | Supabase built-in limits not measured |

No Auth user was created, deleted, or modified.

---

## 7. RLS and database readiness

Read-only diagnostics: `docs/production-readiness/rls-diagnostics.sql`.

It covers:

1. RLS enabled/forced flags.
2. Every policy and expression.
3. Table and column grants for `anon`, `authenticated`, `service_role`.
4. Function overloads, `SECURITY DEFINER`, `search_path`, execute grants.
5. Private ledger columns, constraints, indexes, grants.
6. Print-request/admin/`profiles` columns, constraints, indexes, triggers, FKs.
7. Storage bucket definitions and object policies.
8. Data integrity, orphan and abandoned-upload checks.
9. Active-only catalog policy definitions and row counts.
10. Rolled-back non-admin, admin and anonymous storage behavior checks.

Do not treat the migrations as proof of Production. Record the SQL output with
the release evidence.

| Control | Result |
|---|---|
| Anonymous access blocked on sensitive tables | **PASS** | Prior live audit: `42501` |
| Private print-request bucket is not enumerable | **PASS** | Prior live audit: 0 anon objects |
| Rate-limit RPC fails closed for bad hash | **PASS** | Prior live probe + unchanged service path |
| Live policies/grants/constraints match migrations | **BLOCKED** | SQL output not available |
| Non-admin RLS behavior | **BLOCKED** | No Staging non-admin credentials in this run |
| Admin RLS/dashboard path | **BLOCKED** | No Staging admin credentials in this run |
| Active-only row filtering | **BLOCKED** | No inactive rows to distinguish behavior |
| Security Advisor clean | **BLOCKED** | No Management API access |

### `profiles` ownership

Status: **BLOCKED**.

- `profiles` exists in Production with one row (`id`, `full_name`, `phone`,
  timestamps).
- No repository migration or application source references it.
- Anonymous access is denied (`42501`).
- The row was not read or printed.

Recommendation: **export and remove after ownership is established**, or
formally add it to migrations and manage its RLS if another application owns
it. Do not drop it in this run. Use the SQL file to inspect its constraints,
triggers and policies first.

---

## 8. Backup and disaster recovery checklist

| Step | Evidence required | Status |
|---|---|---|
| 1. Identify the Supabase plan | Plan name and add-ons recorded | **BLOCKED** |
| 2. Confirm latest successful database backup | Timestamp + status | **BLOCKED** |
| 3. Confirm retention | Days retained | **BLOCKED** |
| 4. Confirm PITR availability/window | Enabled? Window? | **BLOCKED** |
| 5. Restore into an isolated temporary project | Restore log + target project | **BLOCKED** |
| 6. Verify schema and row counts after restore | Migration state, table counts | **BLOCKED** |
| 7. Export `catalog-images` independently | Object count + checksum/manifest | **BLOCKED** |
| 8. Export `print-request-files` independently | Object count + checksum/manifest | **BLOCKED** |
| 9. Test Storage restoration into a separate bucket | Restored count + spot check | **BLOCKED** |
| 10. Document owners, RPO, RTO | Named owner + targets | **BLOCKED** |

Important: **Supabase database backups do not include Storage objects.** Database
recovery and object recovery are separate requirements. A database restore will
not bring back customer uploads or catalog images.

Do not initiate a restore or delete a project/object without owner approval.

---

## 9. Production E2E cleanup

Read-only manifest and dry run:
`docs/production-readiness/E2E-PRODUCTION-CLEANUP.md`.

| Item | Value |
|---|---:|
| Total requests | 11 |
| `E2E%` requests | 6 |
| File metadata rows | 5 |
| Objects under `requests/` | 4 |

Status: **BLOCKED** on owner review and written approval.

Nothing was deleted. The dry run requires:

- non-sensitive manifest review;
- foreign-key/cascade confirmation;
- object-to-metadata mapping;
- backup/export confirmation;
- rate-limit ledger left untouched;
- approval to delete request rows and Storage objects separately.

---

## 10. Remaining blockers before cutover

Ordered by risk:

1. **Live authenticated RLS is unproven** while public signup is enabled.
2. **Preview/local/E2E share the Production project** until Vercel and
   `.env.local` are isolated.
3. **Backup/PITR/Storage recovery is unverified**, and database backups exclude
   Storage.
4. **Public signup is still enabled** in Supabase Auth.
5. **The admin RLS/dashboard path has not run against Staging** because no
   Staging users exist yet.
6. **`profiles` is unmanaged** and contains one unexplained PII row.
7. **The private bucket has no MIME allowlist**; the proposal needs Staging
   upload regression.
8. **Six E2E requests remain in Production**; cleanup needs written approval.
9. **HSTS is not configured in the app**; verify at the edge after cutover.
10. **Security Advisor has not been reviewed** with live access.

---

## 11. Deployment sequence

Do not start until every blocker above is closed or explicitly accepted.

1. **Create Staging** and apply the five migrations; create buckets, seed
   catalog, create Staging admin and non-admin.
2. **Configure `.env.test.local`** and run the destructive E2E suite against
   Staging. Confirm 0 Production writes and the health fingerprint matches.
3. **Disable public signup** on Production; smoke-test an existing admin login.
4. **Run `rls-diagnostics.sql` on Production**; capture output; resolve all
   critical/high findings.
5. **Verify backup/PITR**, perform a restore drill into a temporary project, and
   export/restore both Storage buckets.
6. **Separate Vercel Preview/Development variables** to Staging; keep Production
   values Production-only. Point local `.env.local` at Staging.
7. **Resolve `profiles`** (export + reviewed removal, or formal management).
8. **Apply the Storage MIME allowlist on Staging**, run the upload regression,
   then apply the approved value to Production.
9. **Clean up the six Production E2E requests** only after written approval and
   a fresh export.
10. **Cut over DNS** to Vercel; verify TLS/HSTS at the edge.
11. **Post-cutover smoke test**: public catalog, Arabic/English, print-request
    submission (with a controlled test), signed upload/download, admin login,
    request lifecycle, catalog CRUD, logout.
12. **Re-run the RLS diagnostics and Security Advisor** on Production.
13. **Record** test totals, SQL evidence, backup timestamps, restore drill,
    Storage manifest, cleanup approval, and remaining accepted risks.

---

## 12. Stop condition

This run stops before any Production mutation, Supabase Auth change, Vercel
change, commit, push, deploy, or DNS change.

The code-level work is complete and verified. The release remains **NOT READY**
until the owner-operated items in sections 3–9 are closed and evidenced.
