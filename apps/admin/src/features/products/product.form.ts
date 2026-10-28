import type { Product, ProductInput, Result } from './product.types'
import { validateProductInput } from './product.validation'

export type ProductFormValues = Record<'brand' | 'model' | 'cpu' | 'gpu' | 'price' | 'ramGB' | 'storageGB' | 'stockQuantity' | 'storageType' | 'catalogStatus' | 'imageUrl' | 'description' | 'sizeInches' | 'resolution' | 'panelType' | 'refreshRateHz', string>

export function productFormValues(product?: Product): ProductFormValues {
  return {
    brand: product?.brand ?? '', model: product?.model ?? '', cpu: product?.cpu ?? '', gpu: product?.gpu ?? '',
    price: product ? `${Math.floor(product.priceMinor / 100)}.${String(product.priceMinor % 100).padStart(2, '0')}` : '',
    ramGB: product ? String(product.ramGB) : '', storageGB: product ? String(product.storageGB) : '',
    stockQuantity: String(product?.stockQuantity ?? 0), catalogStatus: product?.catalogStatus ?? 'draft', storageType: product?.storageType ?? '',
    imageUrl: product?.imageUrl ?? '', description: product?.description ?? '', sizeInches: product?.display?.sizeInches?.toString() ?? '',
    resolution: product?.display?.resolution ?? '', panelType: product?.display?.panelType ?? '', refreshRateHz: product?.display?.refreshRateHz?.toString() ?? '',
  }
}

/** Decimal text → integer piastres, without rounding or accepting exponent notation. */
export function parseProductForm(values: ProductFormValues): Result<ProductInput> {
  const price = values.price.trim()
  const validMoney = /^\d+(?:\.\d{1,2})?$/.test(price)
  const [whole, fraction = ''] = price.split('.')
  const priceMinor = validMoney ? Number(whole) * 100 + Number(fraction.padEnd(2, '0')) : NaN
  const integer = (value: string) => /^\d+$/.test(value.trim()) ? Number(value) : NaN
  const display = {
    ...(values.sizeInches.trim() ? { sizeInches: /^\d+(?:\.\d+)?$/.test(values.sizeInches.trim()) ? Number(values.sizeInches) : NaN } : {}),
    ...(values.refreshRateHz.trim() ? { refreshRateHz: integer(values.refreshRateHz) } : {}),
    ...(values.resolution.trim() ? { resolution: values.resolution } : {}),
    ...(values.panelType.trim() ? { panelType: values.panelType } : {}),
  }
  const result = validateProductInput({
    brand: values.brand, model: values.model, cpu: values.cpu, gpu: values.gpu, priceMinor,
    ramGB: integer(values.ramGB), storageGB: integer(values.storageGB), stockQuantity: integer(values.stockQuantity),
    catalogStatus: values.catalogStatus, ...(values.storageType ? { storageType: values.storageType } : {}),
    imageUrl: values.imageUrl, description: values.description, ...(Object.keys(display).length ? { display } : {}),
  })
  if (result.ok) return result
  const fields = Object.fromEntries(Object.entries(result.error.fields ?? {}).map(([key, message]) => [key === 'priceMinor' ? 'price' : key.replace('display.', ''), key === 'priceMinor' ? 'Enter an EGP amount from 0.01 to 10,000,000 with at most two decimal places.' : message]))
  return { ok: false, error: { ...result.error, fields } }
}
