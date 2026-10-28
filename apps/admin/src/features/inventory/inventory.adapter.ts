import type { ProductController } from '../products/product.controller'
import type { InventoryActions } from './inventory.types'
import { calculateAdjustment } from './inventory.model'

/** Development-only adapter. No second balance, movement log, or storage key. */
export function createLocalInventoryAdapter(products: ProductController): InventoryActions {
  return {
    async adjust(command) {
      const snapshot = products.getSnapshot()
      if (snapshot.status !== 'ready') return { ok: false, error: { code: 'not-ready', message: 'Read or recover the product catalog before adjusting stock.' } }
      if (snapshot.token !== command.expectedToken) return { ok: false, error: { code: 'conflict', message: 'The collection changed. Close and reopen this adjustment to use the latest quantity.' } }
      const product = snapshot.products.find(item => item.id === command.productId)
      if (!product) return { ok: false, error: { code: 'not-found', message: 'This product no longer exists. Close this adjustment and select another product.' } }
      const next = calculateAdjustment(product.stockQuantity, command.direction, command.amount)
      if (!next.ok) return next
      const reason = command.reason.trim()
      if (!reason || reason.length > 500) return { ok: false, error: { code: 'validation', message: 'Check the adjustment reason.', fields: { reason: 'Enter a reason between 1 and 500 characters.' } } }
      // Full replacement semantics: retain every product field except stockQuantity.
      const { id, createdAt, updatedAt, dataOrigin, ...input } = product
      const result = products.update(id, { ...input, stockQuantity: next.value }, command.expectedToken)
      return result.ok ? { ok: true, value: result.value.product } : result
    },
  }
}
