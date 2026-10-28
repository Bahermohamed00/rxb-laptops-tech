// Real React/controller/storage integration with synthetic, in-memory records only.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#/products', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Event', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.matchMedia = query => ({ matches: query.includes(': reduce'), media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
// jsdom does not implement the browser top layer; browser verification covers it.
window.HTMLDialogElement.prototype.showModal = function () { this.open = true }
window.HTMLDialogElement.prototype.close = function () { this.open = false }
const { createElement, StrictMode, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
let root
let gsap
const errors = []
const originalError = console.error
console.error = (...args) => { errors.push(args.join(' ')); originalError(...args) }
const button = (name, scope = document) => [...scope.querySelectorAll('button')].find(node => {
  const copy = node.cloneNode(true)
  copy.querySelectorAll('[aria-hidden="true"]').forEach(child => child.remove())
  return copy.textContent.trim() === name || node.getAttribute('aria-label') === name
})
const click = async node => { assert.ok(node, 'Expected action exists'); await act(async () => node.click()) }
const field = name => document.querySelector(`[name="${name}"]`)
async function fill(name, value) {
  const node = field(name)
  assert.ok(node, `Field ${name} exists`)
  const proto = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : node.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype
  await act(async () => {
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(node, value)
    node.dispatchEvent(new window.Event(node.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }))
  })
}
const submit = () => act(async () => document.querySelector('form').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
try {
  const { ProductProvider } = await server.ssrLoadModule('/src/features/products/ProductStore.tsx')
  const { ProductsPage } = await server.ssrLoadModule('/src/features/products/ProductsPage.tsx')
  const { createProductStorage } = await server.ssrLoadModule('/src/features/products/product.storage.ts')
  ;({ gsap } = await server.ssrLoadModule('/src/motion/gsap.ts'))
  let raw = null
  let writes = 0
  let denied = false
  const storage = createProductStorage({ getStorage: () => ({ getItem: () => raw, setItem: (_key, value) => { if (denied) throw new Error('Quota'); raw = value; writes++ } }) })
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(ProductProvider, { storage }, createElement(ProductsPage)))))
  assert.equal(writes, 0, 'Mount must never seed or rewrite a catalog')
  assert.equal(button('Add product').disabled, false, 'Ready catalog must allow creation')
  await click(button('Add product'))
  await submit()
  assert.equal(writes, 0, 'Invalid forms never write')
  assert.equal(field('brand').getAttribute('aria-invalid'), 'true')
  assert.equal(document.activeElement, field('brand'))
  for (const [key, value] of Object.entries({ brand: 'RXB Test', model: 'Synthetic Notebook', cpu: 'Test CPU', price: '1234.56', ramGB: '16', storageGB: '512', stockQuantity: '2', gpu: 'Test GPU', sizeInches: '14.5', resolution: '1920 × 1080', panelType: 'IPS', refreshRateHz: '120' })) await fill(key, value)
  await fill('price', '1.999')
  await submit()
  assert.equal(writes, 0, 'Money cannot silently round extra decimal places')
  await fill('price', '1234.56')
  await fill('stockQuantity', '')
  await submit()
  assert.equal(writes, 0, 'Blank stock is not an implicit zero')
  await fill('stockQuantity', '2')
  await submit()
  let record = JSON.parse(raw).products[0]
  assert.equal(record.priceMinor, 123456)
  assert.equal(record.display.sizeInches, 14.5)
  assert.equal(record.dataOrigin, 'local-prototype')
  assert.equal(document.querySelector('dialog'), null)
  assert.match(document.querySelector('[data-product-feedback]').textContent, /saved.*browser/i)
  console.log('PASS: validation, exact money parsing, field focus, create and listing feedback')

  await click(button('View Synthetic Notebook'))
  assert.match(document.querySelector('dialog').textContent, /1920 × 1080/)
  await click(button('Close product details'))
  await click(button('Edit Synthetic Notebook'))
  await fill('gpu', '')
  await fill('model', 'Edited Notebook')
  denied = true
  await submit()
  assert.equal(JSON.parse(raw).products[0].model, 'Synthetic Notebook')
  assert.equal(field('model').value, 'Edited Notebook', 'Failed writes preserve draft')
  assert.match(document.querySelector('dialog').textContent, /not saved/i)
  denied = false
  await submit()
  record = JSON.parse(raw).products[0]
  assert.equal(record.model, 'Edited Notebook')
  assert.equal(record.gpu, undefined, 'Replacement update can clear optional fields')
  console.log('PASS: details, edit, optional clearing and failed-write preservation')

  await click(button('Edit Edited Notebook'))
  await fill('model', 'Unsaved draft')
  await click(button('Close product editor'))
  assert.ok(button('Keep editing'))
  await click(button('Keep editing'))
  assert.equal(field('model').value, 'Unsaved draft')
  const current = storage.read().value
  const { id, createdAt, updatedAt, dataOrigin, ...input } = record
  assert.equal(storage.update(id, { ...input, model: 'External edit' }, current.token).ok, true)
  await act(async () => window.dispatchEvent(new window.StorageEvent('storage', { key: 'rxb.admin.products.v1' })))
  await submit()
  assert.equal(JSON.parse(raw).products[0].model, 'External edit', 'Original edit token protects external changes')
  assert.equal(field('model').value, 'Unsaved draft')
  await click(button('Close product editor'))
  await click(button('Discard changes'))
  assert.equal(document.querySelector('dialog'), null)
  console.log('PASS: dirty dismissal and cross-tab stale-editor conflict protection')

  window.history.pushState(null, '', '#/dashboard')
  window.history.pushState(null, '', '#/products')
  await click(button('Add product'))
  await fill('brand', 'Unsaved navigation test')
  await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 100)) })
  assert.equal(window.location.hash, '#/products')
  assert.equal(field('brand').value, 'Unsaved navigation test')
  assert.ok(button('Discard changes'))
  await click(button('Discard changes'))
  await act(async () => { window.history.back(); await new Promise(resolve => setTimeout(resolve, 100)) })
  assert.equal(window.location.hash, '#/dashboard', 'Cancelling modal navigation must preserve the previous route')
  window.history.replaceState(null, '', '#/products')
  console.log('PASS: browser Back protects dirty forms without overwriting the previous route')

  await click(button('Delete External edit'))
  await click(button('Keep product'))
  assert.equal(JSON.parse(raw).products.length, 1)
  await click(button('Delete External edit'))
  denied = true
  await click(button('Delete local product'))
  assert.equal(JSON.parse(raw).products.length, 1)
  assert.ok(document.querySelector('dialog'))
  denied = false
  await click(button('Delete local product'))
  assert.equal(JSON.parse(raw).products.length, 0)
  assert.equal(document.querySelector('dialog'), null)
  assert.ok(button('Add product'))
  await act(async () => root.unmount())
  root = null
  assert.equal(document.body.style.overflow, '')
  assert.equal(gsap.globalTimeline.getChildren(true, true, true).length, 0)
  assert.deepEqual(errors, [])
  console.log('PASS: delete confirmation, failed delete, empty state and Strict Mode cleanup')
} finally {
  if (root) await act(async () => root.unmount())
  console.error = originalError
  gsap?.ticker.sleep()
  await server.close()
  window.close()
}
