export function installAdminSessionMock({ products: productFixtures = [] } = {}) {
  const originalFetch = globalThis.fetch
  const products = structuredClone(productFixtures)
  let listResponseOverride
  let createdPayload
  globalThis.fetch = async (input, init) => {
    const url = String(input)
    if (url.endsWith('/auth/session')) {
      return new Response(JSON.stringify({
        user: { id: 'test-admin', email: 'admin@example.test', role: 'SUPER_ADMIN', status: 'ACTIVE' },
        csrfToken: 'test-csrf-token',
      }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (url.endsWith('/auth/logout') && init?.method === 'POST') return new Response(null, { status: 204 })
    if (new URL(url, 'http://localhost').pathname.endsWith('/admin/products') && init?.method === 'POST') {
      if (new Headers(init.headers).get('X-CSRF-Token') !== 'test-csrf-token') return new Response('{}', { status: 403 })
      createdPayload = JSON.parse(init.body)
      const created = {
        ...createdPayload, id: 'a6f9de80-86b4-4d04-948b-442a3f8b4004', currency: 'EGP', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        cpu: null, gpu: null, baseRamGB: null, baseRamType: null, baseStorageGB: null, baseStorageType: null,
        displaySizeInches: null, displayResolution: null, displayPanel: null, refreshRateHz: null, image: null, images: [],
        ramOptions: [], storageOptions: [], combinations: [],
      }
      return new Response(JSON.stringify(created), { status: 201, headers: { 'Content-Type': 'application/json' } })
    }
    if (new URL(url, 'http://localhost').pathname.endsWith('/admin/products') && (!init?.method || init.method === 'GET')) {
      const parsed = new URL(url, 'http://localhost')
      const page = Number(parsed.searchParams.get('page') ?? 1)
      const pageSize = Number(parsed.searchParams.get('pageSize') ?? 12)
      const q = (parsed.searchParams.get('q') ?? '').toLowerCase()
      const filtered = products.filter(item => !q || `${item.brand} ${item.model} ${item.cpu} ${item.gpu}`.toLowerCase().includes(q))
      const result = listResponseOverride ?? { items: filtered.slice((page - 1) * pageSize, page * pageSize), total: filtered.length, page, pageSize }
      return new Response(JSON.stringify(result), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    const productDetailMatch = new URL(url, 'http://localhost').pathname.match(/\/admin\/products\/([^/]+)$/)
    if (productDetailMatch && (!init?.method || init.method === 'GET')) {
      const product = products.find(item => item.id === productDetailMatch[1])
      return product
        ? new Response(JSON.stringify(product), { status: 200, headers: { 'Content-Type': 'application/json' } })
        : new Response('{}', { status: 404 })
    }
    const inventoryMatch = url.match(/\/admin\/products\/([^/]+)\/inventory$/)
    if (inventoryMatch && init?.method === 'PATCH') {
      if (new Headers(init.headers).get('X-CSRF-Token') !== 'test-csrf-token') return new Response('{}', { status: 403 })
      const product = products.find(item => item.id === inventoryMatch[1])
      if (!product) return new Response('{}', { status: 404 })
      const { stockQuantity, reason } = JSON.parse(init.body)
      if (!reason?.trim()) return new Response('{}', { status: 400 })
      product.stockQuantity = stockQuantity
      return new Response(JSON.stringify({ id: product.id, slug: product.slug, stockQuantity, status: product.status, updatedAt: new Date().toISOString() }), { status: 200, headers: { 'Content-Type': 'application/json' } })
    }
    if (/\/admin\/images\/[0-9a-f-]+$/.test(url) && init?.method === 'DELETE') {
      return new Headers(init.headers).get('X-CSRF-Token') === 'test-csrf-token' ? new Response(null, { status: 204 }) : new Response('{}', { status: 403 })
    }
    return originalFetch(input, init)
  }
  const restore = () => { globalThis.fetch = originalFetch }
  restore.products = products
  restore.createdPayload = () => createdPayload
  restore.setListResponseOverride = response => { listResponseOverride = response }
  return restore
}
