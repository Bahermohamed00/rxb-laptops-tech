import { createContext, useContext, useEffect, useState, useSyncExternalStore } from 'react'
import type { ReactNode } from 'react'
import { createProductController, type ProductController } from './product.controller'
import { PRODUCT_STORAGE_KEY, type ProductStorage } from './product.storage'

const ProductContext = createContext<ProductController | null>(null)

/** Mounted above the keyed view boundary. A supplied adapter is fixed for this provider's lifetime. */
export function ProductProvider({ children, storage }: { children: ReactNode; storage?: ProductStorage }) {
  const [controller] = useState(() => createProductController(storage))
  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== PRODUCT_STORAGE_KEY) return
      try {
        if (event.storageArea !== null && event.storageArea !== window.localStorage) return
      } catch { /* Restoration returns a typed storage-read error when access is denied. */ }
      controller.handleStorageChange()
    }
    window.addEventListener('storage', onStorage)
    controller.restore()
    return () => window.removeEventListener('storage', onStorage)
  }, [controller])
  return <ProductContext.Provider value={controller}>{children}</ProductContext.Provider>
}

export function useProductActions() {
  const controller = useContext(ProductContext)
  if (!controller) throw new Error('Product hooks must be used within ProductProvider.')
  return controller
}

export function useProductCatalog() {
  const controller = useProductActions()
  return useSyncExternalStore(controller.subscribe, controller.getSnapshot, controller.getSnapshot)
}
