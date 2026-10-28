import type { Product, Result } from '../products/product.types'

/** Frontend contracts only. No inventory IDs or backend schema are assumed. */
export type StockLevel = 'zero' | 'low' | 'healthy'
export type InventoryQuery = { search: string; stock: StockLevel | ''; sort: 'name' | 'quantity-asc' | 'quantity-desc' | 'updated' }
export type StockAdjustment = Readonly<{
  productId: string
  direction: 'increase' | 'decrease'
  amount: number
  reason: string
  /** Development catalog token captured when the drawer opens. */
  expectedToken: string | null
}>
export type InventoryActions = {
  adjust(command: StockAdjustment): Promise<Result<Product>>
}
export const inventoryCapabilities = { createSeparateRecord: false, archive: false, movementHistory: false, reservations: false } as const
