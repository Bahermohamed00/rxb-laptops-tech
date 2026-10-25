import assert from 'node:assert/strict'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { createElement } from 'react'
import { renderToString } from 'react-dom/server'
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
try {
  const { createProductStorage, PRODUCT_STORAGE_KEY } = await server.ssrLoadModule('/src/features/products/product.storage.ts')
  const { validateProductInput, deriveAvailability } = await server.ssrLoadModule('/src/features/products/product.validation.ts')
  const { createProductController } = await server.ssrLoadModule('/src/features/products/product.controller.ts')
  const { ProductProvider, useProductCatalog } = await server.ssrLoadModule('/src/features/products/ProductStore.tsx')
  let raw = null
  let writes = 0
  let failWrite = false
  const storage = { getItem: key => { assert.equal(key, PRODUCT_STORAGE_KEY); return raw }, setItem: (key, value) => { assert.equal(key, PRODUCT_STORAGE_KEY); if (failWrite) throw new Error('Quota'); writes++; raw = value } }
  let nextId = 0
  const store = createProductStorage({ getStorage: () => storage, id: () => `00000000-0000-4000-8000-${String(++nextId).padStart(12, '0')}`, now: () => '2026-10-25T12:00:00.000Z' })
  const input = { brand: ' Test brand ', model: 'Test model', priceMinor: 125050, cpu: 'Test CPU', ramGB: 16, storageGB: 512, stockQuantity: 2, catalogStatus: 'draft' }
  assert.equal(validateProductInput({ ...input, imageUrl: 'https://example.com/laptop.png', gpu: 'Test GPU', storageType: 'ssd', description: 'Prototype only', display: { sizeInches: 14.5, refreshRateHz: 120, resolution: '2560 × 1600', panelType: 'OLED' } }).ok, true)
  for (const invalid of [{ priceMinor: 0 }, { priceMinor: 1_000_000_001 }, { stockQuantity: 1.2 }, { ramGB: 4097 }, { storageGB: NaN }, { brand: 'x'.repeat(81) }, { description: 'x'.repeat(10001) }, { storageType: 'unknown' }, { display: { refreshRateHz: 0 } }, { imageUrl: 'https:example.com/a.png' }, { imageUrl: 'data:image/png;base64,abc' }]) assert.equal(validateProductInput({ ...input, ...invalid }).ok, false)
  const read = () => { const result = store.read(); assert.equal(result.ok, true); return result.value }
  let snapshot = read()
  assert.deepEqual(snapshot.catalog.products, [])
  assert.equal(writes, 0)
  let result = store.create(input, snapshot.token)
  assert.equal(result.ok, true)
  const product = result.value.product
  assert.equal(product.brand, 'Test brand')
  assert.equal(product.dataOrigin, 'local-prototype')
  assert.equal(product.priceMinor, 125050)
  assert.equal(deriveAvailability(product), 'draft')
  snapshot = read()
  assert.equal(snapshot.catalog.products.length, 1)
  assert.equal(snapshot.catalog.revision, 1)
  assert.equal(snapshot.catalog.dataOrigin, 'local-prototype')
  result = store.update(product.id, { ...input, catalogStatus: 'listed' }, snapshot.token)
  assert.equal(result.ok, true)
  assert.equal(result.value.product.id, product.id)
  assert.equal(result.value.product.createdAt, product.createdAt)
  assert.equal(deriveAvailability(result.value.product), 'available')
  assert.equal(deriveAvailability({ ...product, catalogStatus: 'listed', stockQuantity: 0 }), 'out-of-stock')
  const stale = snapshot.token
  snapshot = read()
  const before = raw
  result = store.update(product.id, input, stale)
  assert.equal(result.error.code, 'conflict')
  assert.equal(raw, before)
  for (const invalid of [{ ...input, brand: '' }, { ...input, priceMinor: 1.2 }, { ...input, stockQuantity: -1 }, { ...input, ramGB: Infinity }, { ...input, imageUrl: 'javascript:alert(1)' }, { ...input, imageUrl: 'http://example.com/a.png' }, { ...input, imageUrl: 'https://user:pass@example.com/a.png' }, { ...input, catalogStatus: 'published' }, { ...input, id: 'override' }, { ...input, display: { sizeInches: -1 } }, { ...input, storageGB: 0 }]) {
    assert.equal(validateProductInput(invalid).ok, false)
    assert.equal(store.create(invalid, snapshot.token).ok, false)
    assert.equal(raw, before)
  }
  failWrite = true
  assert.equal(store.delete(product.id, snapshot.token).error.code, 'storage-write')
  assert.equal(raw, before)
  failWrite = false
  const readFailureRaw = raw
  const readDenied = createProductStorage({ getStorage: () => ({ getItem() { throw new Error('Blocked') }, setItem() { throw new Error('Must not write') } }) })
  assert.equal(readDenied.create(input, snapshot.token).error.code, 'storage-read')
  assert.equal(raw, readFailureRaw)
  const duplicateId = createProductStorage({ getStorage: () => storage, id: () => product.id, now: () => '2026-10-25T12:00:00.000Z' })
  assert.equal(duplicateId.create(input, snapshot.token).error.code, 'generation')
  assert.equal(store.delete('missing', snapshot.token).error.code, 'not-found')
  assert.equal(store.delete(product.id, snapshot.token).ok, true)
  assert.equal(read().catalog.products.length, 0)
  for (const malformed of ['{', 'null', '[]', JSON.stringify({ schemaVersion: 99 }), JSON.stringify({ ...snapshot.catalog, products: [product, product] }), JSON.stringify({ ...snapshot.catalog, products: [{ ...product, stockQuantity: -3 }] }), JSON.stringify({ ...snapshot.catalog, products: [{ ...product, updatedAt: 'bad-date' }] })]) {
    raw = malformed
    const count = writes
    const restored = store.read()
    assert.equal(restored.ok, false)
    assert.equal(restored.error.raw, malformed)
    assert.equal(store.create(input, malformed).ok, false)
    assert.equal(raw, malformed)
    assert.equal(writes, count)
  }
  assert.equal(store.reset('stale').error.code, 'conflict')
  assert.equal(store.reset(raw).ok, true)
  assert.deepEqual(read().catalog.products, [])
  const denied = createProductStorage({ getStorage: () => { throw new Error('Denied') } })
  assert.equal(denied.read().error.code, 'storage-read')
  let providerReads = 0
  const providerStorage = createProductStorage({ getStorage: () => { providerReads++; return storage } })
  function Probe() { return createElement('span', null, useProductCatalog().status) }
  assert.equal(renderToString(createElement(ProductProvider, { storage: providerStorage }, createElement(Probe))), '<span>restoring</span>')
  assert.equal(providerReads, 0)
  assert.throws(() => renderToString(createElement(Probe)), /within ProductProvider/)
  const controller = createProductController(store)
  assert.equal(controller.create(input, null).error.code, 'not-ready')
  assert.equal(controller.restore().ok, true)
  let notified = 0
  const unsubscribe = controller.subscribe(() => notified++)
  let state = controller.getSnapshot()
  result = controller.create(input, state.token)
  assert.equal(result.ok, true)
  assert.equal(controller.getSnapshot().persistence, 'saved')
  assert.equal(notified, 1)
  const editorToken = controller.getSnapshot().token
  failWrite = true
  state = controller.getSnapshot()
  assert.equal(controller.delete(result.value.product.id, state.token).error.code, 'storage-write')
  assert.equal(controller.getSnapshot().products, state.products)
  failWrite = false
  assert.equal(store.create({ ...input, model: 'External edit' }, editorToken).ok, true)
  controller.handleStorageChange()
  assert.equal(controller.getSnapshot().products.length, 2)
  assert.equal(controller.update(result.value.product.id, input, editorToken).error.code, 'conflict')
  raw = '{broken'
  controller.handleStorageChange()
  assert.equal(controller.getSnapshot().status, 'blocked')
  assert.equal(controller.create(input, null).error.code, 'not-ready')
  assert.equal(raw, '{broken')
  assert.equal(controller.reset(raw).ok, true)
  assert.equal(controller.getSnapshot().status, 'ready')
  assert.equal(controller.getSnapshot().products.length, 0)
  const beforeUnsubscribe = notified
  unsubscribe()
  raw = null
  controller.handleStorageChange()
  assert.equal(notified, beforeUnsubscribe)
  assert.equal(controller.getSnapshot().token, null)
  console.log('PASS: empty initialization, CRUD, validation, availability, revision conflicts, failed writes, malformed/unsupported data preservation, explicit reset, denied storage')
  console.log('PASS: controller restoration gate, persistence state, subscriptions, external changes, stale editor conflicts, blocked recovery, storage clearing')
} finally { await server.close() }
