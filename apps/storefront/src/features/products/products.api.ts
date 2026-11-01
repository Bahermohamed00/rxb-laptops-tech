export type PublicOption = { id: string; capacityGB: number; type: string; priceDeltaMinor: number; isBase: boolean }
export type PublicCombination = { ramOptionId: string; storageOptionId: string }
export type StoreProductType = 'LAPTOP'|'KEYBOARD'|'MOUSE'|'MOUSE_PAD'|'OTHER_ACCESSORY'
export type StoreProductSpecs = Record<string, string | number>
export type StoreProduct = {
  id: string; slug: string; productType: StoreProductType; brand: string; model: string; description: string; condition: 'NEW'|'PRE_OWNED'; conditionNotes: string | null;
  useCase: 'WORK'|'STUDY'|'GAMING'|null;
  currency: string; priceMinor: number; cpu: string | null; gpu: string | null; baseRamGB: number | null; baseRamType: string | null; baseStorageGB: number | null;
  baseStorageType: string | null; displaySizeInches: number | null; displayResolution: string | null; displayPanel: string | null; refreshRateHz: number | null;
  specs: StoreProductSpecs; available: boolean; imageUrl: string | null; imageUrls?: string[]; ramOptions: PublicOption[]; storageOptions: PublicOption[]; combinations: PublicCombination[];
}

export const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5185/api').replace(/\/$/, '')

export async function fetchProducts(signal?: AbortSignal): Promise<StoreProduct[]> {
  const response = await fetch(`${apiBase}/public/products`, { signal, cache: 'no-store', headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 503 ? 'The catalog is temporarily unavailable.' : 'The catalog could not be loaded. Try again.')
  return response.json() as Promise<StoreProduct[]>
}

export async function fetchProductDetail(slug: string): Promise<StoreProduct> {
  const response = await fetch(`${apiBase}/public/products/${encodeURIComponent(slug)}`, { headers: { Accept: 'application/json' } })
  if (!response.ok) throw new Error(response.status === 404 ? 'This product is no longer listed.' : 'Product details could not be loaded. Try again.')
  return response.json() as Promise<StoreProduct>
}

export async function fetchQuote(product: StoreProduct, ramOptionId: string, storageOptionId: string): Promise<{ currency: string; priceMinor: number }> {
  const response = await fetch(`${apiBase}/public/products/${encodeURIComponent(product.slug)}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({ ramOptionId, storageOptionId }),
  })
  if (!response.ok) throw new Error(response.status === 409 ? 'This configuration is currently unavailable.' : 'The selected price could not be confirmed. Try again.')
  return response.json() as Promise<{ currency: string; priceMinor: number }>
}

export function imageSource(url: string) { return `${apiBase}${url.replace(/^\/api/, '')}` }
