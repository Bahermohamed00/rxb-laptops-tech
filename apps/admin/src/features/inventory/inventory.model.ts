import type { Product, Result } from '../products/product.types'
import { PRODUCT_LIMITS } from '../products/product.validation'
import type { InventoryQuery, StockAdjustment, StockLevel } from './inventory.types'

/** Display policy only, not a persisted reorder point or a backend stock rule. */
export const LOW_STOCK_THRESHOLD = 5
export const initialInventoryQuery: InventoryQuery = { search: '', stock: '', sort: 'name' }
export const stockLabels: Record<StockLevel, string> = { zero: 'Out of stock', low: 'Low stock', healthy: 'Above threshold' }
export const stockLevel = (quantity: number): StockLevel => quantity === 0 ? 'zero' : quantity <= LOW_STOCK_THRESHOLD ? 'low' : 'healthy'
export const parseAdjustmentAmount = (text: string) => /^\d+$/.test(text.trim()) ? Number(text.trim()) : NaN

export function calculateAdjustment(current: number, direction: StockAdjustment['direction'], amount: number): Result<number> {
  let message = ''
  if (!Number.isSafeInteger(amount) || amount < 1 || amount > PRODUCT_LIMITS.stockQuantity) message = 'Enter a whole number from 1 to 1,000,000.'
  if (direction !== 'increase' && direction !== 'decrease') return { ok: false, error: { code: 'validation', message: 'Choose increase or decrease.', fields: { direction: 'Choose increase or decrease.' } } }
  const next = direction === 'increase' ? current + amount : current - amount
  if (!message && next < 0) message = `Cannot decrease by more than the current quantity (${current}).`
  if (!message && next > PRODUCT_LIMITS.stockQuantity) message = 'The new prototype quantity cannot exceed 1,000,000.'
  if (message) return { ok: false, error: { code: 'validation', message: 'Check the adjustment amount.', fields: { amount: message } } }
  return { ok: true, value: next }
}

export function selectInventory(products: readonly Product[], query: InventoryQuery) {
  const search = query.search.trim().toLocaleLowerCase('en')
  return products.filter(product => (!search || [product.brand, product.model, product.cpu, product.gpu ?? ''].some(value => value.toLocaleLowerCase('en').includes(search))) && (!query.stock || stockLevel(product.stockQuantity) === query.stock)).sort((a, b) => {
    let order = 0
    if (query.sort === 'quantity-asc') order = a.stockQuantity - b.stockQuantity
    else if (query.sort === 'quantity-desc') order = b.stockQuantity - a.stockQuantity
    else if (query.sort === 'updated') order = b.updatedAt.localeCompare(a.updatedAt)
    else order = `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`, 'en', { numeric: true, sensitivity: 'base' })
    return order || a.id.localeCompare(b.id)
  })
}

export function inventoryOverview(products: readonly Product[]) {
  return { records: products.length, units: products.reduce((sum, product) => sum + product.stockQuantity, 0), low: products.filter(product => stockLevel(product.stockQuantity) === 'low').length, zero: products.filter(product => product.stockQuantity === 0).length }
}
