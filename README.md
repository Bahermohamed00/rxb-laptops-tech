# RXB Laptops / Tech

An npm-workspaces monorepo containing independent customer and administration frontends plus a NestJS API. The Storefront and Admin are separate React + TypeScript + Vite apps. The API provides administrator authentication, product and inventory management, public laptop catalog/details/price-quote endpoints, and product image serving.

## Requirements

Node.js 20.19+ or 22.12+ for the frontends. Use Node.js 24.15+ for the NestJS API workspace and CLI. npm is required.

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

The storefront runs at `http://127.0.0.1:5183`; the admin preview runs at `http://127.0.0.1:5184`. These ports are assigned to this monorepo to avoid the existing process on port 5173.

The API listens on `http://127.0.0.1:5185`. Admin authentication uses PostgreSQL-backed server-side sessions. Public catalog endpoints expose active laptops only. The current schema does not yet model accessory products.

## API database and administrator setup

The API requires Node.js 24.15+, PostgreSQL, and a `DATABASE_URL` supplied to the API process. Copy `apps/api/.env.example` to `apps/api/.env` and replace the placeholder locally; `.env` is ignored by Git. Do not put database credentials in frontend `VITE_` variables. Configure `CORS_ORIGINS` with exact Admin origins (the local default is `http://127.0.0.1:5184`).

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

`TRUST_PROXY_HOPS` defaults to `0`. Set it only to the exact number of trusted reverse-proxy hops after ensuring the edge proxy overwrites client-supplied forwarding headers and the API is not directly exposed. Never enable broad proxy trust without checking the deployment topology.

## Production builds

```bash
npm run build:storefront
npm run build:admin
npm run build:api
```

The storefront and admin write to their own `dist/` directories. The API writes to its dedicated ignored `.phase1-build/` directory. Preview either frontend build with:

```bash
npm run preview:storefront
npm run preview:admin
```

## Structure

```text
apps/
  storefront/   Existing customer website and original logo/animation assets
  admin/        Separate admin frontend with API-backed sign-in and protected workspace routes
  api/          NestJS API, admin session auth, Prisma schema, and process health endpoint
packages/
  shared/       Reserved for future code shared by both apps
```

The two frontends build independently and do not share a router. Separate URLs and deployments can be configured later. A separate frontend or URL is not an authorization boundary; the API validates Admin sessions and roles. Do not put credentials or secrets in browser-exposed environment variables.
