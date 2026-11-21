# Tello Printing Center — Phase 2, Step 2

A production-quality bilingual storefront for a professional printing equipment retailer
and supplier, plus a Supabase-authenticated admin workspace. Built with the Next.js App
Router, React Server Components, strict TypeScript, Tailwind CSS and shadcn/ui.

- **Public site:** English and Arabic, full RTL support, light/dark/system themes,
  category-first catalog browsing, localized metadata, sitemap and robots.
- **Product catalog:** 3D printers, 3D printing filaments and materials, DTF printers and
  equipment, UV printers and equipment, industrial and commercial printing machines,
  printing inks and consumables, and printer parts and accessories.
- **Admin workspace:** Supabase email/password sign-in, JWT verification and
  `public.admin_users` authorization on the server, catalog overview, product, variant and
  category CRUD backed by Supabase, direct Supabase Storage image uploads, profile
  preferences and demo-activity reset.
- **Public print requests:** account-free intake at `/en/print-request` and
  `/ar/print-request`, direct resumable uploads to a private bucket, server-side
  rate limiting, and an admin Requests inbox with status, notes, downloads and delete.

> Supabase Auth, admin authorization, catalog persistence, image uploads and the public
> Supabase catalog are implemented. Activity and profile metadata remain browser-local demo
> data.

## Current status

- **Frontend:** storefront complete, including the category-first product catalog.
- **Admin authentication:** implemented with Supabase Auth (`signInWithPassword`), SSR
  cookies, `getClaims()`-based verification and a server-side `public.admin_users` check.
- **Catalog data:** the public storefront and the admin workspace both read
  `public.categories`, `public.products` and `public.product_variants` from Supabase.
  Public reads use an anonymous server client and only expose active, valid rows.
- **Admin catalog edits:** products, variants and categories are persisted in Supabase and
  revalidate the cached public catalog after each successful write. Activity and profile
  metadata remain browser-local demo data.
- **Images:** uploaded directly to the public `catalog-images` bucket and served through
  `getPublicUrl()`. No Cloudinary or external image host is used.
- **Print requests:** public submissions are stored in `public.print_requests` and
  `public.print_request_files`; attachments live in the private `print-request-files`
  bucket and are only reachable through short-lived administrator downloads.
- **Google Sheets:** removed from the architecture. It is no longer a planned catalog
  source, and no Google Sheets or service-account configuration is present.

---

## Requirements

- Node.js `22.19.0` (or newer 22 LTS)
- npm `10.9.3` (or newer)
- A modern browser for development

## Getting started

```bash
npm install
cp .env.example .env.local   # optional: fill in real contact details
npm run dev
```

Open:

- English site — <http://localhost:3000/en>
- Arabic site — <http://localhost:3000/ar> (default)
- Admin sign-in — <http://localhost:3000/en/admin>

The root URL and any unprefixed path redirect to the Arabic default locale (for
example `/` → `/ar` and `/products` → `/ar/products`). Automatic browser-language
detection is disabled so the default is always Arabic; visitors can switch to
English from the language menu or open `/en` directly. In the public header, the
Tello logo links to the admin sign-in page (`/en/admin/login` or
`/ar/admin/login`) as requested for this build.

### Environment variables

Runtime variables are public (`NEXT_PUBLIC_*`) and optional except for Supabase
authentication. Missing contact values produce explicit "not configured" states; the app
never invents a phone number, email, address or social URL.

| Variable                             | Purpose                                                                 |
| ------------------------------------ | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`               | Canonical origin for metadata, JSON-LD, sitemap and WhatsApp messages.  |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`        | WhatsApp business number. Empty disables ordering and shows guidance.   |
| `NEXT_PUBLIC_CONTACT_EMAIL`          | Public contact email. Empty hides the channel.                          |
| `NEXT_PUBLIC_CONTACT_PHONE`          | Public phone number. Empty hides the channel.                           |
| `NEXT_PUBLIC_CONTACT_ADDRESS_EN`     | English street address.                                                 |
| `NEXT_PUBLIC_CONTACT_ADDRESS_AR`     | Arabic street address.                                                  |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM`       | Instagram profile URL (must be `http`/`https`).                         |
| `NEXT_PUBLIC_SOCIAL_FACEBOOK`        | Facebook profile URL (must be `http`/`https`).                          |
| `NEXT_PUBLIC_SOCIAL_TELEGRAM`        | Telegram profile URL (must be `http`/`https`).                          |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN`        | LinkedIn profile URL (must be `http`/`https`).                          |
| `NEXT_PUBLIC_SOCIAL_X`               | X / Twitter profile URL (must be `http`/`https`).                       |
| `NEXT_PUBLIC_SUPABASE_URL`           | Supabase project URL used by the browser and server clients.            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key for Supabase Auth. Never use a secret/service key here. |
| `SUPABASE_SECRET_KEY`                | Server-only Supabase secret key for the print-request API. Never public. |
| `PRINT_REQUEST_RATE_LIMIT_SECRET`    | Server-only HMAC salt (16+ chars) for the IP rate limiter.               |

`NEXT_PUBLIC_SITE_URL` is optional. The canonical origin used for canonicals, Open Graph,
JSON-LD, the sitemap, `robots.txt` and WhatsApp messages is resolved per deployment:

| Deployment                        | Canonical origin                                          |
| --------------------------------- | --------------------------------------------------------- |
| Local development (`npm run dev`) | `http://localhost:3000`                                   |
| Local production build (`npm run build` + `npm run start`) | `https://www.telloprintingcenter.com` |
| Vercel Preview (`VERCEL_ENV=preview`) | `NEXT_PUBLIC_SITE_URL`, otherwise `https://$VERCEL_URL` |
| Vercel Production (`VERCEL_ENV=production`) | `https://www.telloprintingcenter.com`          |

The origin is resolved once in `next.config.ts` and inlined as
`NEXT_PUBLIC_RESOLVED_SITE_URL` so server rendering and client hydration always agree. A
Production build fails when `NEXT_PUBLIC_SITE_URL` is anything other than the canonical
Production origin; a Preview build fails when it points at the Production origin, an
`http://` origin or localhost. Never set `NEXT_PUBLIC_SITE_URL` to the Production origin in
Preview-scoped environment variables.

> Only the publishable key belongs in `NEXT_PUBLIC_*` variables. The `service_role` key and
> other secrets must never be added to the frontend, `.env.example` or the repository.
> `.env.local` is gitignored.

### Search indexing and Vercel settings

- `/` returns a permanent `308` redirect to `/ar`; `/en` and `/ar` both keep HTTP 200.
- Production `robots.txt` allows public content, disallows `/api/` and the admin routes,
  and advertises `https://www.telloprintingcenter.com/sitemap.xml`.
- Preview `robots.txt` is `Disallow: /` and advertises no sitemap.
- `src/proxy.ts` sends `X-Robots-Tag: noindex` on every response whose host is not
  `www.telloprintingcenter.com`, so Preview aliases, staging domains and raw Vercel hosts
  cannot be indexed. The canonical Production host is never marked `noindex`.
- Admin pages keep their own `noindex, nofollow` metadata.
- Unknown public routes return a real HTTP 404 with the localized not-found page.

Vercel also marks Preview deployments `noindex` itself. Keep **Deployment Protection**
(Vercel Authentication) enabled for Preview, keep the Production domain attached only to
the Production branch, and never submit Preview URLs to Search Console.

Optional end-to-end fixtures and opt-in tests, all read from `.env.local`:

| Variable | Purpose |
| --- | --- |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Credentialed admin Playwright flows. |
| `E2E_NON_ADMIN_EMAIL` / `E2E_NON_ADMIN_PASSWORD` | Non-admin denial flow. |
| `E2E_PRINT_REQUEST_UPLOADS` | Set to `1` to run the destructive upload-retry test. |
| `E2E_PRINT_REQUEST_LIVE_UPLOAD` | Set to `1` to run a real two-file signed-resumable upload. |
| `E2E_PRINT_REQUEST_RATE_LIMIT` | Set to `1` to run the destructive rate-limit test. |

### Scripts

| Command             | Description                                            |
| ------------------- | ------------------------------------------------------ |
| `npm run dev`       | Start the development server.                          |
| `npm run build`     | Create a production build and run Next.js type checks. |
| `npm run start`     | Serve the production build.                            |
| `npm run lint`      | Run ESLint (including React Compiler rules).           |
| `npm run typecheck` | Run `tsc --noEmit`.                                    |
| `npm test`          | Run Vitest unit and component tests once.              |
| `npm run test:watch`| Run Vitest in watch mode.                              |
| `npm run e2e`       | Run Playwright end-to-end tests.                       |
| `npm run og:image`  | Regenerate `public/images/og-default.png` (1200×630).  |

Before the first Playwright run, install the browser:

```bash
npx playwright install chromium
npm run e2e
```

Playwright starts its own dev server on port `3000` unless `PLAYWRIGHT_BASE_URL` is set.
The suite runs against the development server because the admin dashboard is dev-only.

## Tech stack

| Package                 | Version  |
| ----------------------- | -------- |
| Next.js                 | `16.4.6` |
| React / React DOM       | `19.3.0` |
| TypeScript              | `5.9.3`  |
| next-intl               | `4.15.0` |
| next-themes             | `0.4.6`  |
| Tailwind CSS            | `4.3.3`  |
| shadcn CLI              | `4.23.0` |
| Radix UI (`radix-ui`)   | `1.8.1`  |
| Zod                     | `4.6.7`  |
| React Hook Form         | `7.92.0` |
| @hookform/resolvers     | `7.0.5`  |
| Zustand                 | `5.1.0`  |
| Lucide React            | `1.72.0` |
| Sonner                  | `2.0.8`  |
| Vitest                  | `5.1.0`  |
| Testing Library (React) | `16.3.3` |
| Playwright              | `1.65.0` |
| jsdom                   | `27.4.0` |

Fonts are provided by the local `geist` package; Arabic uses the platform's system UI
stack. No build-time Google Fonts request is required.

## Project structure

```text
messages/                     English and Arabic message catalogs (key parity enforced)
public/images/                Local storefront and product artwork
supabase/migrations/          Catalog/storage policies and print-request schema
src/app/[locale]/             Localized routes
  (public)/                   Storefront, catalog, product detail, print request, contact, 404
  admin/                      Authenticated dashboard and sign-in
src/app/api/                  Admin image uploads, public print-request endpoints, signed downloads
src/proxy.ts                  Supabase session refresh for admin routes
src/app/sitemap.ts            Localized sitemap with hreflang alternates
src/app/robots.ts             Robots policy (admin routes disallowed)
src/components/
  admin/                      Dashboard shell, CRUD managers, forms, session context
    requests/                 Requests inbox, detail view, status badge, unread polling
  layout/                     Header, footer, splash, theme/locale switchers
  public/                     Homepage sections, cards, catalog, print-request form, WhatsApp CTA
  shared/                     Media fallback, empty states, section headings
  ui/                         shadcn/ui primitives
src/config/site.ts            Public environment configuration
src/data/                     Seed catalog and localStorage demo store
src/domain/                   Typed Product, Category, Activity, Profile, PrintRequest models
src/i18n/                     Routing, navigation, request configuration
src/lib/actions/              Server actions (admin auth, catalog, print requests)
src/lib/auth/                 Server-side admin authorization
src/lib/print-requests/       Attachment policy, submission service, upload client, admin data
src/lib/supabase/             Browser/server/proxy/privileged Supabase clients
src/lib/                      Formatting, slugs, WhatsApp, image upload, metadata
src/repositories/             Repository interfaces, mocks, public catalog reader
src/schemas/                  Shared Zod validation schemas
src/services/                 Catalog selectors
tests/unit/                   Vitest + Testing Library tests
tests/e2e/                    Playwright specs
```

## Catalog architecture

The public catalog is category-first:

- `/products` lists categories only.
- `/products/category/<slug>` lists the active products for one category.
- `/products/<slug>` is the existing product detail page.

All reads go through `src/repositories/public-catalog.ts`, which queries Supabase with the
anonymous server client in `src/lib/supabase/public.ts`. It keeps storage details out of the
UI and returns stable shapes (`PublicCatalog`, `Category`, `Product`, `ProductVariant`).

The repository:

- reads only active categories and active products, and hides products whose category is
  inactive or missing;
- drops products with missing names, slugs, categories, prices or unsupported currencies;
- derives the product-level SKU from its first published variant because `products` has no
  SKU column;
- exposes `getPublicProductVariants()` with the parent product's currency, since
  `product_variants` has no currency column;
- caches the mapped catalog for 60 seconds under the `public-catalog` tag, and admin writes
  call `revalidatePublicCatalog()` so published edits appear without a redeploy.

Seed records in `src/data/seed/` remain the fixture source for unit tests and the
browser-local demo repositories. They are no longer used by the public storefront.

## Images and Supabase Storage

Product and variant images are uploaded from the admin workspace to the existing public
`catalog-images` Storage bucket. Administrators never type an image URL or storage path.

### Upload flow

1. The form is validated in the browser and by the server action.
2. The product or variant row is created/updated first, which provides a UUID.
3. The browser sends the file to `POST /api/admin/uploads` with `XMLHttpRequest`, so upload
   progress is real byte-level progress.
4. The route re-authenticates the session, verifies `public.admin_users`, validates MIME
   type, extension, content signature and the 10 MB limit, confirms the record exists, and
   derives a safe path on the server:

   ```text
   products/{productId}/{uuid}.{jpg|jpeg|png|webp}
   variants/{variantId}/{uuid}.{jpg|jpeg|png|webp}
   ```

5. The returned path is written to `image_path` by a server action. Display URLs are built
   with `supabase.storage.from("catalog-images").getPublicUrl(path)` (equivalent public URL
   construction lives in `src/lib/storage/image-upload.ts`).

Client-supplied paths are never trusted. `isImagePathFor()` accepts only a path whose folder,
record UUID and file name match the record being updated.

### Replacement and deletion

- Replacement uploads the new object first, updates `image_path`, and only then removes the
  previous object if no product or variant still references it.
- If the database update fails, the newly uploaded object is removed where possible.
- Deleting a product removes its row and then cleans up the product folder, variant folders
  and known variant image paths. A path that is still referenced elsewhere is never deleted.
- Deleting a variant removes its row and then its image when it is no longer referenced.
- Failed uploads keep the saved product/variant record, so the administrator can submit the
  form again to retry without re-entering data.

### Storage and table policies

Apply [`supabase/migrations/20261114000000_catalog_storage_admin.sql`](supabase/migrations/20261114000000_catalog_storage_admin.sql)
with the Supabase CLI or SQL editor. It:

- adds `public.is_admin()` (security definer over `public.admin_users`),
- lets anonymous and signed-in visitors select active categories, products and variants,
- lets administrators select inactive rows and insert/update/delete catalog rows,
- lets anyone read objects in `catalog-images`,
- restricts object inserts, updates and deletes to administrators, and only inside
  `products/` or `variants/`.

The public bucket is therefore readable for delivery while all mutations remain admin-only.

`next.config.ts` derives a `next/image` remote pattern from `NEXT_PUBLIC_SUPABASE_URL` so
uploaded images can be rendered through the existing `ProductMedia` component. Missing or
broken images keep the themed fallback.

## Public print requests

Anyone can submit a print request without an account from `/en/print-request` or
`/ar/print-request`. The same flow is linked from the homepage CTA, the header and the
footer. Requests are reviewed in the admin workspace under **Requests**.

### Flow

1. The browser validates full name, international phone, details and up to five attachments
   (50 MiB each, 100 MiB total, whitelisted extensions and declared types).
2. `POST /api/public/print-requests` verifies the honeypot, the SQL rate limit and the
   file policy, then creates the request and returns server-chosen storage paths plus a
   short-lived signed upload token per file.
3. The browser uploads each file directly to Supabase with `tus-js-client` (6 MiB chunks,
   retries and per-file progress). Signed uploads use the dedicated
   `/storage/v1/upload/resumable/sign` route with the token in `x-signature`; the
   authenticated `/storage/v1/upload/resumable` route ignores that token, runs as `anon`
   and is rejected by the bucket's RLS policies. File bytes never pass through a Next.js
   request body.
4. `POST /api/public/print-requests/complete` confirms every object exists with the expected
   size, marks the files uploaded and moves the request from `uploading` to `pending`.
5. Administrators see unread counts, filter/search/sort the inbox, open a request, download
   files through a signed 60-second redirect, add internal notes, change status, contact the
   customer on WhatsApp and delete the request.

A failed or interrupted upload keeps the request in `uploading` so the same submission ID
can resume. Requests abandoned in `uploading` for more than 24 hours are cleaned up
(storage first, capped at five per run) before a new request is created.

### Attachment policy

| Rule | Value |
| --- | --- |
| Allowed extensions | `stl`, `obj`, `3mf`, `step`, `stp`, `iges`, `igs`, `dxf`, `pdf`, `jpg`, `jpeg`, `png`, `webp`, `zip` |
| Max files | 5 |
| Max per file | 50 MiB |
| Max total | 100 MiB |
| Storage path | `requests/{requestId}/{fileUuid}.{extension}` |

The server validates the extension, the declared content type and a best-effort header
signature (PDF, PNG, JPEG, WebP, ZIP/3MF, and text-based STL/OBJ/STEP/DXF). Executables,
scripts, HTML, SVG and unknown formats are rejected. Paths are always generated on the
server; the browser cannot choose them.

### Endpoints

| Endpoint | Auth | Purpose |
| --- | --- | --- |
| `POST /api/public/print-requests` | Public + rate limit | Validate and initiate a request, return signed upload targets. |
| `POST /api/public/print-requests/complete` | Public (submission ID) | Verify uploaded objects and finalize the request. |
| `GET /api/admin/print-requests/[id]/files/[fileId]` | Administrator session | Redirect to a 60-second signed download. |

Both public routes run on the Node.js runtime and are `force-dynamic`.

### Abuse protection

- Three requests per client IP per fifteen minutes, enforced by
  `public.consume_print_request_rate_limit()`. The IP is HMAC-hashed with
  `PRINT_REQUEST_RATE_LIMIT_SECRET`; raw addresses are never stored. The API fails closed
  (503) if the RPC errors or returns an unexpected shape, so an infrastructure fault
  cannot bypass the budget.
- Honeypot field, strict Zod limits and an idempotent submission ID.

### Database, storage and setup

Apply [`supabase/migrations/20261114190000_print_requests.sql`](supabase/migrations/20261114190000_print_requests.sql)
after the catalog/storage migration, then apply
[`supabase/migrations/20261115090000_print_requests_reconcile.sql`](supabase/migrations/20261115090000_print_requests_reconcile.sql)
to an existing project, then
[`supabase/migrations/20261115120000_print_request_rate_limit_shape.sql`](supabase/migrations/20261115120000_print_request_rate_limit_shape.sql),
and finally
[`supabase/migrations/20261115130000_print_request_rate_limit_ip_hash.sql`](supabase/migrations/20261115130000_print_request_rate_limit_ip_hash.sql).
The reconciliation migration is additive and idempotent; it adds the
idempotency and aggregate columns (`client_token`, `client_hash`, `file_count`,
`total_bytes`) that the live project was missing. The shape migration is DDL-only: it drops
every stale overload of the rate-limit RPC and recreates the table-returning
`consume_print_request_rate_limit`, which the API expects (a legacy boolean-returning overload
would otherwise turn every allowed request into a 429). The final migration aligns the
private ledger with the live schema (`ip_hash`, `window_started_at`, `request_count`,
`updated_at`): it upgrades older development tables in place without deleting counters,
then recreates the RPC using those columns. Together they create or preserve:

- `public.print_requests` with statuses `uploading`, `pending`, `reviewing`, `quoted`,
  `approved`, `completed`, `rejected`, `cancelled`, plus a numeric `request_number`
  (bigint identity starting at 1000), `is_read`, `admin_notes` and `client_token`;
- `public.print_request_files` with `original_filename`, `file_extension`, `mime_type`,
  `size_bytes` and an `upload_status` of `pending`, `uploaded` or `failed`;
- the private `private.print_request_rate_limits` table and
  `consume_print_request_rate_limit(p_ip_hash, p_max_requests, p_window_seconds)`;
- administrator-only RLS on both public tables (no anonymous `insert`, `update` or
  `delete`), and
- the private `print-request-files` bucket with administrator-only storage policies.

The public API uses a server-only privileged client created from `SUPABASE_SECRET_KEY`; the
key must be an `sb_secret_...` key (never the publishable key) and is never sent to the
browser. Add the migrations, the bucket (private) and the variables above to enable the
feature. Without them the page still renders and the API answers with a clear "not
configured" error.

### Vercel environment scopes for print requests

The public API needs every variable below in **both** the Production and Preview scopes.
Vercel keeps those scopes separate, so a Preview deployment can return `503
NOT_CONFIGURED` even when Production works.

| Variable | Scope | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production + Preview | Supabase project URL. |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Production + Preview | Publishable key only. |
| `SUPABASE_SECRET_KEY` | Production + Preview | Server-only `sb_secret_...` key; never `NEXT_PUBLIC_*`. |
| `PRINT_REQUEST_RATE_LIMIT_SECRET` | Production + Preview | Server-only HMAC salt, at least 16 characters. |

When `PRINT_REQUEST_RATE_LIMIT_SECRET` is missing or too short, the route returns `503`
with `{ "error": "NOT_CONFIGURED" }` and logs the variable name plus the response
`x-request-id`. When the privileged Supabase client is not configured, the service logs
the missing variable names and the same correlation id. Values, customer data, tokens and
authorization headers are never logged. Add the variable in Vercel, then redeploy; an
existing deployment does not pick up a new environment variable automatically.

The signed TUS route verifies each `x-signature` token against the exact bucket and object
path before writing, so uploads succeed with the private bucket's administrator-only
policies. No anonymous `insert` policy on `storage.objects` is needed or wanted.

### Admin requests

- Sidebar item **Requests** (EN/AR) with an unread badge. The dashboard polls
  `getUnreadPrintRequestCount` every 40 seconds and on window focus/refresh events; no new
  anonymous Realtime channel is opened.
- Each detail page marks the request read on open and exposes status updates, internal notes,
  file downloads, a WhatsApp link and a storage-first delete (the row is kept when storage
  cleanup fails so the administrator can retry).

## Internationalization and RTL

- Routes are always locale-prefixed: `/en/...` and `/ar/...`. Arabic is the
  default locale, so unprefixed URLs redirect to their `/ar` equivalent.
- `<html lang>` and `<html dir>` are set per locale; Arabic renders RTL.
- Layouts use logical CSS properties (`ms-*`, `me-*`, `start-*`, `end-*`, `ps-*`, `pe-*`)
  and direction-aware icons.
- The language switcher preserves the current path, query string and hash fragment.
- Product, category, profile and admin content is fully translated in both languages.
- Metadata includes canonical URLs and `hreflang` alternates for each public page.

## Admin authentication and authorization

Admin access uses Supabase Auth with SSR cookie sessions.

| File | Role |
| --- | --- |
| `src/lib/supabase/client.ts` | Browser client (singleton) for future client-side Supabase use |
| `src/lib/supabase/server.ts` | Request-scoped server client using `next/headers` cookies |
| `src/lib/supabase/proxy.ts` + `src/proxy.ts` | Refresh tokens and rotate cookies on `/en/admin` and `/ar/admin` |
| `src/lib/actions/admin-auth.ts` | Server actions for `signInWithPassword` and sign-out |
| `src/lib/actions/admin-password.ts` | Re-authenticates and updates the signed-in admin password |
| `src/lib/auth/admin.ts` | Verifies claims with `getClaims()` and checks `public.admin_users.user_id` |

Behavior:

- Unauthenticated `/admin` requests redirect to the localized login page.
- Valid credentials for a user not listed in `public.admin_users` are signed out and denied
  with a localized message.
- Authorized administrators reach the dashboard; logout revokes the session.
- Public storefront routes never require authentication.
- There is no public signup. Passwords and access tokens are never stored manually in
  localStorage, and user-editable metadata is never the source of admin privileges.
- Database RLS remains the final authorization layer; the server check is defense in depth.

### RLS requirement

The signed-in administrator needs a `select` policy/grant on `public.admin_users` for their
own row (`user_id = auth.uid()`), or an equivalent security-definer function. Without it,
the server correctly denies access even for a valid account.

### Password management

Administrators change their own password from the profile page.

- `src/schemas/admin-password.ts` requires at least 8 characters, a matching confirmation and
  a new password that differs from the current one.
- `src/lib/actions/admin-password.ts` re-authenticates the same account with
  `signInWithPassword({ email, password: currentPassword })` before calling
  `updateUser({ password })`. A wrong current password, a weak password, rate limiting and an
  unauthorized session each return a distinct localized error.
- Only the signed-in administrator's own password can be changed. Managing other accounts
  would require a server-only service-role key, which is intentionally not part of this app.
- The credential-rotation flow is not automated end-to-end because it would change the real
  administrator password; the credentialed admin suite asserts the form instead.

### Admin catalog data

The admin workspace persists catalog records in Supabase through authenticated server
actions in `src/lib/actions/admin-catalog.ts`.

| Table | Admin behavior |
| --- | --- |
| `public.categories` | Full CRUD, visibility toggle, deletion blocked while products reference the category. No image column or upload UI. |
| `public.products` | Full CRUD, visibility and featured toggles, main image in `image_path`. Product SKU is derived from the first variant because the table has no SKU column. |
| `public.product_variants` | Saved with the product form: bilingual size labels, price, SKU, active flag and an independent `image_path`. Variants inherit the product currency. |

Mutations re-fetch the catalog through `loadAdminCatalog()` in the admin data provider.
Activity and profile metadata still use `localStorage` (`tello.demo.v1`); the reset action
clears only that demo workspace data and does not touch Supabase rows.

Categories must exist in Supabase before a product can be created. Product creation also
requires the Storage and table policies above to be applied.

## Validation and forms

Zod schemas in `src/schemas/` are shared by React Hook Form and the admin server actions.

- Product: bilingual names/descriptions, slug, category, price, currency, active/featured
  flags and an optional variants array. Each variant validates bilingual size labels, price,
  SKU and active status.
- Category: bilingual names/descriptions, slug and visibility. Categories have no image
  fields.
- Contact: name, email, optional phone and message, validated in the browser.
- Login and profile forms.

Server action errors such as duplicate slug/SKU and missing categories are mapped to
localized field errors, and image validation errors are surfaced next to the upload field.

## Accessibility and responsive behavior

- Skip link, semantic landmarks, visible focus states and keyboard-operable menus/dialogs.
- Radix primitives provide focus trapping and `aria-*` wiring; close labels are localized.
- Images have localized alt text and a themed fallback for missing/broken sources.
- `prefers-reduced-motion` is respected by the splash and transitions.
- Tested layouts target 360, 390, 768, 1024 and 1440 px, with a responsive admin sidebar
  that becomes a sheet below `lg`.

## Hero artwork

The homepage hero uses a single static illustration, `public/images/printing-equipment.svg`,
rendered with `next/image` at a fixed aspect ratio. It shows a multifunction copier, a desktop
printer, paper and ink supplies in a warm neutral showroom. There is no WebGL, canvas or
client-side scene code, so the hero is part of the server-rendered HTML and adds no extra
JavaScript.

- The illustration is decorative next to the localized headline and calls to action.
- `width`/`height` are declared, so the image reserves space and does not shift the layout.
- The alt text is localized in both message catalogs.
- Replace the SVG with licensed product photography when it is available; keep the 1000×760
  aspect ratio or update the declared dimensions to avoid layout shifts.

### Brand palette and design tokens

The official Tello palette is defined once in `src/app/globals.css` and exposed to Tailwind
through `@theme inline`. Components use semantic tokens instead of raw hex values:

| Token              | Value     | Usage                                       |
| ------------------ | --------- | ------------------------------------------- |
| `--brand-black`    | `#000000` | Dark surfaces, footer, logo contrast        |
| `--brand-primary`  | `#CC1E5D` | Primary buttons, links, active states       |
| `--brand-hover`    | `#B41F54` | Primary hover states                        |
| `--brand-active`   | `#A72353` | Pressed and selected interactive states     |
| `--brand-secondary`| `#BB3665` | Secondary accents and decorative highlights |

Semantic aliases (`--background`, `--card`, `--foreground`, `--muted-foreground`,
`--border`, `--primary`, `--primary-text`, `--sidebar-*`, `--ring`) map onto those
constants per theme. Both themes use the same exact pink fills; only neutral surfaces and
text change. `--primary-text` is a small-text alias so accent copy keeps AA contrast on
black in dark mode while filled controls stay on the exact brand pink.

The public header logo links to the localized dashboard sign-in (`/admin/login`), and the
dashboard logo links to the overview. `tests/e2e/brand.spec.ts` asserts the exact palette,
button hover/pressed states and both logo destinations in English and Arabic.

### Theme, RTL and accessibility

- Light mode is the default for first-time visitors. The theme switcher still offers light,
  dark and system, and an explicit choice is stored in the browser.
- Theme tokens are defined for both modes in `src/app/globals.css`; the public splash uses
  the active background and logo treatment, so it follows light and dark mode.
- Layouts use logical properties (`ms-*`, `me-*`, `start-*`, `end-*`), so English stays LTR
  and Arabic stays RTL without duplicated styles.
- Reduced motion is respected by the splash and transitions.

## Tests

```bash
npm run lint
npm run typecheck
npm test
npm run build
npm run e2e
```

Coverage includes:

- Locale configuration, text direction and metadata alternates.
- WhatsApp normalization, order messages, missing configuration and invalid numbers.
- Catalog search across both languages, category filtering, sorting and statistics.
- Public catalog row filtering: inactive categories/products, inactive-category exclusion,
  missing or invalid data, variant currency inheritance and variant ordering.
- Product rendering in English and Arabic, including the unconfigured WhatsApp state.
- Contact/product/category/login validation.
- Image validation: JPEG/PNG/WebP signatures, extension matching, the 10 MB limit, safe
  path generation and path ownership checks.
- Demo repository CRUD, uniqueness errors, category deletion guard and reset.
- Print request attachments: extension whitelist, declared-type checks, size/count/total
  limits, name sanitization, storage path shape and header signatures for PDF, PNG, JPEG,
  WebP, ZIP/3MF and text CAD formats, including disguised executables and HTML/SVG.
- Print request validation: international phone handling, field length limits, submission
  IDs, locale, optional attachments and oversized/over-count metadata.
- Print request rate limiting: proxy header precedence, HMAC hashing, secret length,
  production fail-closed behavior, and the table-returning RPC response shape.
- Print request service: invalid payload/honeypot rejection before database access,
  rate-limit responses, pending requests without files, uploading requests with
  server-chosen signed targets, completion size/existence checks and `uploading` → `pending`.
- Print request upload client: the signed `/upload/resumable/sign` endpoint, the
  `x-signature` header (and the absence of `apikey`/`authorization`), 6 MiB chunks,
  bucket/path metadata, independent uploads per attachment, missing-token refusal,
  progress mapping, abort and safe error mapping.
- Admin request mapping: database rows to dashboard summaries/details without exposing
  storage paths.
- Admin authorization: claim verification, `admin_users` membership, error handling, and
  sign-in/sign-out server-action outcomes (mocked Supabase, no live credentials).
- Password changes: schema rules (8 characters, confirmation, unchanged password) and
  server-action outcomes (authorization, re-authentication, rate limits, weak passwords).
- Locale preservation and theme selection.
- Brand palette: exact token values in light/dark and English/Arabic, button hover/pressed
  colors, and header-logo navigation to the homepage.
- Mobile navigation.
- Hero artwork: static optimized illustration, localized alt text, mobile viewport and RTL layout.
- End-to-end public flows (category overview, category filtering, product detail navigation,
  breadcrumbs, language/RTL, theme, WhatsApp guidance, contact validation, 404, mobile menu).
  Catalog tests discover the currently published Supabase categories and products, so they
  work against an empty or partially populated project.
- End-to-end admin authentication: unauthenticated redirects, invalid credentials, password
  visibility, English/Arabic direction, light/dark themes, and the absence of a signup route.
- End-to-end authenticated flows (authorized sign-in, session persistence, non-admin denial,
  logout) run when `E2E_ADMIN_*` and `E2E_NON_ADMIN_*` are present in `.env.local`; otherwise
  those tests are reported as skipped.
- End-to-end admin catalog flows (product + variant CRUD, category CRUD and deletion guard,
  profile persistence, reset, RTL switch) share the same credential gate.
- End-to-end upload authorization: an anonymous request to `/api/admin/uploads` is rejected
  with `401` even when admin credentials are absent.
- End-to-end print requests: English form validation, Arabic RTL layout, multi-file selection
  and removal, unsupported extension and 50 MB rejection, mobile overflow in both locales,
  dark-mode rendering, and the unauthenticated admin redirect/download guard. Submission,
  admin list/detail/status/delete, a real signed-resumable upload, upload retry and the
  destructive rate-limit test are gated on live configuration and the opt-in flags above.

## Future roadmap

Supabase Auth, SSR sessions, server-side admin authorization, admin catalog CRUD, Storage
uploads and the public Supabase catalog are implemented.

1. **Repository factory** — `src/repositories/index.ts` remains the composition point for
   activity and profile data. Replace `createMockRepositories()` with a Supabase
   implementation when those tables are ready.
2. **Activity feed** — persist admin actions server-side instead of the browser-local demo
   activity store.
3. **Contact submissions** — replace the simulated submit in
   `src/components/public/contact-form.tsx` with a server action or route handler that
   revalidates with the same Zod schema and records the request.
4. **Tests** — run integration tests against the live Supabase project, and keep the
   credentialed Playwright suite running in CI with dedicated admin/non-admin accounts.

## Known limitations

- Public catalog reads require `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; without them the storefront renders empty states.
- Activity and profile metadata remain browser-local demo data.
- Admin sign-in requires the user's UUID in `public.admin_users` **and** the policies in
  `supabase/migrations/20261114000000_catalog_storage_admin.sql` (or equivalent) applied to
  the project.
- Uploads cannot be exercised end to end until the Storage policies are applied and at least
  one category exists in `public.categories`.
- Contact submissions are validated but not delivered.
- Print requests require `SUPABASE_SECRET_KEY`, all four print-request migrations (the second
  reconciles an existing project, the third fixes the rate-limit RPC return shape, the fourth
  aligns the ledger with the live `ip_hash` column), the
  private `print-request-files` bucket and (in
  production) a rate-limit secret. Without them the public page renders but
  submissions answer "not configured", and the admin Requests pages will error until the
  migrations are applied.
- WhatsApp ordering requires `NEXT_PUBLIC_WHATSAPP_NUMBER`; without it the UI explains how
  to configure the integration.
- No real contact details or social accounts are included by default.
- Sample product prices are illustrative and displayed in USD.
- Artwork is local illustrative SVG; replace it with production photography.
- The hero illustration is an original vector scene, not a real product photo. Replace it with
  licensed showroom photography when it is available.
