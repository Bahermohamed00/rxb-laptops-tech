# RXB API

NestJS 12 API workspace with PostgreSQL-backed administrator sessions and catalog APIs. Physical inventory is represented as a count on each sellable product record; separate inventory-unit or serial-number tracking is not implemented.

## Requirements and local configuration

- Node.js 24.15+ and npm.
- PostgreSQL for API runtime, migrations, and administrator provisioning.
- Copy `.env.example` to `.env` inside `apps/api/` and replace the local placeholder values. Never commit `.env` or put database credentials in `VITE_` variables. `DATABASE_URL` is required at runtime.
- `CORS_ORIGINS` is a comma-separated allowlist of exact HTTP(S) origins; local defaults include Storefront `http://127.0.0.1:5183` and Admin `http://127.0.0.1:5184`. Production origins must use HTTPS.
- `PORT` defaults to `5185` and the process binds only to `127.0.0.1`.
- `PRODUCT_IMAGE_MAX_BYTES` defaults to `5242880` (5 MiB) and is capped at 25 MiB.
- In development, uploaded files are written under `apps/api/.local-images/` (or `RXB_LOCAL_IMAGE_DIR`) using generated UUID filenames. This local disk provider is development-only; upload is intentionally disabled in production until an object-storage provider is configured. The folder is ignored by Git.

## Prisma schema setup

Prisma 7 uses the `prisma-client` generator and PostgreSQL driver adapter; `prisma.config.ts` reads `DATABASE_URL`. Schema validation and client generation do not connect to PostgreSQL:

```sh
npm run prisma:validate --workspace @rxb/api
npm run prisma:generate --workspace @rxb/api
```

The schema contains administrator sessions, a shared product catalog, laptop-specific RAM/storage options and allowed combinations, image metadata, and an inventory adjustment audit trail. Product types are `LAPTOP`, `KEYBOARD`, `MOUSE`, `MOUSE_PAD`, and `OTHER_ACCESSORY`; laptop-only hardware fields are nullable so accessories do not need fabricated specifications. Accessory type-specific details are stored in the product `specs` JSONB column and validated against the selected product type. Migrations include `prisma/migrations/20261026190000_admin_auth_foundation/`, `prisma/migrations/20261027100000_product_catalog/`, `prisma/migrations/20261027113000_inventory_adjustments/`, `prisma/migrations/20261027120000_upgrade_combinations/`, `prisma/migrations/20261028130000_product_use_case/`, `prisma/migrations/20261028160000_accessory_products/`, and `prisma/migrations/20261028180000_accessory_product_specs/`. The accessory migrations preserve existing products as laptops and permit absent laptop fields; they must be applied before creating accessories. Before applying migrations, inspect the pending SQL and verify that the configured database is the intended target. `build` and `typecheck` generate the client first; they require `DATABASE_URL` to be available to Prisma configuration but do not connect.

### Product APIs and pricing

- Admin routes: `GET/POST /api/admin/products`, `GET/PATCH/DELETE /api/admin/products/:id`. Every route requires a live Admin session and role; every mutation also requires an allowed `Origin` and the session's `X-CSRF-Token`. DELETE archives the catalog record instead of deleting it.
- Public routes: `GET /api/public/products`, `GET /api/public/products/:slug`, and `POST /api/public/products/:slug/quote`.
- A product record represents one sellable item in a supported product type. New and pre-owned examples of the same model are separate records and each gets a unique slug. `useCase` is laptop-only, one of `WORK`, `STUDY`, or `GAMING`, and is not inferred from specifications. `stockQuantity` counts complete physical units of that product; laptop upgrade-component stock is not added, so quantity is not double-counted.
- Accessory `specs` are product-type-specific: keyboard fields are `keyboardType`, `connection`, `layout`, and `backlight`; mouse fields are `connection`, `dpi`, `buttonCount`, and `color`; mouse-pad fields are `size`, `material`, and `color`; other accessories use `categoryName` and optional `additionalNotes`. The API rejects missing required fields, unsupported values, unknown keys, and laptop specs on accessory records (or accessory specs on laptops).
- CPU/GPU are fixed catalog fields. RAM/storage options and their explicitly allowed pairs are attached to each product. The API requires one available zero-difference base option in each dimension and an available base pair, matching the declared base configuration. Public catalog responses include only options participating in an allowed pair; quotes validate the selected pair and calculate `priceMinor + RAM difference + storage difference` on the server. Quotes are informational and do not assert physical stock availability. Prices use integer minor units (EGP piastres); no client total is accepted.
- Admin inventory changes require a reason and write the previous/new physical product quantity and acting Admin to `InventoryAdjustment` in the same database transaction as the product count update. A concurrent change is rejected for refresh rather than silently overwriting a newer count. The history is internal; public responses expose availability only.
- Public responses omit exact stock quantity and storage keys. They expose only a boolean availability flag and active options. This milestone does not create cart/order snapshots or business records.
- `GET /api/admin/products` supports database-side text/specification filters, price bounds, condition/status/use-case filters, sorting, and bounded pagination. Inventory tracks product-level quantities and adjustments; it does not track physical laptop serial numbers.

### Clearly labeled local sample catalog

The sample seed is idempotent and restricted to the verified local `rxb_dev` database. Review `src/scripts/seed-sample-catalog.ts` before use. From the repository root in PowerShell, opt in explicitly:

```powershell
$env:RXB_ALLOW_SAMPLE_CATALOG_SEED = 'YES'
npm run seed:sample-products
Remove-Item Env:\RXB_ALLOW_SAMPLE_CATALOG_SEED
```

The script refuses production, any database other than `rxb_dev`, and existing seed-slug records unless they already have the sample marker, zero stock, and no inventory adjustments. It creates five active sample/test listings at zero stock; no physical units or images are fabricated. Every sample is labeled in the description and in Admin/Storefront cards. The listed prices are testing examples, not authoritative offers.

### Product image upload

`POST /api/admin/images` accepts raw `application/octet-stream` bytes, requires an authenticated Admin session plus Origin/CSRF checks, and uses Express's bounded raw body parser (oversize requests return 413). The service checks JPEG/PNG/WebP structure and signatures. It does not invoke Multer. The browser-provided filename and MIME type are ignored; server-generated UUID keys are used. Public bytes are served through `GET /api/public/images/:id` after a database lookup with `Cross-Origin-Resource-Policy: cross-origin`, because public images are embedded by the separate Admin and Storefront origins. Unattached uploaded images can be removed through authenticated `DELETE /api/admin/images/:id`; images attached to products cannot be removed directly.

The local filesystem implementation is suitable only for development or a single local preview. A production deployment still needs a reviewed object-storage adapter, private bucket configuration, lifecycle/cleanup behavior, and tests. It is not currently configured or production-ready. Replacing/removing an image detaches or removes its database record before filesystem cleanup; a cleanup failure can leave an orphaned generated file, but cannot leave a product pointing at a removed file. A failed DB insert after file write can also leave an orphan if filesystem cleanup itself fails.

### Storefront catalog

The Storefront reads published products from the public product API and separates laptops from supported accessories in the customer catalog. Set `VITE_API_BASE_URL` in the Vite environment if the API is not at `http://127.0.0.1:5185/api`. Configure that Storefront origin in API `CORS_ORIGINS`. Search runs against the bounded public catalog response (maximum 100 active products) and matches stored brand, model, description, CPU, GPU, and available display/RAM/storage fields. The product detail route is `/products/:slug`; laptops show compatible RAM/storage choices and request configuration prices from the public quote endpoint. Accessories use their listed price and do not call the laptop quote endpoint. Quotes and inquiries are informational and stock availability remains a separate listing field. WhatsApp inquiry links use the centrally configured RXB Egypt number and include the actual product URL, selected compatible RAM/storage when applicable, and confirmed/listed price. A floating general WhatsApp link is available on customer-facing pages, not Admin. No checkout or payment flow is implemented. The About page is served at `/about`; catalog requests refresh when the Storefront tab regains focus and bypass browser caching.

## Create the first administrator

After an authorized migration has created the schema and `DATABASE_URL` points to the intended local database:

```sh
npm run create:admin
```

The CLI prompts interactively for an email and masked password (minimum 12 characters), confirms the password, hashes it with Argon2id, and creates a `SUPER_ADMIN` only if no administrator exists. It refuses to run when an account already exists and never accepts a password argument or includes a default credential. Later administrator provisioning needs a reviewed operational procedure; this command is intentionally first-account-only.

## Authentication behavior

- `POST /api/auth/login`: validates email/password and creates a random 256-bit opaque session token.
- `GET /api/auth/session`: validates the cookie against the server-side session and returns a safe identity plus a CSRF token.
- `POST /api/auth/logout`: requires the active session, matching allowed `Origin`, and `X-CSRF-Token`; revokes the database session and clears the cookie.
- Passwords use Argon2id (19 MiB memory, 2 iterations, parallelism 1). Invalid credentials use a generic 401 response.
- The `rxb_admin_session` cookie is `HttpOnly`, `SameSite=Lax`, scoped to `/api/auth`, and `Secure` in production. Only its SHA-256 verifier is stored in the database. CSRF tokens are kept in the server-side session and in Admin React memory, never browser storage.
- Protected catalog and inventory routes use both `SessionGuard` and `RolesGuard` with explicit `@Roles(...)` metadata. Every mutation also requires Origin and CSRF validation.

## Rate limits and proxy configuration

`AUTH_LOGIN_LIMIT=5` and `AUTH_LOGIN_TTL_MS=900000` limit login requests per observed client IP. `API_RATE_LIMIT=100` and `API_RATE_TTL_MS=60000` apply a general per-IP limit. Both stores are process-local memory and reset on restart; they are not distributed. Before running multiple API instances, move both limit stores to shared Redis-backed storage and test the tracker/expiry behavior.

`TRUST_PROXY_HOPS=0` by default. Set the exact proxy hop count only when the edge proxy overwrites incoming forwarded headers and the API cannot be reached directly. Incorrect trust settings can let clients spoof IPs and evade throttling. Avoid blanket proxy trust.

## Run and verify

From the monorepo root:

```sh
npm run dev:api
npm run typecheck:api
npm run test:api
npm run build:api
```

`GET http://127.0.0.1:5185/api/health` returns `{"status":"ok"}` and reports API process status only; it is not a database health check. Auth tests use an in-memory Prisma test double; no real database is used by those tests.

Build output stays in the dedicated `.phase1-build/` folder. Older local `build/`, `dist/`, and `generated/` directories are preserved.
