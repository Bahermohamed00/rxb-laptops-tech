import type { StoreProduct } from '../products/products.api'

export function formatEgp(priceMinor: number, currency: string) {
  return `${currency} ${(priceMinor / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`
}

export function productTypeLabel(product: StoreProduct) {
  switch (product.productType) {
    case 'LAPTOP': return 'Laptop'
    case 'KEYBOARD': return 'Keyboard'
    case 'MOUSE': return 'Mouse'
    case 'MOUSE_PAD': return 'Mouse pad'
    case 'OTHER_ACCESSORY': return 'Accessory'
  }
}

function productSearchText(product: StoreProduct) {
  return [
    product.brand, product.model, product.description, product.conditionNotes,
    product.cpu, product.gpu, product.baseRamGB, product.baseRamType,
    product.baseStorageGB, product.baseStorageType, product.displaySizeInches,
    product.displayResolution, product.displayPanel, product.refreshRateHz,
    productTypeLabel(product),
  ].filter(Boolean).join(' ').toLocaleLowerCase()
}

export function matchesSearch(product: StoreProduct, query: string) {
  const terms = query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean)
  const content = productSearchText(product)
  return terms.every(term => content.includes(term))
}

function storageLabel(gb: number) {
  return gb >= 1000 && gb % 1000 === 0 ? `${gb / 1000}TB` : `${gb}GB`
}

/** Two short spec lines in the "CPU | RAM | Storage" / "GPU | Display" format used on product cards. */
export function specLines(product: StoreProduct): string[] {
  if (product.productType !== 'LAPTOP') {
    const specs = Object.entries(product.specs).slice(0, 3).map(([, value]) => String(value))
    return [[productTypeLabel(product), product.condition === 'NEW' ? 'New' : 'Pre-owned'].join(' | '), specs.join(' | ')].filter(Boolean)
  }
  const first = [
    product.cpu,
    product.baseRamGB !== null ? `${product.baseRamGB}GB RAM` : null,
    product.baseStorageGB !== null ? `${storageLabel(product.baseStorageGB)} ${/ssd|nvme/i.test(product.baseStorageType ?? '') ? 'SSD' : product.baseStorageType ?? ''}`.trim() : null,
  ].filter(Boolean)
  const display = [
    product.displaySizeInches !== null ? `${product.displaySizeInches}"` : null,
    product.displayResolution,
    product.refreshRateHz !== null ? `${product.refreshRateHz}Hz` : null,
  ].filter(Boolean).join(' ')
  const second = [product.gpu, display].filter(Boolean)
  return [first.join(' | '), second.join(' | ')].filter(Boolean)
}

export function parseEgp(value: string) {
  if (!value.trim()) return null
  if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return Number.NaN
  const minor = Math.round(Number(value) * 100)
  return Number.isSafeInteger(minor) && minor <= 1_000_000_000 ? minor : Number.NaN
}
