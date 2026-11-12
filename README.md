# Tello Printing Center — Phase 1 Frontend

A production-quality bilingual storefront for a professional printing equipment retailer
and supplier, plus a development-only demo admin workspace. Built with the Next.js App
Router, React Server Components, strict TypeScript, Tailwind CSS and shadcn/ui.

- **Public site:** English and Arabic, full RTL support, light/dark/system themes, product
  search and category filtering, localized metadata, sitemap and robots.
- **Product catalog:** 3D printers, 3D printing filaments and materials, DTF printers and
  equipment, UV printers and equipment, industrial and commercial printing machines,
  printing inks and consumables, and printer parts and accessories.
- **Admin demo:** development-only login, catalog overview, product and category CRUD,
  profile preferences and demo-data reset. All demo data lives in the browser.

> The dashboard is intentionally unavailable in production builds. It is replaced by a
> disabled screen until real authentication and server-side authorization are connected.

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
- Arabic site — <http://localhost:3000/ar>
- Admin demo — <http://localhost:3000/en/admin>

The root URL redirects to the detected locale, falling back to English. In the public
header, the Tello logo links to the admin sign-in page (`/en/admin/login` or
`/ar/admin/login`) as requested for this Phase 1 build.

### Environment variables

All variables are public (`NEXT_PUBLIC_*`) and optional. Missing values produce explicit
"not configured" states; the app never invents a phone number, email, address or social URL.

| Variable                        | Purpose                                                                 |
| ------------------------------- | ----------------------------------------------------------------------- |
| `NEXT_PUBLIC_SITE_URL`          | Canonical origin for metadata, JSON-LD, sitemap and WhatsApp messages.  |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`   | WhatsApp business number. Empty disables ordering and shows guidance.   |
| `NEXT_PUBLIC_CONTACT_EMAIL`     | Public contact email. Empty hides the channel.                          |
| `NEXT_PUBLIC_CONTACT_PHONE`     | Public phone number. Empty hides the channel.                           |
| `NEXT_PUBLIC_CONTACT_ADDRESS_EN`| English street address.                                                 |
| `NEXT_PUBLIC_CONTACT_ADDRESS_AR`| Arabic street address.                                                  |
| `NEXT_PUBLIC_SOCIAL_LINKEDIN`   | LinkedIn profile URL (must be `http`/`https`).                          |
| `NEXT_PUBLIC_SOCIAL_INSTAGRAM`  | Instagram profile URL (must be `http`/`https`).                         |
| `NEXT_PUBLIC_SOCIAL_X`          | X / Twitter profile URL (must be `http`/`https`).                       |
| `NEXT_PUBLIC_HERO_PRINTER_MODEL`| Optional licensed GLB for the homepage hero (see [3D hero scene](#3d-hero-scene)). |

`NEXT_PUBLIC_SITE_URL` defaults to `http://localhost:3000` when absent or invalid.

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
| Three.js                | `0.187.0` |
| React Three Fiber       | `9.8.2`  |
| Drei                    | `10.7.9` |

Fonts are provided by the local `geist` package; Arabic uses the platform's system UI
stack. No build-time Google Fonts request is required.

## Project structure

```text
messages/                     English and Arabic message catalogs (key parity enforced)
public/images/                Local SVG product and category artwork
public/models/                 Hero 3D asset slot, poster fallback and licensing notes
src/app/[locale]/             Localized routes
  (public)/                   Storefront, catalog, product detail, contact, 404
  admin/                      Dev-only dashboard and login
src/app/sitemap.ts            Localized sitemap with hreflang alternates
src/app/robots.ts             Robots policy (admin routes disallowed)
src/components/
  3d/                         Lazy hero scene, printer model, lights, fallbacks
  admin/                      Dashboard shell, CRUD managers, forms
  layout/                     Header, footer, splash, theme/locale switchers
  public/                     Homepage sections, cards, catalog, WhatsApp CTA
  shared/                     Media fallback, empty states, section headings
  ui/                         shadcn/ui primitives
src/config/site.ts            Public environment configuration
src/data/                     Seed catalog and localStorage demo store
src/domain/                   Typed Product, Category, Activity, Profile models
src/i18n/                     Routing, navigation, request configuration
src/lib/                      Formatting, slugs, WhatsApp, image upload, metadata
src/repositories/             Repository interfaces, mocks, public catalog reader
src/schemas/                  Shared Zod validation schemas
src/services/                 Catalog selectors and demo auth
src/stores/                   Admin session store (sessionStorage)
tests/unit/                   Vitest + Testing Library tests
tests/e2e/                    Playwright specs
```

## Internationalization and RTL

- Routes are always locale-prefixed: `/en/...` and `/ar/...`.
- `<html lang>` and `<html dir>` are set per locale; Arabic renders RTL.
- Layouts use logical CSS properties (`ms-*`, `me-*`, `start-*`, `end-*`, `ps-*`, `pe-*`)
  and direction-aware icons.
- The language switcher preserves the current path, query string and hash fragment.
- Product, category, profile and admin content is fully translated in both languages.
- Metadata includes canonical URLs and `hreflang` alternates for each public page.

## Admin demo (development only)

The dashboard gate is `process.env.NODE_ENV === "development"` in
`src/app/[locale]/admin/layout.tsx`. In a production build, `/admin` renders a disabled
notice with no dashboard data or forms.

**Demo sign-in:** any syntactically valid email and any password of at least 8 characters.
No credentials are stored, checked or sent anywhere. This is intentionally not an
authentication system.

Demo state:

- Products, categories, activity and profile are seeded in `src/data/seed/`.
- Changes are persisted to `localStorage` under `tello.demo.v1`.
- The admin session is persisted to `sessionStorage` under `tello.admin.session.v1`.
- **Reset demo data** in the admin sidebar restores the seed catalog.
- Uploaded images are resized in the browser and stored as data URLs in localStorage.

### Important limitation

The public storefront reads the read-only seed catalog through
`src/repositories/public-catalog.ts` on the server. It **does not** reflect edits made in
the browser demo admin. This is deliberate for Phase 1: it keeps the public site cacheable
and demonstrates the RSC boundary. Phase 2 replaces both data paths with Supabase.

## Validation and forms

Zod schemas in `src/schemas/` are shared by React Hook Form and are designed to be reused
server-side in Phase 2.

- Product: bilingual names/descriptions, SKU, slug, category, price, currency, image and
  alt text, active/featured flags.
- Category: bilingual names/descriptions, slug, image and alt text, visibility.
- Contact: name, email, optional phone and message, validated locally in the demo.
- Login and profile forms.

Repository errors such as duplicate SKU/slug and category-with-products are mapped to
localized field errors or dialogs.

## Accessibility and responsive behavior

- Skip link, semantic landmarks, visible focus states and keyboard-operable menus/dialogs.
- Radix primitives provide focus trapping and `aria-*` wiring; close labels are localized.
- Images have localized alt text and a themed fallback for missing/broken sources.
- `prefers-reduced-motion` is respected by the splash and transitions.
- Tested layouts target 360, 390, 768, 1024 and 1440 px, with a responsive admin sidebar
  that becomes a sheet below `lg`.

## 3D hero scene

The homepage hero includes an optional, decorative 3D printer scene built with Three.js,
React Three Fiber and Drei. It complements the server-rendered hero copy, buttons and
catalog links; no content or navigation depends on it.

| File                                          | Role                                                        |
| --------------------------------------------- | ----------------------------------------------------------- |
| `src/components/3d/lazy-3d-container.tsx`     | Interaction-gated loader, capability checks, error boundary |
| `src/components/3d/hero-3d-scene.tsx`         | Canvas, camera rig, turntable rotation, visibility handling  |
| `src/components/3d/printer-model.tsx`         | Procedural printer and optional licensed GLB loader          |
| `src/components/3d/scene-lights.tsx`          | Theme-aware lighting                                         |
| `src/components/3d/scene-fallback.tsx`        | Static poster fallback                                       |
| `public/models/hero-printer-poster.svg`       | Static poster (about 8 KB)                                   |

### Loading and performance strategy

- The scene is **client-only** and loaded through `React.lazy` + `Suspense`, so Three.js is
  not part of the initial server render or the first-load JavaScript chunk.
- The chunk is fetched only after the first pointer, scroll or key interaction, with a
  10-second fallback timer. Lighthouse and no-JavaScript visits stay on the poster.
- WebGL support is probed at activation time, not on mount, to avoid paying context-creation
  cost during first paint.
- Rendering pauses when the hero leaves the viewport, and the canvas is limited to a
  sensible device pixel ratio. There is one canvas for the whole homepage; product cards
  never mount their own.
- The poster is used for viewports below `768px`, `prefers-reduced-motion: reduce`,
  low-memory/low-core or save-data devices, missing WebGL, context loss and runtime errors.
- The procedural model uses primitives and no textures, keeping the scene small. Set
  `NEXT_PUBLIC_HERO_PRINTER_MODEL` to a licensed, optimized GLB to replace it; see
  `public/models/README.md` for licensing, compression, triangle and texture guidance.

### Theme, RTL and accessibility

- Lighting and canvas backdrop follow the active light/dark theme; the canvas itself is
  transparent over a theme-aware CSS gradient.
- The hero uses logical layout properties, so the scene stays in the visual column that
  matches LTR and RTL reading order without overlapping Arabic copy.
- The canvas is decorative (`aria-hidden`) and non-interactive for assistive technology.
  All hero actions remain normal keyboard-accessible links and buttons.
- Reduced motion disables the turntable and falls back to the static poster.

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
- Product rendering in English and Arabic, including the unconfigured WhatsApp state.
- Contact/product/category/login validation.
- Demo repository CRUD, uniqueness errors, category deletion guard and reset.
- Locale preservation and theme selection.
- Mobile navigation.
- Hero 3D: poster fallback, reduced motion, mobile viewport, RTL layout and hydration safety.
- End-to-end public flows (search, filters, language/RTL, theme, WhatsApp guidance,
  contact validation, 404, mobile menu) and admin flows (login, product CRUD, category
  CRUD and deletion guard, profile persistence, reset, RTL switch).

## Phase 2: Supabase integration points

The UI depends on interfaces rather than mock implementations, so the backend can be
swapped without rewriting components.

1. **Repository factory** — `src/repositories/index.ts` is the single composition point.
   Replace `createMockRepositories()` with a Supabase implementation selected by an
   environment flag. Implement the interfaces in `src/repositories/types.ts`:
   `CategoryRepository`, `ProductRepository`, `ActivityRepository`, `ProfileRepository`,
   `DemoRepository`.
2. **Public catalog** — replace `src/repositories/public-catalog.ts` with server-side
   Supabase queries. Keep the `PublicCatalog` return shape and the existing product/category
   mapping so public components stay unchanged.
3. **Authentication** — replace `src/services/demo-admin-auth.ts` and
   `src/stores/admin-auth-store.ts` with Supabase Auth. Move session handling to cookies and
   verify sessions on the server.
4. **Admin gate** — replace the `NODE_ENV` check in
   `src/app/[locale]/admin/layout.tsx` with a server-side session/role check. Keep or remove
   the client guard in `src/components/admin/admin-shell.tsx` as a UX layer only; it must not
   be the authorization boundary.
5. **Database and RLS** — map `Product`, `Category`, `ActivityEntry` and `UserProfile` to
   tables or views. Enable row-level security: public read for active products/categories,
   authenticated admin writes, and server-side validation of ownership/roles.
6. **Images** — replace `src/lib/image-file.ts` data-URL uploads with Supabase Storage
   buckets and store public URLs. Keep size/type validation and alt text requirements.
7. **Contact submissions** — replace the simulated submit in
   `src/components/public/contact-form.tsx` with a server action or route handler that
   revalidates with the same Zod schema and records the request.
8. **Environment** — add server-only variables for the Supabase URL, anon key and service
   role key. Never expose the service role key to the browser.
9. **Revalidation** — after admin mutations, revalidate affected public paths or use
   Supabase realtime/ISR, so the storefront reflects published changes.
10. **Tests** — point repository integration tests at a local Supabase instance and add
    authenticated Playwright projects once real login exists.

## Known Phase 1 limitations

- Demo authentication is not secure and exists only in development.
- Admin edits persist only in the current browser and do not affect the public site.
- Contact submissions are validated but not delivered.
- WhatsApp ordering requires `NEXT_PUBLIC_WHATSAPP_NUMBER`; without it the UI explains how
  to configure the integration.
- No real contact details or social accounts are included by default.
- Sample product prices are illustrative and displayed in USD.
- Artwork is local illustrative SVG; replace it with production photography.
- The hero 3D printer is an original procedural model, not a real product scan. It is
  decorative only; mobile, reduced-motion and WebGL-unsupported visitors see the poster.
