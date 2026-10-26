// Full frontend integration. All storage belongs to this isolated jsdom window.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#/inventory', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Event', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
window.matchMedia = query => ({ matches: query.includes(': reduce'), media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
window.HTMLDialogElement.prototype.close = function () { this.open = false }
const { createElement, StrictMode, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' })
let root, gsap
const errors = []
const originalError = console.error
console.error = (...args) => { errors.push(args.join(' ')); originalError(...args) }
const button = (name, scope = document) => [...scope.querySelectorAll('button')].find(el => {
  const copy = el.cloneNode(true)
  copy.querySelectorAll('[aria-hidden="true"]').forEach(child => child.remove())
  return el.getAttribute('aria-label') === name || copy.textContent.trim() === name
})
const click = async node => { assert.ok(node, 'Expected action exists'); await act(async () => node.click()) }
async function fill(name, value) {
  const node = document.querySelector(`[name="${name}"]`)
  assert.ok(node, name)
  const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })) })
}
const submit = () => act(async () => document.querySelector('dialog form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  const { createProductStorage, PRODUCT_STORAGE_KEY } = await server.ssrLoadModule('/src/features/products/product.storage.ts')
  const { calculateAdjustment, stockLevel } = await server.ssrLoadModule('/src/features/inventory/inventory.model.ts')
  assert.equal(calculateAdjustment(3, 'decrease', 3).value, 0)
  for (const amount of [0, -1, 1.5, NaN, Infinity, 1000001]) assert.equal(calculateAdjustment(3, 'increase', amount).ok, false)
  assert.equal(calculateAdjustment(1000000, 'increase', 1).ok, false)
  assert.equal(stockLevel(0), 'zero')
  assert.equal(stockLevel(5), 'low')
  assert.equal(stockLevel(6), 'healthy')
  ;({ gsap } = await server.ssrLoadModule('/src/motion/gsap.ts'))
  const storage = createProductStorage()
  const base = { brand: 'ASUS', model: 'Test G14', cpu: 'Test CPU', gpu: 'Test GPU', priceMinor: 7990000, ramGB: 16, storageGB: 1024, stockQuantity: 3, catalogStatus: 'listed', display: { sizeInches: 14 }, description: 'Synthetic fixture' }
  const first = storage.create(base, null).value.product
  storage.create({ ...base, brand: 'Dell', model: 'Empty model', stockQuantity: 0 }, storage.read().value.token)
  storage.create({ ...base, brand: 'Lenovo', model: 'Draft model', stockQuantity: 12, catalogStatus: 'draft' }, storage.read().value.token)
  const read = () => storage.read().value.catalog.products.find(product => product.id === first.id)
  const mount = async () => { root = createRoot(document.getElementById('root')); await act(async () => root.render(createElement(StrictMode, null, createElement(App)))) }
  await mount()
  assert.ok(button('Adjust stock'), 'Inventory must expose the stock adjustment workflow')
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '15')
  assert.equal(document.querySelectorAll('.inventory-table tbody tr').length, 3)
  await fill('inventorySearch', 'asus')
  assert.equal(document.querySelectorAll('.inventory-table tbody tr').length, 1)
  await fill('inventorySearch', '')
  await fill('stockFilter', 'zero')
  assert.match(document.querySelector('.inventory-table tbody').textContent, /Empty model/)
  await fill('stockFilter', 'low')
  assert.match(document.querySelector('.inventory-table tbody').textContent, /Test G14/)
  await fill('stockFilter', '')
  await fill('inventorySort', 'quantity-desc')
  assert.match(document.querySelector('.inventory-table tbody tr').textContent, /Draft model/)
  await click(button('Adjust Test G14'))
  await fill('direction', 'decrease')
  await fill('amount', '4')
  await fill('reason', 'Synthetic stock correction')
  await submit()
  assert.equal(read().stockQuantity, 3)
  assert.equal(document.querySelector('[name="amount"]').getAttribute('aria-invalid'), 'true')
  await fill('amount', '1.5')
  await submit()
  assert.equal(read().stockQuantity, 3)
  await fill('amount', '1')
  await fill('reason', ' ')
  await submit()
  assert.equal(document.querySelector('[name="reason"]').getAttribute('aria-invalid'), 'true')
  await fill('reason', 'Synthetic stock correction')
  await submit()
  assert.equal(read().stockQuantity, 2)
  assert.equal(read().priceMinor, 7990000)
  assert.deepEqual(read().display, { sizeInches: 14 })
  assert.equal(read().description, 'Synthetic fixture')
  assert.equal(document.querySelector('dialog'), null)
  console.log('PASS: inventory overview, search/filter/sort, validation and stock-only adjustment')

  await click(button('Products'))
  assert.match(document.querySelector('.product-table tbody tr').textContent, /Test G14/)
  assert.equal(document.querySelector('.product-table tbody tr td:nth-child(3)').textContent, '2')
  await click(button('Inventory'))
  await act(async () => root.unmount())
  await mount()
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '14')
  await click(button('Inventory details for Test G14'))
  assert.match(document.querySelector('dialog').textContent, /Movement history is unavailable/)
  await click(button('Close inventory details'))
  await click(button('Archive options for Test G14'))
  const beforeArchive = window.localStorage.getItem(PRODUCT_STORAGE_KEY)
  assert.equal(button('Archive unavailable').disabled, true)
  await click(button('Keep inventory'))
  assert.equal(window.localStorage.getItem(PRODUCT_STORAGE_KEY), beforeArchive)
  console.log('PASS: Products consistency, remount persistence, details and non-destructive archive UI')

  await click(button('Adjust Test G14'))
  await fill('amount', '1')
  await fill('reason', 'Conflict test')
  const { id, createdAt, updatedAt, dataOrigin, ...latest } = read()
  storage.update(id, { ...latest, stockQuantity: 7 }, storage.read().value.token)
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: PRODUCT_STORAGE_KEY })))
  await submit()
  assert.equal(read().stockQuantity, 7)
  assert.ok(document.querySelector('dialog'))
  await click(button('Close stock adjustment'))
  await click(button('Discard adjustment'))
  await click(button('Adjust Test G14'))
  await fill('amount', '1')
  await fill('reason', 'Failed write test')
  const originalSet = window.Storage.prototype.setItem
  window.Storage.prototype.setItem = () => { throw new Error('Quota') }
  await submit()
  window.Storage.prototype.setItem = originalSet
  assert.equal(read().stockQuantity, 7)
  assert.equal(document.querySelector('[name="reason"]').value, 'Failed write test')
  await submit()
  assert.equal(read().stockQuantity, 8)
  console.log('PASS: stale adjustments reject conflicts and failed writes preserve input')

  window.localStorage.setItem(PRODUCT_STORAGE_KEY, '{broken')
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: PRODUCT_STORAGE_KEY })))
  assert.equal(document.querySelector('.inventory-table'), null)
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '—')
  assert.equal(button('Adjust stock').disabled, true)
  window.localStorage.removeItem(PRODUCT_STORAGE_KEY)
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: PRODUCT_STORAGE_KEY })))
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '0')
  assert.match(document.querySelector('.inventory-empty').textContent, /Create a development product first/)
  assert.equal(button('Adjust stock').disabled, true)
  assert.equal(window.localStorage.length, 0, 'No independent inventory store or automatic seeding')
  await act(async () => root.unmount())
  root = null
  assert.equal(gsap.globalTimeline.getChildren(true, true, true).length, 0)
  assert.equal(document.body.style.overflow, '')
  assert.deepEqual(errors, [])
  console.log('PASS: blocked storage hides unknown quantities, disables adjustment and cleans up')
} finally {
  if (root) await act(async () => root.unmount())
  console.error = originalError
  gsap?.ticker.sleep()
  await server.close()
  window.close()
}
