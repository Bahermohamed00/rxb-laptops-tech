# Inventory frontend — development-only

Inventory is a projection of the existing Products catalog, not a new persisted collection. One product ID identifies one local stock entry. There is no automatic seeding, duplicate balance, separate inventory key, reservation engine, or order integration.

## Interface

- Known-data overview: product count, total prototype units (including drafts), low-stock product count, zero-stock product count. Unreadable data displays unavailable values, never fabricated zero totals.
- Search by brand/model/CPU/GPU, stock-level filter, and name/quantity/product-update sorting. Summary panels describe the whole known catalog; result counts describe the filtered view.
- Responsive table/cards with thumbnails, quantities, stock-level and catalog-availability labels, details, adjustment, and archive options.
- A low-stock threshold of 5 is an explicit UI-only display policy, not a database reorder point. Zero is a separate stock level. Draft availability is kept separate from quantity.
- Adjustment drawer: product selection, captured current quantity, increase/decrease, positive integer amount, required reason (1–500 characters), new quantity preview, and explicit simulated confirmation. The existing model supports 0–1,000,000 units; negative quantities and overflow are rejected.
- Reasons are deliberately not persisted. Movement history is unavailable because product timestamps and local quantities cannot form a reliable audit log.
- Separate inventory creation is unsupported; Manage products opens the existing catalog. Archive options shows a disabled confirmation with an explanation. No inventory action deletes, archives, or invalidates product records.

## Data boundary and consistency

`useInventory` subscribes to ProductStore and delegates mutation to `createLocalInventoryAdapter`. The adapter implements the asynchronous `InventoryActions` frontend contract. It validates the command, checks the captured catalog token, retains all product fields, changes only stockQuantity, and calls the existing controller update. The controller performs its existing storage validation and stale-write checks. Products and Inventory immediately observe the same result.

The drawer captures its product list and token together. External changes never rebase an open adjustment. Conflicts retain inputs and require closing/reopening against current data. Failed writes do not publish an optimistic balance. Duplicate submission is guarded; pending actions block dismissal. Dirty drafts use the shared discard/navigation protection and a browser unload warning.

`ModalSurface` supplies native modal focus containment, focus restoration, scroll locking and reduced-motion-aware GSAP transitions. The existing page timeline owns the Inventory header/overview/surface entrance; the collection owns its scoped row entrance with cleanup and focus interruption. Filtering does not replay the row entrance.

## Future API integration

The types are provisional frontend contracts, not finalized database fields or endpoints. Replace the local adapter/read subscription after agreeing on:

- Product/inventory identities, locations, quantity meanings, reservation semantics and permissions.
- Server-enforced atomic adjustments, version/precondition conflicts, idempotency and ambiguous request outcomes.
- Persisted reasons, movement/audit history, actors and authoritative timestamps.
- Archive/delete rules and effects on product references.
- List pagination/filter/sort contracts, validation/error envelopes and authenticated transport.

The backend must own real stock transactions and all authorization. Local catalog tokens and prototype data must never be uploaded as authoritative stock or silently promoted into production.

## Verification

Run `npm test --workspace @rxb/admin`, `npm run typecheck --workspace @rxb/admin`, and `npm run build:admin` from the repository root. `scripts/inventory-check.mjs` uses an isolated jsdom localStorage with synthetic fixtures. It checks lists, filtering/sorting, quantity boundaries, adjustments, Products consistency, remount persistence, unavailable history/archival, stale edits, failed writes, empty/blocked states and cleanup. Native dialog behavior and visual layout also need browser checks; jsdom does not implement a real modal top layer.
