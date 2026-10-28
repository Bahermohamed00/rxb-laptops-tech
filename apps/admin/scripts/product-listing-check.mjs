import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
try {
  const { selectProducts, productBrands, initialQuery, formatPrice, formatUpdated } = await server.ssrLoadModule('/src/features/products/product.selectors.ts')
  const { ProductCollection } = await server.ssrLoadModule('/src/features/products/ProductCollection.tsx')
  const { ProductProvider } = await server.ssrLoadModule('/src/features/products/ProductStore.tsx')
  const { ProductsPage } = await server.ssrLoadModule('/src/features/products/ProductsPage.tsx')
  // Synthetic test records only: no browser storage or product creation is called.
  const common = { cpu: 'Processor Alpha', ramGB: 16, storageGB: 512, catalogStatus: 'listed', createdAt: '2026-10-25T10:00:00.000Z', dataOrigin: 'local-prototype' }
  const products = Object.freeze([
    Object.freeze({ ...common, id: 'a', brand: 'Beta', model: 'Notebook 2', gpu: 'Graphics Z', priceMinor: 250001, stockQuantity: 0, updatedAt: '2026-10-25T11:00:00.000Z' }),
    Object.freeze({ ...common, id: 'b', brand: 'Alpha', model: 'Notebook 10', cpu: 'Processor Beta', priceMinor: 100000, stockQuantity: 5, updatedAt: '2026-10-25T12:00:00.000Z' }),
    Object.freeze({ ...common, id: 'c', brand: 'Alpha', model: 'Notebook 2', priceMinor: 100000, stockQuantity: 10, catalogStatus: 'draft', updatedAt: '2026-10-25T10:00:00.000Z' }),
  ])
  const ids = query => selectProducts(products, { ...initialQuery, ...query }).map(p => p.id)
  assert.deepEqual(ids({}), ['b', 'a', 'c'])
  assert.deepEqual(ids({ sort: 'name' }), ['c', 'b', 'a'])
  assert.deepEqual(ids({ sort: 'price-asc' }), ['b', 'c', 'a'])
  assert.deepEqual(ids({ sort: 'price-desc' }), ['a', 'b', 'c'])
  assert.deepEqual(ids({ sort: 'stock-asc' }), ['a', 'b', 'c'])
  assert.deepEqual(ids({ sort: 'stock-desc' }), ['c', 'b', 'a'])
  assert.deepEqual(ids({ search: ' GRAPHICS z ' }), ['a'])
  assert.deepEqual(ids({ search: 'processor beta' }), ['b'])
  assert.deepEqual(ids({ search: 'alpha', brand: 'Alpha', availability: 'available' }), ['b'])
  assert.deepEqual(ids({ availability: 'out-of-stock' }), ['a'])
  assert.deepEqual(ids({ availability: 'draft' }), ['c'])
  assert.deepEqual(ids({ search: 'no-match' }), [])
  assert.deepEqual(productBrands(products), ['Alpha', 'Beta'])
  assert.deepEqual(products.map(p => p.id), ['a', 'b', 'c'])
  assert.match(formatPrice(250001), /2,500\.01/)
  assert.ok(formatPrice(250001).includes('EGP'))
  assert.ok(formatUpdated(products[0].updatedAt).includes('2026'))
  const html = renderToStaticMarkup(createElement(ProductCollection, { products }))
  assert.match(html, /GPU unspecified/)
  assert.match(html, /Out of stock/)
  assert.match(html, /Listed locally/)
  assert.equal((html.match(/<tbody>/g) || []).length, 1)
  assert.equal((html.match(/<li>/g) || []).length, 3)
  const page = renderToStaticMarkup(createElement(ProductProvider, null, createElement(ProductsPage)))
  assert.match(page, /Local prototype/)
  assert.match(page, /Create a local prototype/)
  assert.match(page, /Reading your local collection/)
  assert.match(page, /disabled=""/)
  console.log('PASS: search, brand/availability combinations, all sort modes, stable ties, source immutability, EGP formatting, desktop/mobile markup, fallback thumbnail, provider loading state and disabled Add product')
} finally { await server.close() }
