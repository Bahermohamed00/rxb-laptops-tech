import { useMemo } from 'react'
import { useProductActions, useProductCatalog } from '../products/ProductStore'
import { createLocalInventoryAdapter } from './inventory.adapter'

/** React subscribes to the same controller as Products; no duplicated inventory cache. */
export function useInventory() {
  const catalog = useProductCatalog()
  const products = useProductActions()
  const actions = useMemo(() => createLocalInventoryAdapter(products), [products])
  return { catalog, actions, refresh: products.restore }
}
