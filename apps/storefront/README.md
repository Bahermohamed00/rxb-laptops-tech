# RXB Storefront

Customer-facing React + TypeScript + Vite application. The original logo and logo-assembly components are served from `public/`.

From the monorepo root, use `npm run dev:storefront` to start the development server, `npm run build:storefront` to build, or `npm run preview:storefront` to preview a build.

The Storefront reads published laptops and supported accessory types from `/api/public/products`, with product details and laptop configuration quotes from the matching public endpoints. `VITE_API_BASE_URL` may override the default API base URL. WhatsApp inquiries use the RXB Egypt business number from `src/config/business-contact.ts`; this single contact configuration powers product-specific inquiries, the footer link, and the floating general contact button.

The About page has its own `/about` URL, and product details are directly reachable at `/products/:slug`. Catalog requests use `cache: no-store` and refresh when the Storefront tab regains focus so database-backed Admin edits appear without rebuilding the app.

Use-case filters apply to laptops and are backed by the nullable `useCase` product field (`WORK`, `STUDY`, `GAMING`). Published laptops and actual API-backed accessories are presented in their respective sections; search, condition, price, and sorting controls work against the live catalog. Product details use a dedicated responsive `/products/:slug` experience. Laptop details show compatibility-filtered configurations and server-confirmed prices; accessory details display their type-specific JSON specs, use their listed prices, and never show laptop upgrade selectors. Both product types support product-specific WhatsApp inquiries.

The historical `src/data/demo-catalog.ts` and `DemoCatalogPreview.tsx` contain illustrative preview data but are not mounted by the live homepage. They do not create API records or represent real inventory.

## Theme

The Storefront supports light and dark themes. The first visit follows the device preference; a user's selection is saved in the `rxb-theme` first-party cookie and local storage. Both theme choices are applied before the page styles load to reduce flashes, and the same cookie lets the Admin app use the preference when the apps share a hostname.
