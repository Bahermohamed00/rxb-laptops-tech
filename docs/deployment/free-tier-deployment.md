# Free-tier testing deployment

This guide prepares the existing monorepo for separate Cloudflare Pages Storefront and Admin projects, one Render Free Web Service, Neon PostgreSQL, and Cloudinary image storage. It does not create resources or deploy anything.

The result is a **catalog and inquiry/testing deployment**, not a complete online store. Provider free-tier limits, sleeping/cold starts, storage quotas, and availability can change; confirm current provider terms before use.

The tested release is the GitHub branch `release/v1.0.0`. Deploy only from that branch (or a later reviewed commit on it), never from a local working copy.

## Go-live runbook: when each account is needed

Do the steps in this order. Each step names the account it needs; nothing earlier requires any account. Enter secrets directly into the provider dashboards; never paste them into chat, Git, or this guide.

1. **Neon (account needed).** Create a *new* project (for example `rxb-production`, PostgreSQL 16 or newer, a nearby region). Copy the pooled connection string (`DATABASE_URL`) and the direct/non-pooled one (`DIRECT_DATABASE_URL`) into a local, git-ignored file `apps/api/.env.production.local` on the release machine. Confirm the database is new and empty (see "Production migrations and first Admin"), then run the migrations. No other account is needed for this step.
2. **Cloudinary (account needed).** Create a free account and note the cloud name, API key, and API secret (Settings → API Keys). They are only entered into Render in step 3.
3. **Render (account needed, GitHub access).** New → Blueprint → select this repository; Render reads `render.yaml` (Free web service `rxb-api`, branch `release/v1.0.0`). Fill the prompted secrets: both Neon URLs, the three Cloudinary values, and `CORS_ORIGINS` (use a placeholder such as `https://rxb-storefront.pages.dev,https://rxb-admin.pages.dev` and correct it in step 5 once the Pages names are final). Deploy and wait for `https://<service>.onrender.com/api/ready` to return 200.
4. **Cloudflare (account needed, GitHub access).** Create the two Pages projects described below (Storefront and Admin). Their variables need the Render URL from step 3.
5. **Render again.** Set `CORS_ORIGINS` to the exact final Storefront and Admin `https://….pages.dev` origins and redeploy.
6. **First Admin.** From the release machine, run `npm run create:admin` with `DATABASE_URL` pointing to Neon (it prompts for a masked password; never pass it on the command line).
7. **Verify** with the checklist at the end of this guide.

## Application scope

| Area | Current status |
|---|---|
| Storefront catalog | API-backed active laptop and supported accessory listings, filters, search, price sorting, and availability. |
| Product detail | Direct `/products/:slug` route; laptop options are compatibility-filtered and prices are confirmed by the API. Accessory details use listed price/specs. |
| Product images | Local disk in development; Cloudinary-backed uploads and redirects in production. Existing local image files must be migrated to Cloudinary before a database containing those image rows is moved to a hosted API. |
| Admin authentication | API-backed Argon2id login, opaque database session cookie, session refresh, logout, roles, Origin checks, and CSRF validation. |
| Product management | API-backed product create/edit/archive with SKU, catalog filters, and ordered multi-image galleries. Installed laptop hardware changes use a separate reasoned operation. |
| Accessory categories | API-backed category create/edit/archive (six defaults are seeded by migration). Accessories must belong to an active category. Category changes are not written to the audit log. |
| Dashboard | Overview shows live product counts and available units. Revenue, orders, and low-stock alerts are shown as unavailable because no such data exists. |
| Inventory | New laptops are created with a unique serial number as individually tracked units (`INDIVIDUAL`, stock 1) and can be marked SOLD or REMOVED once, with a reason. Accessories (and any pre-existing legacy rows) use reasoned quantity adjustments recorded in `InventoryAdjustment`. |
| Orders, Customers, Reports | Disconnected interface placeholders. No corresponding business APIs are implemented. |
| Checkout and payment | Not implemented. No cart, order placement, payment processor, or payment transaction exists. Storefront payment labels are not a payment integration. |
| WhatsApp | Public inquiry links include the product URL, product/configuration details, and listed/confirmed informational price. A WhatsApp inquiry is not an order. The business number is hardcoded in `apps/storefront/src/config/business-contact.ts`; verify it before launch. |
| Audit log | Append-only `AuditEvent` records for product create/update/archive, quantity adjustments, laptop sale/removal, and hardware changes, plus administrator sign-in success/failure and session revocation; viewable and filterable in Admin → Audit. Category changes are not audited. |

## Domain and cookie requirements

The Admin session cookie is `HttpOnly`, `Secure` in production, `SameSite=Lax`, host-only, and scoped to `Path=/api`. Provider defaults such as `*.pages.dev` and `*.onrender.com` are unrelated sites, so a browser may refuse that cookie if the Admin calls Render directly.

**Default free domains (this release):** the Admin Pages project ships `apps/admin/public/_worker.js`, a Cloudflare Pages advanced-mode worker that proxies same-origin `https://<admin>.pages.dev/api/*` to the Render API. The browser only talks to the Admin origin, so the cookie is first-party. The worker preserves `Origin`, `Cookie`, and `X-CSRF-Token` (the API Origin and CSRF guards still apply), replaces any client-supplied `X-Forwarded-For` with Cloudflare's `CF-Connecting-IP`, strips CORS response headers (not needed same-origin), and serves `index.html` for unknown non-API paths. The Storefront needs no cookies and calls Render directly.

Known limitation: with `TRUST_PROXY_HOPS=1`, Admin requests that pass through the worker are rate-limited by Cloudflare's egress address rather than the end user's address, so Admin login attempts share buckets per Cloudflare egress IP. This is acceptable for a small team; revisit before wider use.

**Custom domain (optional, later):** with three HTTPS subdomains under one registrable domain (for example `shop.`, `admin.`, `api.`), the Admin can call the API host directly and the proxy is unnecessary. The API uses an explicit CORS origin allowlist; never use `*` with credentials.

## Environment variables

### Storefront Cloudflare Pages project

| Variable | Required | Visibility / timing |
|---|---|---|
| `VITE_API_BASE_URL` | Yes for production | Public browser configuration, embedded at build time. Use the HTTPS API URL ending in `/api`. No credentials or secrets. |

There are no other used Storefront `VITE_` variables. WhatsApp contact configuration is currently in source, not environment.

### Admin Cloudflare Pages project

| Variable | Required | Visibility / timing |
|---|---|---|
| `VITE_API_BASE_URL` | Yes for production | Public, embedded at build time. With the default-domain proxy, use the Admin's **own** origin: `https://<admin-project>.pages.dev/api`. No credentials or secrets. |
| `API_ORIGIN` | Yes with the proxy | Runtime variable for `_worker.js` (not `VITE_`, never in the bundle). The Render origin only, for example `https://rxb-api.onrender.com`, with no path. HTTPS is required; plain HTTP is accepted only for loopback testing. |
| `NODE_VERSION` | Recommended | Build-time; set to `24.15.0` to match the API workspace engine. |

There are no other used Admin `VITE_` variables. The session cookie and CSRF token are handled by the browser/API; no secret is placed in browser storage.

### Render API service

| Variable | Required | Visibility / timing |
|---|---|---|
| `NODE_ENV` | Yes | Runtime server setting; set to `production`. |
| `PORT` | Supplied by Render | Runtime listener port. The API binds to `0.0.0.0` in production and uses the supplied port. |
| `DATABASE_URL` | Yes | **Server-only secret.** Neon pooled PostgreSQL URL for API runtime; preserve provider TLS parameters. |
| `DIRECT_DATABASE_URL` | Recommended | **Server-only secret.** Neon direct/non-pooled URL. Prisma migration commands prefer this URL; when omitted they fall back to `DATABASE_URL`. |
| `CORS_ORIGINS` | Yes | Exact HTTPS Storefront and Admin origins, comma-separated (for example `https://rxb-storefront.pages.dev,https://rxb-admin.pages.dev`); do not include paths, trailing slashes, wildcards, or the API origin. The Admin origin is required even with the proxy because the API Origin guard checks it. |
| `CLOUDINARY_CLOUD_NAME` | Yes in production | Server-side Cloudinary account setting. |
| `CLOUDINARY_API_KEY` | Yes in production | Server-only credential. |
| `CLOUDINARY_API_SECRET` | Yes in production | Server-only secret. Never expose it to Vite or logs. |
| `TRUST_PROXY_HOPS` | Yes for Render deployment | Set to the verified Render proxy hop count. The current Render setup starts with one trusted hop; confirm Render’s current forwarding topology and that the service cannot be reached around the trusted proxy. Do not trust arbitrary forwarded headers. |
| `API_RATE_LIMIT`, `API_RATE_TTL_MS` | Optional | General per-IP limit; defaults are 100 requests per 60 seconds. |
| `AUTH_LOGIN_LIMIT`, `AUTH_LOGIN_TTL_MS` | Optional | Login per-IP limit; defaults are 5 attempts per 15 minutes. |
| `ADMIN_SESSION_TTL_MS` | Optional | Session lifetime; default is 8 hours. |
| `PRODUCT_IMAGE_MAX_BYTES` | Optional | Upload limit; default is 5 MiB and maximum is 25 MiB. Keep within Cloudinary plan limits. |
| `RXB_LOCAL_IMAGE_DIR` | Development only | Local filesystem override; not used as production object storage. |
| `RXB_ALLOW_SAMPLE_CATALOG_SEED` | One-off local testing only | Never set for a production deployment. The sample seed also refuses production and non-`rxb_dev` databases. |

Copy `apps/api/.env.example` for local development. Do not copy local `.env` files into Cloudflare, Render, Git, or this guide.

## Cloudflare Pages: Storefront

Create a separate Pages project connected to this repository:

1. Root directory: repository root (`.`).
2. Framework preset: Vite (or static site).
3. Build command: `npm run build:storefront`.
4. Build output directory: `apps/storefront/dist`.
5. Add production environment variables `VITE_API_BASE_URL` = `https://<render-service>.onrender.com/api` and `NODE_VERSION` = `24.15.0`; configure a separate preview value if previews should use a different API.
6. Optionally bind a custom domain later; the default `https://<project>.pages.dev` works.
7. Verify `apps/storefront/public/_redirects` is included in the output. It rewrites client routes to `index.html` without affecting API traffic, because the API is a separate host.

The Storefront production Vite configuration fails the build if `VITE_API_BASE_URL` is missing, malformed, non-HTTPS, or not rooted at `/api`. Local development alone retains the localhost default.

## Cloudflare Pages: Admin

Create another Pages project for the same repository (do not combine it with Storefront):

1. Root directory: repository root (`.`).
2. Framework preset: Vite (or static site).
3. Build command: `npm run build:admin`.
4. Build output directory: `apps/admin/dist`.
5. Environment variables (Production): `VITE_API_BASE_URL` = `https://<admin-project>.pages.dev/api`, `API_ORIGIN` = `https://<render-service>.onrender.com`, `NODE_VERSION` = `24.15.0`.
6. Confirm the deployment includes `_worker.js` (advanced mode). `https://<admin-project>.pages.dev/api/health` must return the API health JSON.
7. Admin routes use URL hashes; the worker serves `index.html` for unknown non-API paths, so reloads work.

Vite embeds `VITE_API_BASE_URL` at build time, so changing it requires a new deployment. `API_ORIGIN` is read by the worker at runtime. None of these values are secrets; never add database, Cloudinary, or other server credentials to Pages.

## Render: NestJS API

Create a single Render Web Service from this repository. The committed `render.yaml` Blueprint encodes the settings below (Free plan, branch `release/v1.0.0`, auto-deploy off):

1. Root directory: repository root.
2. Runtime: Node.js; use Node `24.15.0` or newer compatible with the API workspace engine.
3. Build command: `npm ci --include=dev && npm run build:api`. (`--include=dev` is required: with `NODE_ENV=production`, plain `npm ci` skips the `prisma` and `typescript` dev dependencies and the build fails.)
4. Start command: `npm run start:api`.
5. Health-check path: `/api/health` (process liveness only).
6. Set the server environment variables above, including the host-supplied `PORT`, production origins, `NODE_ENV=production`, and all Cloudinary credentials.
7. The default `https://<service>.onrender.com` URL is sufficient; a custom domain is optional. The Free instance sleeps after inactivity, so the first request after idle can take up to about a minute.
8. Use one API instance. Global and login rate limits are process-local memory, so multiple instances have separate counters and do not provide a shared limit.

The root `start:api` script runs the API workspace start command; its `node .phase1-build/main.js` path is resolved from the API workspace directory. Production startup binds to `0.0.0.0`; development stays on `127.0.0.1`. API startup connects to PostgreSQL and fails closed if the database cannot be reached. `/api/ready` returns 503 when its database probe fails and does not reveal the underlying error.

`TRUST_PROXY_HOPS` defaults to `0`. Set it to `1` for the expected Render reverse-proxy topology only after verifying current provider behavior and that incoming forwarded headers are replaced by the trusted edge. Incorrect proxy trust can let clients spoof IPs and evade rate limits.

## Neon PostgreSQL

Create a PostgreSQL project/database in Neon. Keep both connection strings server-side:

- `DATABASE_URL`: use Neon’s pooled endpoint (hostname commonly includes `-pooler`) for the long-running API connection.
- `DIRECT_DATABASE_URL`: use Neon’s direct/non-pooled endpoint for Prisma schema migrations and administrative operations.

Keep the TLS/SSL parameters provided by Neon and URL-encode reserved characters in credentials. The `pg` driver treats `sslmode=require` as full certificate verification and logs a deprecation warning; replacing it with `sslmode=verify-full` keeps the same behavior without the warning (Neon uses publicly trusted certificates). Prisma 7 is configured with the PostgreSQL driver adapter `@prisma/adapter-pg`; the Prisma CLI uses the direct URL when available. No database or hosted endpoint was provisioned during this task.

## Cloudinary

Create a Cloudinary account and retrieve the cloud name, API key, and API secret from its account settings. Add those three values only to the Render API environment. Production startup requires all three values; partial or missing Cloudinary settings fail environment validation.

The API accepts bounded `application/octet-stream` uploads and verifies JPEG, PNG, or WebP content from the bytes (not a browser filename/MIME claim). It signs requests server-side, uses a generated non-overwrite public ID, stores the provider ID and HTTPS URL alongside existing image metadata, and redirects the stable `/api/public/images/:id` route to Cloudinary. API responses and browser bundles never include the API secret. Cloudinary operations are tested with mocked fetch responses; no provider requests are part of automated tests.

The migration adds nullable Cloudinary metadata, preserving existing image rows as local-file records. Files in an existing developer `.local-images` directory are not automatically copied. Before moving a database that contains local image rows to a hosted API, use an explicit reviewed export/upload procedure while the old files are available; otherwise those old image rows will return not found on the new host.

## Production migrations and first Admin

The release migration history is, in order: `20261026190000_admin_auth_foundation`, `20261027100000_product_catalog`, `20261027113000_inventory_adjustments`, `20261027120000_upgrade_combinations`, `20261028130000_product_use_case`, `20261028160000_accessory_products`, `20261028180000_accessory_product_specs`, `20261029120000_individual_inventory_audit`, `20261029150000_accessory_categories` (adds SKU and categories and seeds six default categories), `20261031120000_product_image_gallery`, and `20261102100000_cloudinary_product_images`. Serial tracking fields default to `LEGACY_QUANTITY` and do not convert existing quantities. Database check constraints in these migrations remain SQL-enforced; Prisma schema language does not express them.

Before any real migration:

1. Review every pending SQL file and confirm the target is the **new** Neon production project.
2. Put both Neon URLs in `apps/api/.env.production.local` (git-ignored by the `.env.*` rule). Prisma's `dotenv/config` only loads `apps/api/.env` (your local development database) and never overrides variables already set, so export the production file into the shell explicitly:

   ```bash
   set -a; . apps/api/.env.production.local; set +a   # from the repository root, on the release checkout
   npm run db:check-empty:api      # read-only; prints host + database name only; must print EMPTY
   npm run migrate:status:api      # must list all eleven migrations as not yet applied
   npm run migrate:deploy:api      # the deliberate release operation
   npm run migrate:status:api      # must report "Database schema is up to date!"
   ```

   Stop if `db:check-empty:api` reports anything other than EMPTY, or if the printed host/database is not the new Neon project. Never use `prisma db push` or `prisma migrate dev` against production.
3. Only after migration success, deploy the API and provision the first Admin interactively with `npm run create:admin` (same shell, so `DATABASE_URL` points to Neon). The command prompts for a masked password, hashes it with Argon2id, and refuses if any Admin exists. Never pass the password on a command line or use sample credentials. Close the shell afterwards so the production URLs do not linger.

Release verification (2026-11-03): all eleven migrations applied in order to fresh, empty, disposable PostgreSQL 16 containers bound to `127.0.0.1` (from the working tree and again from a fresh clone of `release/v1.0.0`); Prisma reported the schema current and `prisma migrate diff` against `schema.prisma` was empty. This verifies fresh databases, not an existing database with user data. No hosted database was contacted.

## Deployment verification

After the infrastructure is created, verify in a real browser (do not infer cookie behavior from Node tests alone):

1. `https://<service>.onrender.com/api/health` returns process status and `/api/ready` returns 200 only when Neon is reachable. Expect the first request after idle to be slow (Free instance cold start).
2. `https://<admin-project>.pages.dev/api/health` returns the same JSON through the Admin proxy.
3. Storefront home and `/laptops` load products from Neon; direct-load and refresh `/about`, `/laptops`, and `/products/<slug>`.
4. A product image uploaded in Admin is served from `res.cloudinary.com` (the API's `/api/public/images/:id` responds with a redirect) on both Admin and Storefront.
5. Admin login sets a `Secure; HttpOnly; SameSite=Lax` cookie on the Admin origin with `Path=/api`; reload keeps the session; logout ends it.
6. Create a laptop with a serial number and an accessory in a category; adjust accessory quantity with a reason; mark the laptop SOLD; confirm the Audit page lists these actions and the Overview counts change. Upload, view, and delete an unattached test image.
7. Confirm Orders, Customers, and Reports remain placeholders and nothing advertises checkout or payment.
8. Check the browser console and network panels for errors on each page; the only expected 401 is the session check before sign-in.
