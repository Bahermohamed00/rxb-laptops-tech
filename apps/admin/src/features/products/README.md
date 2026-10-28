# Product catalog feature

The mounted catalog UI is `LiveProductsPage.tsx`; it reads and writes through `products.api.ts` and sends the active Admin session's CSRF token for mutations. `LiveProductEditor.tsx` owns product fields and per-product RAM/storage compatibility choices. `ProductImageUpload.tsx` sends raw image bytes to the authenticated API and exposes upload progress, preview, replace, remove, and drag/drop behavior.

`LiveInventoryPage.tsx` is the mounted inventory view. It adjusts the database `stockQuantity` for complete physical products; laptop upgrade options do not create separate stock counts. `LiveProductsPage.tsx` filters and paginates API-backed records. Selecting a product opens its dedicated `#/products/:id/edit` route, and `ProductEditPage.tsx` loads the record from the Admin endpoint before rendering the editor. Create remains a separate product-type selection flow. Publish/unpublish and archive are available from the dedicated product page; archive is the supported removal action because product and inventory history must remain intact.

`LiveProductEditor.tsx` begins with brand/model, product type, condition, price, quantity, listing status, description, and the authenticated product-image upload. Laptop use case and laptop-only processor, graphics, memory, storage, display, and compatible upgrade-pair data are shown only for laptops; the technical fields are grouped in an expandable advanced section. Accessory fields are rendered from the single `accessorySpecs` map in `accessory-specs.ts`: keyboard type/connection/layout/backlight, mouse connection/DPI/button count/color, mouse-pad size/material/color, and other-accessory category/additional notes. The accessory fields are validated by product type and persisted to the product's JSON `specs` field. The existing API requires accurate CPU/GPU/base RAM/base storage values and an available base RAM/storage pair for laptops. The form does not prefill invented hardware or stock values.

The former synchronous localStorage catalog helpers and UI modules remain in this feature only to preserve existing focused contract tests and historical local data formats. They are no longer mounted by the application and are not a data source for the Admin or Storefront.

The Add Product flow starts with a product-type picker for laptop, keyboard, mouse, mouse pad, and other accessory. These types use the shared database catalog and product-image upload; accessories are not seeded as sample inventory. The Products list runs text/specification and price filtering, sorting, and pagination through the authenticated Admin API. Field-validation responses are mapped to specific controls when the backend provides field context; server-side business rules remain authoritative. Serial-number search is unavailable because inventory is quantity-based and does not model individual units.

Product edits warn before leaving with unsaved form changes. Save completion reloads the record from the API so the edit page reflects the persisted response. Direct navigation and refresh are supported for product edit routes.

From the repository root, the relevant checks are:

```sh
npm test --workspace @rxb/admin
npm run typecheck --workspace @rxb/admin
npm run build:admin
```
