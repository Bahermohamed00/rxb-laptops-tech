import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/#/categories', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Event', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
window.matchMedia = query => ({ matches: query.includes(': reduce'), media: query, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} })
const category = { id: 'category-mice', name: 'Mice', normalizedName: 'mice', slug: 'mice', description: 'Pointing devices', imageUrl: null, isActive: true, productCount: 1 }
let products = [category]
let productRequestCount = 0
const originalFetch = globalThis.fetch
window.confirm = () => true
globalThis.fetch = async (input, init = {}) => {
  const url = new URL(String(input), 'http://localhost')
  if (url.pathname.endsWith('/admin/categories') && (!init.method || init.method === 'GET')) return new Response(JSON.stringify(products), { status: 200 })
  if (url.pathname.endsWith('/admin/categories') && init.method === 'POST') {
    assert.equal(new Headers(init.headers).get('X-CSRF-Token'), 'test-csrf-token')
    const body = JSON.parse(init.body)
    const created = { ...body, id: 'category-webcams', normalizedName: body.name.toLowerCase(), slug: body.slug || 'webcams', productCount: 0 }
    products = [...products, created]
    return new Response(JSON.stringify(created), { status: 201 })
  }
  const categoryId = url.pathname.match(/\/admin\/categories\/([^/]+)$/)?.[1]
  if (categoryId && init.method === 'PATCH') {
    assert.equal(new Headers(init.headers).get('X-CSRF-Token'), 'test-csrf-token')
    const body = JSON.parse(init.body)
    products = products.map(item => item.id === categoryId ? { ...item, ...body, normalizedName: body.name.toLowerCase() } : item)
    return new Response(JSON.stringify(products.find(item => item.id === categoryId)), { status: 200 })
  }
  if (categoryId && init.method === 'DELETE') {
    assert.equal(new Headers(init.headers).get('X-CSRF-Token'), 'test-csrf-token')
    products = products.map(item => item.id === categoryId ? { ...item, isActive: false } : item)
    return new Response(JSON.stringify(products.find(item => item.id === categoryId)), { status: 200 })
  }
  if (url.pathname.endsWith('/admin/products')) {
    productRequestCount++
    return new Response(JSON.stringify({ items: [{ id: 'product-mouse', brand: 'RXB', model: 'Mouse 1', sku: 'RXB-MOUSE-1', status: 'ACTIVE' }], total: 1, page: 1, pageSize: 100 }), { status: 200 })
  }
  return new Response('{}', { status: 404 })
}
const { createElement, StrictMode, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true }, appType: 'custom' })
let root
const button = (label, scope = document) => [...scope.querySelectorAll('button')].find(node => node.textContent.trim().startsWith(label))
const click = node => act(async () => { assert.ok(node, 'Expected category action exists'); node.click(); await new Promise(resolve => setTimeout(resolve, 0)) })
const setField = (selector, value) => act(async () => {
  const node = document.querySelector(selector)
  assert.ok(node, `Expected field ${selector}`)
  const prototype = node.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
  Object.getOwnPropertyDescriptor(prototype, 'value').set.call(node, value)
  node.dispatchEvent(new window.Event('input', { bubbles: true }))
})
try {
  const { CategoriesPage } = await server.ssrLoadModule('/src/features/products/CategoriesPage.tsx')
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(CategoriesPage, { csrfToken: 'test-csrf-token' }))))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.match(document.querySelector('.live-products-table').textContent, /Mice.*mice.*1 products.*ACTIVE/s)
  await click(button('1 products'))
  assert.match(document.querySelector('.category-products-preview').textContent, /RXB Mouse 1.*RXB-MOUSE-1/s)
  assert.equal(productRequestCount, 1)
  await click(button('Add category'))
  await setField('.category-editor label input', 'Webcams')
  const form = document.querySelector('.category-editor')
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.ok(products.some(item => item.name === 'Webcams'))
  assert.match(document.querySelector('[role="status"]').textContent, /Webcams was created/)
  const webcamsRow = [...document.querySelectorAll('.live-products-table tbody tr')].find(row => row.textContent.includes('Webcams'))
  await click(button('Edit', webcamsRow))
  const description = [...document.querySelectorAll('.category-editor label')].find(label => label.textContent.includes('Description')).querySelector('textarea')
  await setField('.category-editor textarea', 'Video capture')
  await act(async () => document.querySelector('.category-editor').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.equal(products.find(item => item.id === 'category-webcams').description, 'Video capture')
  const miceRow = [...document.querySelectorAll('.live-products-table tbody tr')].find(row => row.textContent.includes('Mice'))
  await click(button('Archive', miceRow))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.equal(products.find(item => item.id === 'category-mice').isActive, false)
  assert.equal(products.find(item => item.id === 'category-mice').productCount, 1, 'Archiving preserves assigned product counts')
  console.log('PASS: category list/count, associated products, create, edit, and non-destructive archive use the API')
} finally {
  if (root) await act(async () => root.unmount())
  globalThis.fetch = originalFetch
  await server.close()
  window.close()
}
