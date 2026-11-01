// API-backed inventory UI integration. The API test double is isolated to this jsdom window.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'
import { installAdminSessionMock } from './mock-admin-session.mjs'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/#/inventory', pretendToBeVisual: true })
const { window } = dom
window.HTMLElement.prototype.scrollIntoView = () => {}
let confirmationCount = 0
let confirmationDecision = true
window.confirm = () => { confirmationCount++; return confirmationDecision }
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Event', 'CustomEvent', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
window.matchMedia = query => ({ matches: query.includes(': reduce'), media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
const stamp = '2026-10-25T10:00:00.000Z'
const makeProduct = (id, brand, model, stockQuantity, status = 'ACTIVE') => ({
  id, slug: `${brand}-${model}`.toLowerCase().replaceAll(' ', '-'), productType: 'LAPTOP', brand, model, description: 'Synthetic fixture', condition: 'NEW', conditionNotes: null,
  status, currency: 'EGP', priceMinor: 7990000, cpu: 'Test CPU', gpu: 'Test GPU', baseRamGB: 16, baseRamType: 'DDR5', baseStorageGB: 1024,
  baseStorageType: 'NVME', displaySizeInches: 14, displayResolution: null, displayPanel: null, refreshRateHz: null, stockQuantity,
  createdAt: stamp, updatedAt: stamp, image: null, images: [], specs: {}, ramOptions: [], storageOptions: [], combinations: [],
})
const fixtures = [
  makeProduct('a6f9de80-86b4-4d04-948b-442a3f8b4001', 'ASUS', 'Test G14', 3),
  makeProduct('a6f9de80-86b4-4d04-948b-442a3f8b4002', 'Dell', 'Empty model', 0),
  makeProduct('a6f9de80-86b4-4d04-948b-442a3f8b4003', 'Lenovo', 'Draft model', 12, 'DRAFT'),
]
const restoreFetch = installAdminSessionMock({ products: fixtures })
const originalXhr = globalThis.XMLHttpRequest
globalThis.XMLHttpRequest = class {
  upload = { onprogress: null }
  open() {}
  setRequestHeader() {}
  send(file) {
    this.upload.onprogress?.({ lengthComputable: true, loaded: file.size, total: file.size })
    this.status = 201
    this.responseText = JSON.stringify({ id: 'f1dd34d1-cc35-4501-bf68-8b4aa859ad51', imageUrl: '/api/public/images/f1dd34d1-cc35-4501-bf68-8b4aa859ad51' })
    this.onload?.()
  }
}
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
const field = name => document.querySelector(`[name="${name}"]`)
const click = async node => { assert.ok(node, 'Expected action exists'); await act(async () => node.click()) }
async function fill(name, value) {
  const node = document.querySelector(`[name="${name}"]`)
  assert.ok(node, name)
  const prototype = node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype
  await act(async () => { Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value); node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true })) })
}
try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  ;({ gsap } = await server.ssrLoadModule('/src/motion/gsap.ts'))
  gsap.globalTimeline.timeScale(20)
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await act(async () => new Promise(resolve => setTimeout(resolve, 80)))
  assert.equal(document.querySelector('h1')?.textContent, 'Inventory')
  assert.ok(button('Adjust stock'), 'Inventory must expose the stock adjustment workflow')
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '15')
  assert.equal(document.querySelectorAll('.live-inventory-row').length, 3)
  await fill('inventorySearch', 'asus')
  assert.equal(document.querySelectorAll('.live-inventory-row').length, 1)
  await fill('inventorySearch', '')
  await fill('stockFilter', 'zero')
  assert.match(document.querySelector('.live-inventory-list').textContent, /Empty model/)
  await fill('stockFilter', 'low')
  assert.match(document.querySelector('.live-inventory-list').textContent, /Test G14/)
  await fill('stockFilter', 'all')
  await fill('inventorySort', 'quantity-desc')
  assert.match(document.querySelector('.live-inventory-row').textContent, /Draft model/)
  await fill('stock-a6f9de80-86b4-4d04-948b-442a3f8b4001', '2')
  await fill('reason-a6f9de80-86b4-4d04-948b-442a3f8b4001', 'Physical count correction')
  await click(button('Save stock for Test G14'))
  assert.equal(restoreFetch.products[0].stockQuantity, 2)
  assert.match(document.querySelector('[role="status"]').textContent, /inventory updated/)
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '14')
  assert.equal(window.localStorage.length, 0, 'The live inventory view must not read or persist product data in browser storage')
  console.log('PASS: API-backed inventory search, stock filters, sorting, CSRF-protected quantity update and no localStorage persistence')

  await click(button('Products'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 350)))
  assert.ok(document.querySelector('.live-products'))
  assert.ok(document.querySelector('.live-products-table'))
  assert.match(document.querySelector('.live-product-row').textContent, /Test G14/)
  await click(document.querySelector('.live-product-row'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  assert.equal(window.location.hash, '#/products/a6f9de80-86b4-4d04-948b-442a3f8b4001/edit')
  assert.match(document.querySelector('.live-product-route').textContent, /ASUS Test G14/)
  assert.match(document.querySelector('.live-product-editor').textContent, /Fixed CPU/)
  const confirmationsBeforeBack = confirmationCount
  await click(button('Back to product list'))
  assert.equal(confirmationCount, confirmationsBeforeBack, 'A clean edit page returns without a discard prompt')
  await click(document.querySelector('.live-product-row'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  await fill('model', 'Unsaved route draft')
  confirmationDecision = false
  await click(button('Products'))
  assert.equal(window.location.hash, '#/products/a6f9de80-86b4-4d04-948b-442a3f8b4001/edit', 'Declining navigation keeps the edit route')
  assert.equal(field('model').value, 'Unsaved route draft', 'Declining navigation preserves the draft')
  confirmationDecision = true
  await click(button('Back to product list'))
  assert.equal(window.location.hash, '#/products', 'Confirming discard returns to the product listing')
  await click(button('Add product'))
  assert.ok(document.querySelector('.live-product-type-picker'))
  const productTypeOptions = [...document.querySelectorAll('.live-product-type-option')]
  assert.equal(productTypeOptions.length, 5)
  assert.ok(productTypeOptions.every(option => option.classList.contains('is-supported') && !option.disabled), 'All database-backed product types must be selectable')
  await click(productTypeOptions.find(option => option.querySelector('strong')?.textContent === 'Laptop'))
  assert.ok(document.querySelector('.live-product-editor'))
  assert.match(document.querySelector('.live-product-editor').textContent, /Supported RAM options/)
  assert.match(document.querySelector('.live-product-editor').textContent, /Supported storage options/)
  assert.match(document.querySelector('.live-product-editor').textContent, /Compatible RAM \+ storage combinations/)
  assert.equal(document.querySelector('.product-upload-input').accept, 'image/jpeg,image/png,image/webp')
  assert.match(document.querySelector('.live-product-editor').textContent, /Fixed CPU/)
  await fill('brand', 'Validation draft')
  await click(button('Create product'))
  assert.equal(field('model').getAttribute('aria-invalid'), 'true')
  assert.match(document.querySelector('#field-error-model').textContent, /Product name is required/)
  await act(async () => new Promise(resolve => window.requestAnimationFrame(resolve)))
  assert.equal(document.activeElement, field('model'), 'The first invalid field receives focus')
  assert.equal(field('brand').value, 'Validation draft', 'Validation preserves already-entered values')
  const imageInput = document.querySelector('.product-upload-input')
  Object.defineProperty(imageInput, 'files', { configurable: true, value: [new window.File([new Uint8Array([1, 2, 3])], 'laptop.png', { type: 'image/png' })] })
  await act(async () => { imageInput.dispatchEvent(new window.Event('change', { bubbles: true })); await new Promise(resolve => setTimeout(resolve, 10)) })
  assert.ok(document.querySelector('.product-upload-preview'))
  assert.equal(document.querySelector('.product-upload-preview img').alt, 'Selected product')
  await click(button('Remove', document.querySelector('.product-upload-preview')))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.ok(document.querySelector('.product-upload-empty'))
  await click(button('Cancel'))
  assert.ok(document.querySelector('.live-product-type-picker'))
  const keyboardOption = [...document.querySelectorAll('.live-product-type-option')].find(option => option.querySelector('strong')?.textContent === 'Keyboard')
  await click(keyboardOption)
  assert.equal(field('productType').value, 'KEYBOARD')
  assert.equal(document.querySelector('.live-advanced-details'), null, 'Accessories must not expose laptop hardware or upgrade fields')
  assert.doesNotMatch(document.querySelector('.live-product-editor').textContent, /Supported RAM options|Supported storage options/)
  assert.ok(field('specs.keyboardType'), 'Keyboard-specific fields appear for keyboards')
  assert.ok(field('specs.connection'))
  assert.ok(field('specs.layout'))
  assert.ok(field('specs.backlight'))
  await fill('brand', 'RXB')
  await fill('model', 'Actual Keyboard Listing')
  await fill('condition', 'NEW')
  await fill('price', '1200.00')
  await fill('stock', '4')
  await click(button('Create product'))
  assert.match(field('specs.keyboardType').getAttribute('aria-invalid'), /true/, 'Required accessory specs are validated')
  await fill('specs.keyboardType', 'Mechanical')
  await fill('specs.connection', 'Wireless')
  await fill('specs.layout', 'EN+AR')
  await fill('specs.backlight', 'RGB')
  await click(button('Create product'))
  assert.deepEqual(restoreFetch.createdPayload().specs, {
    keyboardType: 'Mechanical', connection: 'Wireless', layout: 'EN+AR', backlight: 'RGB',
  })
  assert.equal(restoreFetch.createdPayload().productType, 'KEYBOARD')
  assert.equal(restoreFetch.createdPayload().priceMinor, 120000)
  assert.equal(restoreFetch.createdPayload().stockQuantity, 4)
  console.log('PASS: Keyboard listing form renders type-specific required fields and submits specs in the API payload')
  await act(async () => new Promise(resolve => setTimeout(resolve, 20)))
  assert.ok(document.querySelector('.live-products-table'), 'Saving a product returns to the product listing')
  assert.match(document.querySelector('.live-products').textContent, /RXB Actual Keyboard Listing was created/, 'The listing confirms the created product')
  await click(button('Inventory'))
  await act(async () => root.unmount())
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await act(async () => new Promise(resolve => setTimeout(resolve, 80)))
  assert.equal(document.querySelector('[data-inventory-total]').textContent, '14')
  assert.equal(document.querySelector('[name="stock-a6f9de80-86b4-4d04-948b-442a3f8b4001"]').value, '2')
  console.log('PASS: Products and Inventory show the same API-backed stock after route changes and remount')

  await click(button('Products'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 350)))
  restoreFetch.setListResponseOverride(fixtures)
  await click(button('Refresh'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 10)))
  assert.match(document.querySelector('[role="alert"]').textContent, /unexpected product catalog response/i)
  assert.equal(document.querySelectorAll('.live-product-row').length, 3, 'Previously loaded data remains visible while the API error is shown')
  restoreFetch.setListResponseOverride(undefined)
  await click(button('Retry'))
  await act(async () => new Promise(resolve => setTimeout(resolve, 80)))
  assert.equal(document.querySelectorAll('.live-product-row').length, 3)
  console.log('PASS: Legacy array response shows a safe API contract error, preserves loaded results and can be retried')

  await act(async () => root.unmount())
  root = null
  assert.equal(gsap.globalTimeline.getChildren(true, true, true).length, 0)
  assert.deepEqual(errors, [])
  console.log('PASS: Strict Mode cleanup and no captured React warnings')
} finally {
  if (root) await act(async () => root.unmount())
  console.error = originalError
  restoreFetch()
  globalThis.XMLHttpRequest = originalXhr
  gsap?.ticker.sleep()
  await server.close()
  window.close()
}
