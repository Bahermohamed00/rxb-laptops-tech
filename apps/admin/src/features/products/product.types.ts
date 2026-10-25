export type CatalogStatus = 'draft' | 'listed'
export type Availability = 'draft' | 'available' | 'out-of-stock'
export type StorageType = 'ssd' | 'hdd' | 'hybrid'
export type DisplaySpecifications = Readonly<{
  sizeInches?: number
  resolution?: string
  panelType?: string
  refreshRateHz?: number
}>

/** Validated editable fields. Updates replace all editable fields, not a partial patch. */
export type ProductInput = Readonly<{
  brand: string
  model: string
  priceMinor: number
  cpu: string
  gpu?: string
  ramGB: number
  storageGB: number
  storageType?: StorageType
  display?: DisplaySpecifications
  stockQuantity: number
  catalogStatus: CatalogStatus
  imageUrl?: string
  description?: string
}>

export type Product = ProductInput & Readonly<{
  id: string
  createdAt: string
  updatedAt: string
  dataOrigin: 'local-prototype'
}>

export type ProductCatalog = Readonly<{
  schemaVersion: 1
  dataOrigin: 'local-prototype'
  revision: number
  /** Null only for the in-memory empty catalog before its first write. */
  savedAt: string | null
  products: readonly Product[]
}>

export type ProductErrorCode = 'validation' | 'malformed' | 'unsupported-version' | 'storage-read' | 'storage-write' | 'conflict' | 'not-found' | 'not-ready' | 'generation'
export type ProductError = Readonly<{
  code: ProductErrorCode
  message: string
  fields?: Readonly<Record<string, string>>
  /** Original bytes are retained for explicit recovery/export; never rendered as HTML. */
  raw?: string
}>
export type Result<T> = { ok: true; value: T } | { ok: false; error: ProductError }
export type CatalogSnapshot = Readonly<{ catalog: ProductCatalog; token: string | null }>
export type ProductMutation = Readonly<{ snapshot: CatalogSnapshot; product: Product }>
export type DeleteMutation = Readonly<{ snapshot: CatalogSnapshot; deletedId: string }>
export type CatalogState = Readonly<{
  products: readonly Product[]
  revision: number
  /** Capture when opening an editor and pass back on save to detect stale edits. */
  token: string | null
  status: 'restoring' | 'ready' | 'blocked'
  persistence: 'idle' | 'saved' | 'error'
  error: ProductError | null
}>
