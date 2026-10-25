import type { CatalogSnapshot, CatalogState, DeleteMutation, ProductMutation, ProductError, Result } from './product.types'
import { createProductStorage, type ProductStorage } from './product.storage'

/** Framework-independent state owner used by the React provider and data checks. */
export function createProductController(storage: ProductStorage = createProductStorage()) {
  let snapshot: CatalogSnapshot | null = null
  let state: CatalogState = { products: [], revision: 0, token: null, status: 'restoring', persistence: 'idle', error: null }
  const listeners = new Set<() => void>()
  const publish = (next: CatalogState) => { state = next; listeners.forEach(listener => listener()) }
  function accept(next: CatalogSnapshot, persistence: CatalogState['persistence']) {
    snapshot = next
    publish({ products: next.catalog.products, revision: next.catalog.revision, token: next.token, status: 'ready', persistence, error: null })
  }
  function restore(): Result<CatalogSnapshot> {
    const result = storage.read()
    if (result.ok) {
      if (snapshot?.token !== result.value.token || state.status !== 'ready' || state.error) accept(result.value, 'idle')
    } else {
      snapshot = null
      publish({ ...state, token: null, status: 'blocked', persistence: 'error', error: result.error })
    }
    return result
  }
  function fail(error: ProductError) {
    if (['conflict', 'malformed', 'unsupported-version', 'storage-read'].includes(error.code)) restore()
    const persistenceError = ['storage-write', 'storage-read', 'malformed', 'unsupported-version', 'conflict'].includes(error.code)
    publish({ ...state, persistence: persistenceError ? 'error' : state.persistence, error: state.status === 'blocked' ? state.error ?? error : error })
  }
  function mutate<T extends { snapshot: CatalogSnapshot }>(operation: () => Result<T>): Result<T> {
    if (!snapshot || state.status !== 'ready') return { ok: false, error: { code: 'not-ready', message: 'Restore or recover the catalog before making changes.' } }
    const result = operation()
    if (result.ok) accept(result.value.snapshot, 'saved')
    else fail(result.error)
    return result
  }
  return {
    getSnapshot: () => state,
    subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener) } },
    restore,
    // Always reread storage: queued cross-tab events may contain obsolete values.
    handleStorageChange: restore,
    create: (input: unknown, expectedToken: string | null): Result<ProductMutation> => mutate(() => storage.create(input, expectedToken)),
    update: (id: string, input: unknown, expectedToken: string | null): Result<ProductMutation> => mutate(() => storage.update(id, input, expectedToken)),
    delete: (id: string, expectedToken: string | null): Result<DeleteMutation> => mutate(() => storage.delete(id, expectedToken)),
    readRaw: storage.readRaw,
    reset(expectedRaw: string | null): Result<CatalogSnapshot> {
      const result = storage.reset(expectedRaw)
      if (result.ok) accept(result.value, 'saved')
      else fail(result.error)
      return result
    },
  }
}
export type ProductController = ReturnType<typeof createProductController>
