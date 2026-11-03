# RXB Laptops / Tech

An npm-workspaces monorepo containing independent customer and administration React + TypeScript + Vite apps and a NestJS API. The API provides administrator authentication, product and quantity-based inventory management, public product catalog/details/price-quote endpoints, and product image serving.

## Requirements

Use Node.js 24.15+ and npm for the complete monorepo, including the NestJS API and Prisma CLI.

## Install

Run once from this repository root:

```bash
npm install
```

## Run locally

Start either app in a separate terminal from the repository root:

```bash
npm run dev:storefront
npm run dev:admin
npm run dev:api
```

The storefront runs at `http://127.0.0.1:5183`; the admin preview runs at `http://127.0.0.1:5184`.

The API listens on `http://127.0.0.1:5185` in development. Admin authentication uses PostgreSQL-backed server-side sessions. The public catalog supports active laptop and accessory products.

## API database and administrator setup

The API requires PostgreSQL and a `DATABASE_URL` supplied to the API process. Copy `apps/api/.env.example` to `apps/api/.env` and replace the local placeholder; `.env` is ignored by Git. Do not put database credentials in frontend `VITE_` variables. Configure `CORS_ORIGINS` with exact frontend origins.

Generate/validate Prisma and build the API from the repository root:

```bash
npm run prisma:validate --workspace @rxb/api
npm run prisma:generate --workspace @rxb/api
npm run build:api
```

Create the first administrator interactively after PostgreSQL is available and the initial schema migration has been applied:

```bash
npm run create:admin
```

The command prompts for an email and masked password, creates only the first account, and assigns `SUPER_ADMIN`. It refuses to create an account if any admin already exists. It never accepts a password as a command-line argument. No default credentials are included. These commands do not apply migrations; review the migration SQL and the target database before applying migrations listed in the API README.

The API uses opaque random session cookies marked `HttpOnly`, `SameSite=Lax`, and `Secure` in production; only a SHA-256 verifier is stored in PostgreSQL. Admin mutations include Origin checking and a CSRF header. The health endpoint reports process status only, not database health. Rate limits currently use per-process memory; multiple API instances require shared Redis-backed rate-limit storage before horizontal scaling.

`TRUST_PROXY_HOPS` defaults to `0`. Set it only to the exact number of trusted reverse-proxy hops after ensuring the edge proxy overwrites client-supplied forwarding headers and the API is not directly exposed. Never enable broad proxy trust without checking the deployment topology. The initial Render setup uses one API instance because the rate-limit stores are process-local.

## Free testing deployment

The supported free-tier layout is Cloudflare Pages for each frontend, a single Render Web Service for the API, Neon PostgreSQL, and Cloudinary image storage. Use custom HTTPS subdomains under one registrable domain for the two frontends and API; provider-assigned `pages.dev` and `onrender.com` domains are unrelated sites and are not a supported Admin-cookie arrangement. The deployment guide documents build commands, environment variables, migrations, setup, and current feature scope: [docs/deployment/free-tier-deployment.md](./docs/deployment/free-tier-deployment.md).

## Production builds

```bash
npm run build:storefront
npm run build:admin
npm run build:api
```

The storefront and admin write to their own `dist/` directories. Production frontend builds require a valid HTTPS `VITE_API_BASE_URL`, which Vite embeds at build time. The API writes to its dedicated ignored `.phase1-build/` directory. Preview either frontend build with:

```bash
npm run preview:storefront
npm run preview:admin
```

## Structure

```text
apps/
  storefront/   Existing customer website and original logo/animation assets
  admin/        Separate admin frontend with API-backed sign-in and protected workspace routes
  api/          NestJS API, admin session auth, Prisma schema, and health/readiness endpoints
packages/
  shared/       Reserved for future code shared by both apps
```

The two frontends build independently and do not share a router. Separate URLs and deployments can be configured later. A separate frontend or URL is not an authorization boundary; the API validates Admin sessions and roles. Do not put credentials or secrets in browser-exposed environment variables.
