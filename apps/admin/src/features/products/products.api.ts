export type RamOption = { id?: string; capacityGB: number; type: string; priceDeltaMinor: number; isBase: boolean; isAvailable: boolean }
export type StorageOption = RamOption
export type UpgradeCombination = { ramCapacityGB: number; ramType: string; storageCapacityGB: number; storageType: string; isAvailable: boolean }
export type ProductType = 'LAPTOP'|'KEYBOARD'|'MOUSE'|'MOUSE_PAD'|'OTHER_ACCESSORY'
export type ProductSpecs = Record<string, string | number>
export type ApiProduct = {
  id: string; slug: string; productType: ProductType; brand: string; model: string; description: string; condition: 'NEW'|'PRE_OWNED'; conditionNotes?: string | null;
  useCase: 'WORK'|'STUDY'|'GAMING'|null;
  status: 'DRAFT'|'ACTIVE'|'ARCHIVED'; currency: string; priceMinor: number; cpu: string|null; gpu: string|null; baseRamGB: number|null; baseRamType: string|null;
  baseStorageGB: number|null; baseStorageType: string|null; displaySizeInches?: number | null; displayResolution?: string | null; displayPanel?: string | null;
  refreshRateHz?: number | null; specs: ProductSpecs; stockQuantity: number; createdAt: string; updatedAt: string;
  image: null | { id: string; imageUrl: string }; images: { id: string; imageUrl: string }[]; ramOptions: RamOption[]; storageOptions: StorageOption[]; combinations: UpgradeCombination[];
}
export type ProductPayload = Omit<ApiProduct, 'id'|'createdAt'|'updatedAt'|'currency'|'image'|'images'|'ramOptions'|'storageOptions'|'combinations'|'cpu'|'gpu'|'baseRamGB'|'baseRamType'|'baseStorageGB'|'baseStorageType'> & {
  cpu?: string; gpu?: string; baseRamGB?: number; baseRamType?: string;
  baseStorageGB?: number; baseStorageType?: string;
  specs: ProductSpecs; imageId?: string; imageIds?: string[]; ramOptions: RamOption[]; storageOptions: StorageOption[]; combinations: UpgradeCombination[];
}
export type ProductSearch = {
  q?: string; productType?: ProductType; condition?: ApiProduct['condition']; status?: ApiProduct['status']; useCase?: 'WORK'|'STUDY'|'GAMING'|'UNCATEGORIZED';
  minPriceMinor?: number; maxPriceMinor?: number; cpu?: string; gpu?: string; ramGB?: number; ramType?: string;
  storageGB?: number; storageType?: string; displaySizeInches?: number; displayResolution?: string;
  page?: number; pageSize?: number; sort?: 'PRICE_ASC'|'PRICE_DESC'|'NAME_ASC'|'NAME_DESC'|'CREATED_DESC'|'UPDATED_DESC';
}
export type ProductPage = { items: ApiProduct[]; total: number; page: number; pageSize: number }
export class ProductRequestError extends Error {
  constructor(message: string, readonly fieldErrors: Record<string, string> = {}) {
    super(message)
    this.name = 'ProductRequestError'
  }
}

function isProductPage(value: unknown): value is ProductPage {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const page = value as Record<string, unknown>
  return Array.isArray(page.items)
    && Number.isInteger(page.total) && (page.total as number) >= 0
    && Number.isInteger(page.page) && (page.page as number) > 0
    && Number.isInteger(page.pageSize) && (page.pageSize as number) > 0
}

function collectValidationErrors(items: unknown, parent = '', output: Record<string, string> = {}) {
  if (!Array.isArray(items)) return output
  for (const value of items) {
    if (!value || typeof value !== 'object') continue
    const item = value as { property?: unknown; constraints?: unknown; children?: unknown }
    const property = typeof item.property === 'string' ? [parent, item.property].filter(Boolean).join('.') : parent
    if (item.constraints && typeof item.constraints === 'object' && !Array.isArray(item.constraints)) {
      const message = Object.values(item.constraints as Record<string, unknown>).find(value => typeof value === 'string')
      if (typeof message === 'string') output[property] = message
    }
    collectValidationErrors(item.children, property, output)
  }
  return output
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5185/api').replace(/\/$/, '')
export const imageSource = (url: string) => `${apiBase}${url.replace(/^\/api/, '')}`

async function request<T>(path: string, csrfToken?: string, init: RequestInit = {}): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${apiBase}${path}`, {
      ...init, credentials: 'include',
      headers: { ...(init.body ? { 'Content-Type': 'application/json' } : {}), ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}), ...init.headers },
    })
  } catch { throw new Error('The product service could not be reached. Start the API and retry.') }
  if (response.status === 401) throw new Error('Your admin session expired. Sign in again.')
  if (response.status === 403) throw new Error('You do not have permission to make this change.')
  if (response.status === 429) throw new Error('Too many requests. Wait a moment and try again.')
  if (!response.ok) {
    let payload: { message?: unknown; fieldErrors?: unknown } = {}
    try { payload = await response.json() as typeof payload } catch { /* use safe status-specific messages below */ }
    const fieldErrors: Record<string, string> = {}
    if (payload.fieldErrors && typeof payload.fieldErrors === 'object' && !Array.isArray(payload.fieldErrors)) {
      for (const [field, message] of Object.entries(payload.fieldErrors)) if (typeof message === 'string') fieldErrors[field] = message
    }
    Object.assign(fieldErrors, collectValidationErrors(payload.message))
    for (const [field, message] of Object.entries(fieldErrors)) {
      if (field.startsWith('ramOptions.')) fieldErrors.ramOptions ??= message
      if (field.startsWith('storageOptions.')) fieldErrors.storageOptions ??= message
      if (field.startsWith('combinations.')) fieldErrors.combinations ??= message
    }
    const message = response.status === 401 ? 'Your admin session expired. Sign in again.'
      : response.status === 403 ? 'You do not have permission to make this change.'
        : response.status === 429 ? 'Too many requests. Wait a moment and try again.'
          : response.status === 409 ? (typeof payload.message === 'string' ? payload.message : 'The product conflicts with existing catalog data. Check the URL slug and option combinations.')
            : response.status === 400 ? (typeof payload.message === 'string' ? payload.message : 'Correct the highlighted fields and try again.')
              : 'The product request could not be completed. Try again.'
    throw new ProductRequestError(message, fieldErrors)
  }
  return response.status === 204 ? undefined as T : response.json() as Promise<T>
}

export const listProducts = async (search: ProductSearch = {}): Promise<ProductPage> => {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(search)) if (value !== undefined && value !== '') params.set(key, String(value))
  const result = await request<unknown>(`/admin/products${params.size ? `?${params}` : ''}`)
  if (!isProductPage(result)) {
    throw new ProductRequestError('The product service returned an unexpected product catalog response. Refresh or retry in a moment.')
  }
  return result
}
export async function listAllProducts() {
  const first = await listProducts({ page: 1, pageSize: 100 })
  const pages = await Promise.all(Array.from({ length: Math.ceil(first.total / first.pageSize) - 1 }, (_, index) =>
    listProducts({ page: index + 2, pageSize: first.pageSize }),
  ))
  return [...first.items, ...pages.flatMap(result => result.items)]
}
export const getProduct = (id: string) => request<ApiProduct>(`/admin/products/${id}`)
export const createProduct = (payload: ProductPayload, csrf: string) => request<ApiProduct>('/admin/products', csrf, { method: 'POST', body: JSON.stringify(payload) })
export const updateProduct = (id: string, payload: ProductPayload, csrf: string) => request<ApiProduct>(`/admin/products/${id}`, csrf, { method: 'PATCH', body: JSON.stringify(payload) })
export const archiveProduct = (id: string, csrf: string) => request<ApiProduct>(`/admin/products/${id}`, csrf, { method: 'DELETE' })
export const updateInventoryQuantity = (id: string, stockQuantity: number, reason: string, csrf: string) => request<{ id: string; stockQuantity: number; status: string; updatedAt: string }>(`/admin/products/${id}/inventory`, csrf, { method: 'PATCH', body: JSON.stringify({ stockQuantity, reason }) })
export const deleteUnattachedImage = (id: string, csrf: string) => request<void>(`/admin/images/${id}`, csrf, { method: 'DELETE' })

export function uploadProductImage(file: File, csrf: string, onProgress: (progress: number) => void): Promise<{ id: string; imageUrl: string }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', `${apiBase}/admin/images`)
    xhr.timeout = 120_000
    xhr.withCredentials = true
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')
    xhr.setRequestHeader('X-CSRF-Token', csrf)
    xhr.upload.onprogress = event => { if (event.lengthComputable) onProgress(Math.round(event.loaded / event.total * 100)) }
    xhr.onerror = () => reject(new Error('The image could not be uploaded. Check the API connection.'))
    xhr.ontimeout = () => reject(new Error('The image upload took too long. Check the connection and retry.'))
    xhr.onabort = () => reject(new Error('The image upload was cancelled.'))
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const result = JSON.parse(xhr.responseText) as { id?: unknown; imageUrl?: unknown }
          if (typeof result.id !== 'string' || typeof result.imageUrl !== 'string' || !result.imageUrl.endsWith(`/public/images/${result.id}`)) {
            reject(new Error('The image service returned an invalid image reference.'))
            return
          }
          resolve({ id: result.id, imageUrl: result.imageUrl })
        } catch { reject(new Error('The image service returned an invalid response.')) }
      } else if (xhr.status === 401) reject(new Error('Your admin session expired. Sign in again.'))
      else if (xhr.status === 403) reject(new Error('You do not have permission to upload product images.'))
      else if (xhr.status === 413) reject(new Error('This image exceeds the upload size limit. Choose a smaller file and retry.'))
      else if (xhr.status === 400) reject(new Error('Use a valid JPEG, PNG, or WebP image within the configured size limit.'))
      else if (xhr.status === 503) reject(new Error('Image upload is unavailable because image storage is not configured for this environment.'))
      else reject(new Error('The image upload failed on the server. Your product changes were not saved; retry the upload.'))
    }
    xhr.send(file)
  })
}
