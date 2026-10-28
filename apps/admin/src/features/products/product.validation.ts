import type { Availability, Product, ProductInput, Result, DisplaySpecifications } from './product.types'

export const PRODUCT_LIMITS = {
  priceMinor: 1_000_000_000, stockQuantity: 1_000_000, ramGB: 4096, storageGB: 131_072,
  brand: 80, model: 160, cpu: 200, gpu: 200, description: 10_000, imageUrl: 2048,
  catalogSize: 10_000,
} as const
const inputKeys = ['brand', 'model', 'priceMinor', 'cpu', 'gpu', 'ramGB', 'storageGB', 'storageType', 'display', 'stockQuantity', 'catalogStatus', 'imageUrl', 'description']
const metadataKeys = ['id', 'createdAt', 'updatedAt', 'dataOrigin']
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}
export function isTimestamp(value: unknown): value is string {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value)) return false
  const date = new Date(value)
  return Number.isFinite(date.getTime()) && date.toISOString() === value
}
export function isProductId(value: unknown): value is string {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
export function deriveAvailability(product: Pick<ProductInput, 'catalogStatus' | 'stockQuantity'>): Availability {
  return product.catalogStatus === 'draft' ? 'draft' : product.stockQuantity > 0 ? 'available' : 'out-of-stock'
}

export function validateProductInput(value: unknown): Result<ProductInput> {
  if (!isRecord(value)) return { ok: false, error: { code: 'validation', message: 'Product fields must be an object.' } }
  const fields: Record<string, string> = {}
  for (const key of Object.keys(value)) if (!inputKeys.includes(key)) fields[key] = 'Unknown or read-only field.'
  const text = (key: string, max: number, required = false) => {
    const raw = value[key]
    if (raw === undefined && !required) return undefined
    if (typeof raw !== 'string') { fields[key] = 'Enter text.'; return undefined }
    const trimmed = raw.trim()
    if (required && !trimmed) fields[key] = 'This field is required.'
    if (trimmed.length > max) fields[key] = `Use at most ${max} characters.`
    return trimmed || undefined
  }
  const integer = (key: string, min: number, max: number) => {
    const number = value[key]
    if (typeof number !== 'number' || !Number.isSafeInteger(number) || number < min || number > max) fields[key] = `Enter a whole number between ${min} and ${max}.`
    return number as number
  }
  const brand = text('brand', PRODUCT_LIMITS.brand, true)
  const model = text('model', PRODUCT_LIMITS.model, true)
  const cpu = text('cpu', PRODUCT_LIMITS.cpu, true)
  const gpu = text('gpu', PRODUCT_LIMITS.gpu)
  const description = text('description', PRODUCT_LIMITS.description)
  const imageUrl = text('imageUrl', PRODUCT_LIMITS.imageUrl)
  if (imageUrl) {
    try {
      const url = new URL(imageUrl)
      if (!/^https:\/\//i.test(imageUrl) || url.protocol !== 'https:' || !url.hostname || url.username || url.password || /[\\\s\u0000-\u001f\u007f]/.test(imageUrl)) throw new Error('Unsafe URL')
    } catch { fields.imageUrl = 'Use an absolute HTTPS URL without credentials or whitespace.' }
  }
  const priceMinor = integer('priceMinor', 1, PRODUCT_LIMITS.priceMinor)
  const ramGB = integer('ramGB', 1, PRODUCT_LIMITS.ramGB)
  const storageGB = integer('storageGB', 1, PRODUCT_LIMITS.storageGB)
  const stockQuantity = integer('stockQuantity', 0, PRODUCT_LIMITS.stockQuantity)
  const catalogStatus = value.catalogStatus
  if (catalogStatus !== 'draft' && catalogStatus !== 'listed') fields.catalogStatus = 'Choose draft or listed.'
  const storageType = value.storageType
  if (storageType !== undefined && storageType !== 'ssd' && storageType !== 'hdd' && storageType !== 'hybrid') fields.storageType = 'Choose SSD, HDD, or hybrid.'
  let display: DisplaySpecifications | undefined
  if (value.display !== undefined) {
    if (!isRecord(value.display)) fields.display = 'Display specifications must be an object.'
    else {
      const d = value.display
      for (const key of Object.keys(d)) if (!['sizeInches', 'resolution', 'panelType', 'refreshRateHz'].includes(key)) fields[`display.${key}`] = 'Unknown field.'
      if (d.sizeInches !== undefined && (typeof d.sizeInches !== 'number' || !Number.isFinite(d.sizeInches) || d.sizeInches < 1 || d.sizeInches > 100)) fields['display.sizeInches'] = 'Enter a size between 1 and 100 inches.'
      if (d.refreshRateHz !== undefined && (typeof d.refreshRateHz !== 'number' || !Number.isSafeInteger(d.refreshRateHz) || d.refreshRateHz < 1 || d.refreshRateHz > 1000)) fields['display.refreshRateHz'] = 'Enter a whole refresh rate between 1 and 1000 Hz.'
      for (const key of ['resolution', 'panelType']) if (d[key] !== undefined && (typeof d[key] !== 'string' || d[key].trim().length > 80)) fields[`display.${key}`] = 'Use text up to 80 characters.'
      display = {
        ...(typeof d.sizeInches === 'number' ? { sizeInches: d.sizeInches } : {}),
        ...(typeof d.refreshRateHz === 'number' ? { refreshRateHz: d.refreshRateHz } : {}),
        ...(typeof d.resolution === 'string' && d.resolution.trim() ? { resolution: d.resolution.trim() } : {}),
        ...(typeof d.panelType === 'string' && d.panelType.trim() ? { panelType: d.panelType.trim() } : {}),
      }
    }
  }
  if (Object.keys(fields).length) return { ok: false, error: { code: 'validation', message: 'Correct the product fields.', fields } }
  return { ok: true, value: {
    brand: brand!, model: model!, cpu: cpu!, priceMinor, ramGB, storageGB, stockQuantity,
    catalogStatus: catalogStatus as ProductInput['catalogStatus'],
    ...(gpu ? { gpu } : {}), ...(description ? { description } : {}), ...(imageUrl ? { imageUrl } : {}),
    ...(storageType ? { storageType: storageType as ProductInput['storageType'] } : {}), ...(display ? { display } : {}),
  } }
}

/** Restored records require valid immutable metadata as well as editable fields. */
export function validateStoredProduct(value: unknown): Result<Product> {
  if (!isRecord(value)) return { ok: false, error: { code: 'validation', message: 'Invalid stored product.' } }
  const editable = Object.fromEntries(Object.entries(value).filter(([key]) => !metadataKeys.includes(key)))
  const validated = validateProductInput(editable)
  if (!validated.ok) return validated
  if (!isProductId(value.id) || !isTimestamp(value.createdAt) || !isTimestamp(value.updatedAt) || value.updatedAt < value.createdAt || value.dataOrigin !== 'local-prototype') {
    return { ok: false, error: { code: 'validation', message: 'Invalid product identity, timestamps, or prototype origin.' } }
  }
  return { ok: true, value: { ...validated.value, id: value.id, createdAt: value.createdAt, updatedAt: value.updatedAt, dataOrigin: 'local-prototype' } }
}
