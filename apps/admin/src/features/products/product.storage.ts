import type { CatalogSnapshot, DeleteMutation, Product, ProductCatalog, ProductMutation, Result } from './product.types'
import { isRecord, isTimestamp, PRODUCT_LIMITS, validateProductInput, validateStoredProduct } from './product.validation'

export const PRODUCT_STORAGE_KEY = 'rxb.admin.products.v1'
export type StoragePort = Pick<Storage, 'getItem' | 'setItem'>
export type ProductStorageOptions = {
  getStorage?: () => StoragePort
  id?: () => string
  now?: () => string
}
const emptyCatalog = (): ProductCatalog => ({ schemaVersion: 1, dataOrigin: 'local-prototype', revision: 0, savedAt: null, products: [] })
const conflict = (): Result<never> => ({ ok: false, error: { code: 'conflict', message: 'The local catalog changed. Reload it before saving your changes.' } })

export function parseCatalog(raw: string | null): Result<CatalogSnapshot> {
  if (raw === null) return { ok: true, value: { catalog: emptyCatalog(), token: null } }
  const malformed = (message: string): Result<never> => ({ ok: false, error: { code: 'malformed', message, raw } })
  let value: unknown
  try { value = JSON.parse(raw) } catch { return malformed('The saved catalog is not valid JSON. Original content has been preserved.') }
  if (!isRecord(value)) return malformed('The saved catalog must be an object.')
  if (typeof value.schemaVersion === 'number' && value.schemaVersion !== 1) return { ok: false, error: { code: 'unsupported-version', message: 'This catalog version is not supported. Original content has been preserved.', raw } }
  if (Object.keys(value).some(key => !['schemaVersion', 'dataOrigin', 'revision', 'savedAt', 'products'].includes(key)) || value.schemaVersion !== 1 || value.dataOrigin !== 'local-prototype' || typeof value.revision !== 'number' || !Number.isSafeInteger(value.revision) || value.revision < 0 || !isTimestamp(value.savedAt) || !Array.isArray(value.products) || value.products.length > PRODUCT_LIMITS.catalogSize) return malformed('The saved catalog structure is invalid.')
  const products: Product[] = []
  const ids = new Set<string>()
  for (const entry of value.products) {
    const result = validateStoredProduct(entry)
    if (!result.ok) return malformed(result.error.message)
    if (ids.has(result.value.id) || result.value.updatedAt > value.savedAt) return malformed('The catalog contains duplicate IDs or inconsistent timestamps.')
    ids.add(result.value.id)
    products.push(result.value)
  }
  return { ok: true, value: { catalog: { schemaVersion: 1, dataOrigin: 'local-prototype', revision: value.revision, savedAt: value.savedAt, products }, token: raw } }
}

export function createProductStorage(options: ProductStorageOptions = {}) {
  // Access is deferred so SSR and denied localStorage getters are safe.
  const getStorage = options.getStorage ?? (() => window.localStorage)
  const id = options.id ?? (() => crypto.randomUUID())
  const now = options.now ?? (() => new Date().toISOString())
  function readRaw(): Result<string | null> {
    try { return { ok: true, value: getStorage().getItem(PRODUCT_STORAGE_KEY) } }
    catch { return { ok: false, error: { code: 'storage-read', message: 'Local storage could not be read. Existing content has not been changed.' } } }
  }
  function read(): Result<CatalogSnapshot> {
    const result = readRaw()
    return result.ok ? parseCatalog(result.value) : result
  }
  function current(expectedToken: string | null): Result<CatalogSnapshot> {
    const result = read()
    if (!result.ok) return result
    return result.value.token === expectedToken ? result : conflict()
  }
  function timestamp(previous: string | null): Result<string> {
    try {
      const date = now()
      if (!isTimestamp(date)) throw new Error('Invalid clock')
      return { ok: true, value: previous && previous > date ? previous : date }
    } catch { return { ok: false, error: { code: 'generation', message: 'A valid timestamp could not be generated.' } } }
  }
  function commit(catalog: ProductCatalog, expectedToken: string | null): Result<CatalogSnapshot> {
    const serialized = JSON.stringify(catalog)
    const checked = parseCatalog(serialized)
    if (!checked.ok) return { ok: false, error: { code: 'validation', message: checked.error.message } }
    const latest = readRaw()
    if (!latest.ok) return latest
    if (latest.value !== expectedToken) return conflict()
    try { getStorage().setItem(PRODUCT_STORAGE_KEY, serialized) }
    catch { return { ok: false, error: { code: 'storage-write', message: 'The catalog was not saved. Local storage may be full or unavailable.' } } }
    return checked
  }
  function create(input: unknown, expectedToken: string | null): Result<ProductMutation> {
    const validated = validateProductInput(input)
    if (!validated.ok) return validated
    const restored = current(expectedToken)
    if (!restored.ok) return restored
    const { catalog } = restored.value
    if (catalog.products.length >= PRODUCT_LIMITS.catalogSize) return { ok: false, error: { code: 'validation', message: 'The local prototype catalog has reached its record limit.' } }
    const date = timestamp(catalog.savedAt)
    if (!date.ok) return date
    let generatedId: string
    try { generatedId = id() } catch { return { ok: false, error: { code: 'generation', message: 'A product ID could not be generated.' } } }
    const record = validateStoredProduct({ ...validated.value, id: generatedId, createdAt: date.value, updatedAt: date.value, dataOrigin: 'local-prototype' })
    if (!record.ok) return record
    if (catalog.products.some(product => product.id === generatedId)) return { ok: false, error: { code: 'generation', message: 'The generated product ID already exists. Try again.' } }
    const result = commit({ ...catalog, revision: catalog.revision + 1, savedAt: date.value, products: [...catalog.products, record.value] }, expectedToken)
    return result.ok ? { ok: true, value: { snapshot: result.value, product: record.value } } : result
  }
  function update(productId: string, input: unknown, expectedToken: string | null): Result<ProductMutation> {
    const validated = validateProductInput(input)
    if (!validated.ok) return validated
    const restored = current(expectedToken)
    if (!restored.ok) return restored
    const { catalog } = restored.value
    const existing = catalog.products.find(product => product.id === productId)
    if (!existing) return { ok: false, error: { code: 'not-found', message: 'This product no longer exists.' } }
    const date = timestamp(catalog.savedAt)
    if (!date.ok) return date
    const product: Product = { ...validated.value, id: existing.id, createdAt: existing.createdAt, updatedAt: date.value, dataOrigin: 'local-prototype' }
    const result = commit({ ...catalog, revision: catalog.revision + 1, savedAt: date.value, products: catalog.products.map(entry => entry.id === productId ? product : entry) }, expectedToken)
    return result.ok ? { ok: true, value: { snapshot: result.value, product } } : result
  }
  function remove(productId: string, expectedToken: string | null): Result<DeleteMutation> {
    const restored = current(expectedToken)
    if (!restored.ok) return restored
    const { catalog } = restored.value
    if (!catalog.products.some(product => product.id === productId)) return { ok: false, error: { code: 'not-found', message: 'This product no longer exists.' } }
    const date = timestamp(catalog.savedAt)
    if (!date.ok) return date
    const result = commit({ ...catalog, revision: catalog.revision + 1, savedAt: date.value, products: catalog.products.filter(product => product.id !== productId) }, expectedToken)
    return result.ok ? { ok: true, value: { snapshot: result.value, deletedId: productId } } : result
  }
  /** Destructive recovery: the caller must obtain explicit confirmation and offer raw export first. */
  function reset(expectedRaw: string | null): Result<CatalogSnapshot> {
    const date = timestamp(null)
    if (!date.ok) return date
    return commit({ ...emptyCatalog(), savedAt: date.value, revision: 1 }, expectedRaw)
  }
  return { read, readRaw, create, update, delete: remove, reset }
}
export type ProductStorage = ReturnType<typeof createProductStorage>
