# Product data foundation — Phase 4.2

Phase 4.3 mounts ProductProvider above the keyed admin page boundary. Initialization reads the catalog without writing; ProductsPage exposes a read-only listing. Test products in `scripts/product-data-check.mjs` use an in-memory adapter only.

## Files and contracts

- `product.types.ts`: readonly product, editable input, display, catalog, snapshot, state, and discriminated result/error types.
- `product.validation.ts`: shared input/restored-record validation and derived availability.
- `product.storage.ts`: injectable localStorage adapter, JSON validation, optimistic concurrency, CRUD, raw retrieval, and explicit reset.
- `product.controller.ts`: framework-independent catalog state, subscriptions, restore gate, mutation results, and external-change refresh.
- `ProductStore.tsx`: `ProductProvider`, `useProductCatalog`, and `useProductActions`. Mounted above the keyed admin view in App.tsx. An injected adapter is fixed for the provider lifetime.

All operations return `{ ok: true, value }` or `{ ok: false, error }`. Errors have stable codes and optional field-level messages. Failed writes never publish an optimistic catalog. Restoration errors block mutations; any previously loaded products remain available only as last-known data with a `blocked` status.

## Model and validation

Required editable fields: brand, model, CPU, priceMinor (integer piastres), RAM GB, storage GB, stock quantity, and draft/listed status. Optional fields: GPU, storage type, display details, HTTPS image URL, and plain-text description. The future form can default stock to zero and status to draft; the data API requires explicit values.

Product IDs are generated UUIDs. Creation/update timestamps are canonical UTC ISO strings, and every product and envelope carries `dataOrigin: 'local-prototype'`. Updates replace all editable fields, preserving ID and creation time; omitting an optional field removes it. Read-only or unknown input fields are rejected. Availability is never persisted: draft stays draft, listed with positive stock is available, and listed with zero stock is out of stock.

Limits: price 1–1,000,000,000 piastres (EGP 0.01–10,000,000), stock 0–1,000,000, RAM 1–4096 GB, storage 1–131,072 GB, display 1–100 inches, refresh 1–1000 integer Hz, and at most 10,000 catalog records. Numeric values must be finite; integer fields must be safe integers. Brand/model/CPU/GPU lengths are 80/160/200/200 characters; description 10,000, image URL 2048, display text 80. Text is trimmed, and optional blank text is omitted.

Image URLs must use an explicit `https://` scheme, a hostname, and no credentials, whitespace, control characters, or backslashes. The foundation does not fetch images or verify image content; the future UI must handle image loading failures.

## Persistence and recovery

Key: `rxb.admin.products.v1`. The envelope contains schemaVersion 1, prototype origin, revision, savedAt, and products. A missing key produces an empty in-memory catalog without writing anything. Persisted envelopes and every nested record are validated, including unique IDs and timestamp ordering.

`read()` restores the catalog, and `readRaw()` exposes the exact stored string for recovery/export. Invalid JSON, invalid records, and unsupported schema versions return typed errors with the original raw content and do not write. No automatic salvage, migration, or reset occurs.

`create(input, token)`, `update(id, input, token)`, and `delete(id, token)` validate/read before mutation and compare the exact stored token again immediately before writing. Capture the state token when opening an editor and retain that original token when saving. Provider storage events refresh validated catalog state without silently replaying edits. Storage clear events restore the empty collection. Unrelated keys and sessionStorage events are ignored.

`reset(expectedRaw)` is the explicit destructive recovery API. Future UI must offer raw export and obtain confirmation before calling it. It replaces only this catalog key with a validated empty envelope and rejects the operation if stored content changed since inspection. It never calls `localStorage.clear()`.

Concurrency is optimistic: localStorage does not offer an atomic compare-and-swap transaction, so truly simultaneous cross-tab writes can still race. Storage remains browser/origin-specific and can be cleared by the user. A backwards clock is clamped to the previous saved timestamp.

## Verification

Run from the repository root:

```sh
node apps/admin/scripts/product-data-check.mjs
npm run build:admin
```

The checks require only existing Vite, React, and Node dependencies. They cover input limits, optional specifications, URL rules, derived availability, immutable metadata, CRUD, empty initialization without writes, stale-token conflicts, failed/denied storage, duplicate IDs, malformed/versioned recovery, controller subscriptions/external updates, blocked state, explicit reset, and provider SSR/hook boundaries. Browser-mounted provider event subscription behavior still needs integration coverage when the UI is mounted.

Remaining Phase 4.4 work: creation/editing forms, input money parsing, deletion confirmation, explicit destructive recovery flows, and dirty-editor conflict handling. These are not implemented in Phase 4.3.


## Phase 4.3 listing

`ProductsPage.tsx` replaces only the Products placeholder. The provider wraps `AdminApp` outside the keyed view, preserving its controller while routes change. Search/filter/sort controls are page-local and reset on leaving Products. Existing hash routes and other views are retained.

- `ProductToolbar.tsx`: labeled native search/select controls, brand and availability filters, recent/name/price/stock sorting in both numeric directions.
- `product.selectors.ts`: pure non-mutating selectors with deterministic ID tie-breaking, brand options, EGP formatting from piastres, and explicitly labeled Cairo timestamps.
- `ProductCollection.tsx`: semantic table at desktop widths and cards below 1280px; one card column below 850px. CSS hides the unused representation from the accessibility tree.
- `ProductImage.tsx`: fixed-size decorative thumbnail, local icon fallback, lazy loading, no-referrer remote images, and broken-image handling. URLs come only from validated records.
- `products.css`: scoped product styles and keyboard focus treatment.

All collection data is visibly labeled as local prototype data. The Add product button is disabled and accompanied by "Coming next phase". There are no edit/delete/reset controls, no seeded products, and no automatic writes.

Restoration displays a real initialization state with no delay. Empty catalogs and empty filtered results are separate states. Blocked storage hides last-known records rather than presenting them as current data. Malformed/unsupported data offers retry and a plain-text download of current original storage content; no reset or salvage runs implicitly. Unavailable storage offers retry. The result count is derived from the current filtered and full collections.

The shared entrance timeline adds Products intro/surface reveals without animating rows on each keystroke. Focusing inputs/selects finishes the reveal so controls remain usable; existing reduced-motion handling applies.

Additional verification:

```sh
node apps/admin/scripts/product-listing-check.mjs
```

Data/controller checks, selector/SSR listing checks, the TypeScript check, and admin build passed. Test fixtures are in-memory only and are never saved to the actual catalog. No browser/native connection was available: physical keyboard interaction, viewport overflow and visual quality, image-load/error events, download/retry actions, and mounted provider storage-event/navigation behavior still require browser testing. The existing data/controller checks cover the underlying recovery and external-change state logic.
