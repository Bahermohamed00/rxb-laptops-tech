# RXB Laptops / Tech

An npm-workspaces monorepo containing independent customer and administration frontends. The storefront is the existing React + TypeScript + Vite prototype. The admin is a separate preview app; authentication and backend services are not implemented.

## Requirements

Node.js 20.19+ or 22.12+, and npm.

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
```

The storefront runs at `http://127.0.0.1:5183`; the admin preview runs at `http://127.0.0.1:5184`. These ports are assigned to this monorepo to avoid the existing process on port 5173.

## Production builds

```bash
npm run build:storefront
npm run build:admin
```

Each app writes its build into its own `dist/` directory. Preview either build with:

```bash
npm run preview:storefront
npm run preview:admin
```

## Structure

```text
apps/
  storefront/   Existing customer website and original logo/animation assets
  admin/        Separate admin frontend foundation; no real data or authentication
  api/          Reserved for a future backend; no service implemented
packages/
  shared/       Reserved for future code shared by both apps
```

The two frontends build independently and do not share a router. Separate URLs and deployments can be configured later. A separate frontend or URL is not an authorization boundary: future access must be enforced by the backend with authenticated sessions and role-based authorization. Do not put credentials or secrets in browser-exposed environment variables.
