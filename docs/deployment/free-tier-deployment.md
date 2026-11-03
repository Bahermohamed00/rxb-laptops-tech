# Free-tier testing deployment

This guide prepares the existing monorepo for separate Cloudflare Pages Storefront and Admin projects, one Render Free Web Service, Neon PostgreSQL, and Cloudinary image storage. It does not create resources or deploy anything.

The result is a **catalog and inquiry/testing deployment**, not a complete online store. Provider free-tier limits, sleeping/cold starts, storage quotas, and availability can change; confirm current provider terms before use.

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

Use three HTTPS custom subdomains under one registrable domain, for example:

- Storefront: `shop.example.com`
- Admin: `admin.example.com`
- API: `api.example.com` (custom domain mapped to Render)

The Admin session cookie is host-only for the API, `HttpOnly`, `Secure` in production, and `SameSite=Lax`. No broad cookie `Domain` is needed for sibling subdomains. Cross-origin requests from Admin to API are same-site when all use HTTPS under the same registrable domain.

Provider defaults such as `*.pages.dev` and `*.onrender.com` are unrelated sites. Do **not** assume the Admin cookie will work between those default domains: browser third-party-cookie restrictions can block it. Configure custom domains before testing Admin authentication. The API uses an explicit CORS origin allowlist; never use `*` with credentials.

## Environment variables

### Storefront Cloudflare Pages project

| Variable | Required | Visibility / timing |
|---|---|---|
| `VITE_API_BASE_URL` | Yes for production | Public browser configuration, embedded at build time. Use the HTTPS API URL ending in `/api`. No credentials or secrets. |

There are no other used Storefront `VITE_` variables. WhatsApp contact configuration is currently in source, not environment.

### Admin Cloudflare Pages project

| Variable | Required | Visibility / timing |
|---|---|---|
| `VITE_API_BASE_URL` | Yes for production | Public browser configuration, embedded at build time. Use the same HTTPS API URL ending in `/api`. No credentials or secrets. |

There are no other used Admin `VITE_` variables. The session cookie and CSRF token are handled by the browser/API; no secret is placed in browser storage.

### Render API service

| Variable | Required | Visibility / timing |
|---|---|---|
| `NODE_ENV` | Yes | Runtime server setting; set to `production`. |
| `PORT` | Supplied by Render | Runtime listener port. The API binds to `0.0.0.0` in production and uses the supplied port. |
| `DATABASE_URL` | Yes | **Server-only secret.** Neon pooled PostgreSQL URL for API runtime; preserve provider TLS parameters. |
| `DIRECT_DATABASE_URL` | Recommended | **Server-only secret.** Neon direct/non-pooled URL. Prisma migration commands prefer this URL; when omitted they fall back to `DATABASE_URL`. |
| `CORS_ORIGINS` | Yes | Exact HTTPS Storefront and Admin origins, comma-separated; do not include paths, trailing slashes, wildcards, or API origin. |
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
5. Add production environment variable `VITE_API_BASE_URL` with the API HTTPS base URL ending in `/api`; configure a separate preview value if previews should use a different API.
6. Bind the project to `shop.example.com`.
7. Verify `apps/storefront/public/_redirects` is included in the output. It rewrites client routes to `index.html` without affecting API traffic, because the API is a separate host.

The Storefront production Vite configuration fails the build if `VITE_API_BASE_URL` is missing, malformed, non-HTTPS, or not rooted at `/api`. Local development alone retains the localhost default.

## Cloudflare Pages: Admin

Create another Pages project for the same repository (do not combine it with Storefront):

1. Root directory: repository root (`.`).
2. Framework preset: Vite (or static site).
3. Build command: `npm run build:admin`.
4. Build output directory: `apps/admin/dist`.
5. Add production `VITE_API_BASE_URL` using the API HTTPS base URL ending in `/api`.
6. Bind the project to `admin.example.com`.
7. Verify `apps/admin/public/_redirects` is included. Admin routes use URL hashes; the fallback also keeps the app entry available on reload.

Vite embeds both projects’ `VITE_API_BASE_URL` values at build time. Changing a Pages environment variable requires a new build/deployment. These variables are public; do not add database, Cloudinary, or other server credentials.

## Render: NestJS API

Create a single Render Web Service from this repository:

1. Root directory: repository root.
2. Runtime: Node.js; use Node `24.15.0` or newer compatible with the API workspace engine.
3. Build command: `npm ci && npm run build:api`.
4. Start command: `npm run start:api`.
5. Health-check path: `/api/health` (process liveness only).
6. Set the server environment variables above, including the host-supplied `PORT`, production origins, `NODE_ENV=production`, and all Cloudinary credentials.
7. Configure the Render custom domain `api.example.com` and HTTPS.
8. Use one API instance. Global and login rate limits are process-local memory, so multiple instances have separate counters and do not provide a shared limit.

The root `start:api` script runs the API workspace start command; its `node .phase1-build/main.js` path is resolved from the API workspace directory. Production startup binds to `0.0.0.0`; development stays on `127.0.0.1`. API startup connects to PostgreSQL and fails closed if the database cannot be reached. `/api/ready` returns 503 when its database probe fails and does not reveal the underlying error.

`TRUST_PROXY_HOPS` defaults to `0`. Set it to `1` for the expected Render reverse-proxy topology only after verifying current provider behavior and that incoming forwarded headers are replaced by the trusted edge. Incorrect proxy trust can let clients spoof IPs and evade rate limits.

## Neon PostgreSQL

Create a PostgreSQL project/database in Neon. Keep both connection strings server-side:

- `DATABASE_URL`: use Neon’s pooled endpoint (hostname commonly includes `-pooler`) for the long-running API connection.
- `DIRECT_DATABASE_URL`: use Neon’s direct/non-pooled endpoint for Prisma schema migrations and administrative operations.

Keep the TLS/SSL parameters provided by Neon and URL-encode reserved characters in credentials. Prisma 7 is configured with the PostgreSQL driver adapter `@prisma/adapter-pg`; the Prisma CLI uses the direct URL when available. No database or hosted endpoint was provisioned during this task.

## Cloudinary

Create a Cloudinary account and retrieve the cloud name, API key, and API secret from its account settings. Add those three values only to the Render API environment. Production startup requires all three values; partial or missing Cloudinary settings fail environment validation.

The API accepts bounded `application/octet-stream` uploads and verifies JPEG, PNG, or WebP content from the bytes (not a browser filename/MIME claim). It signs requests server-side, uses a generated non-overwrite public ID, stores the provider ID and HTTPS URL alongside existing image metadata, and redirects the stable `/api/public/images/:id` route to Cloudinary. API responses and browser bundles never include the API secret. Cloudinary operations are tested with mocked fetch responses; no provider requests are part of automated tests.

The migration adds nullable Cloudinary metadata, preserving existing image rows as local-file records. Files in an existing developer `.local-images` directory are not automatically copied. Before moving a database that contains local image rows to a hosted API, use an explicit reviewed export/upload procedure while the old files are available; otherwise those old image rows will return not found on the new host.

## Production migrations and first Admin

The release migration history is, in order: `20261026190000_admin_auth_foundation`, `20261027100000_product_catalog`, `20261027113000_inventory_adjustments`, `20261027120000_upgrade_combinations`, `20261028130000_product_use_case`, `20261028160000_accessory_products`, `20261028180000_accessory_product_specs`, `20261029120000_individual_inventory_audit`, `20261029150000_accessory_categories` (adds SKU and categories and seeds six default categories), `20261031120000_product_image_gallery`, and `20261102100000_cloudinary_product_images`. Serial tracking fields default to `LEGACY_QUANTITY` and do not convert existing quantities. Database check constraints in these migrations remain SQL-enforced; Prisma schema language does not express them.

Before any real migration:

1. Review every pending SQL file and confirm the target Neon project/database and backup/recovery plan.
2. The complete migration history was verified against a temporary, isolated PostgreSQL 16 container bound only to `127.0.0.1:55439`. All eleven migrations applied in order with the Prisma deploy workflow; Prisma reported the database current, and the final Prisma schema diff was empty. The container was stopped and removed. This verifies a fresh database, not an existing database with user data.
3. Set `DIRECT_DATABASE_URL` to the intended Neon direct endpoint in the trusted release environment; verify the destination identity without printing credentials.
4. Run `npm run migrate:status:api`, inspect the result, then run `npm run migrate:deploy:api` as a deliberate release operation.
5. Only after migration success, deploy the API and provision the first Admin interactively with `npm run create:admin` from an authorized environment using the intended API `DATABASE_URL`. The command prompts for a masked password, hashes it with Argon2id, and refuses if any Admin exists. Never pass the password on a command line or use sample credentials.

No existing local or hosted database was contacted or modified. The only `migrate deploy` run targeted the disposable PostgreSQL container described above. `prisma validate`, client generation, builds, and typechecks do not apply migrations.

## Deployment verification

After the infrastructure is created, verify:

1. `GET https://api.example.com/api/health` returns process status and `GET https://api.example.com/api/ready` returns readiness only when PostgreSQL is reachable.
2. Storefront catalog/details and product-image redirects load; direct-load and refresh `/about` and `/products/<slug>`.
3. Admin login sets a `Secure; HttpOnly; SameSite=Lax` cookie; session refresh, logout, wrong-Origin rejection, CSRF rejection, and protected routes behave as expected.
4. Add/edit/archive a test product, adjust quantity with reason, and upload/view/delete an unattached test image.
5. Confirm the Admin pages for Orders, Customers, and Reports remain placeholders and do not advertise checkout or payments.
6. Test from current Chrome/Safari/Firefox browsers with custom sibling domains; do not infer cookie behavior from automated Node tests alone.
