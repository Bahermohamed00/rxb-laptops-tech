// Run with npm test --workspace @rxb/admin (jsdom is an admin dev dependency).
// This checks DOM behavior, not browser layout or visual animation quality.
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/#/dashboard', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'SVGElement', 'Event', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.getComputedStyle = window.getComputedStyle.bind(window)
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
globalThis.IS_REACT_ACT_ENVIRONMENT = true
let reduced = true
let mobile = false
const queries = []
window.matchMedia = query => {
  const listeners = new Set()
  const evaluate = () => (!query.includes('no-preference') || !reduced) && (!query.includes(': reduce') || reduced) && (!query.includes('max-width: 760px') || mobile)
  const media = { media: query, matches: evaluate(), addListener: fn => listeners.add(fn), removeListener: fn => listeners.delete(fn), addEventListener: (_type, fn) => listeners.add(fn), removeEventListener: (_type, fn) => listeners.delete(fn), dispatch() { const next = evaluate(); if (next !== this.matches) { this.matches = next; listeners.forEach(fn => fn(this)) } } }
  queries.push(media)
  return media
}
function mediaChange() { queries.forEach(query => query.dispatch()) }
globalThis.ResizeObserver = class { observe() {} disconnect() {} }
window.SVGElement.prototype.getBBox = () => ({ x: 0, y: 0, width: 100, height: 100 })
window.SVGElement.prototype.getCTM = () => ({ a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 })
window.SVGElement.prototype.getTotalLength = () => 100
Object.defineProperty(window.SVGElement.prototype, 'transform', { get: () => ({ baseVal: { consolidate: () => ({ matrix: { a: 1, b: 0, c: 0, d: 1, e: 0, f: 0 } }) } }) })
const { createElement, StrictMode, act } = await import('react')
const { createRoot } = await import('react-dom/client')
const server = await createServer({ root: new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), server: { middlewareMode: true }, appType: 'custom' })
const errors = []
const originalError = console.error
const originalWarn = console.warn
console.error = (...args) => { errors.push(args.join(' ')); originalError(...args) }
console.warn = (...args) => { errors.push(args.join(' ')); originalWarn(...args) }
let root
let gsap
const wait = ms => new Promise(resolve => setTimeout(resolve, ms))
const settle = () => act(async () => { await wait(100) })
const heading = () => document.querySelector('h1')?.textContent
const button = label => [...document.querySelectorAll('button')].find(el => el.textContent.trim() === label)
async function click(element) { assert.ok(element, 'control exists'); await act(async () => { element.click() }); await settle() }
try {
  const { default: App } = await server.ssrLoadModule('/src/App.tsx')
  ;({ gsap } = await server.ssrLoadModule('/src/motion/gsap.ts'))
  gsap.globalTimeline.timeScale(20)
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await settle()
  assert.equal(heading(), 'Command center')
  assert.equal(document.querySelector('[data-motion="hero-line"]').style.opacity, '')
  assert.equal(document.querySelectorAll('.bento-panel').length, 5)
  for (const section of ['Products', 'Inventory', 'Orders', 'Customers', 'Reports']) {
    await click(document.querySelector(`[aria-label="Open ${section} workspace"]`))
    assert.equal(heading(), section)
    await click(button('Dashboard'))
  }
  const systemText = document.querySelector('.connection-panel').textContent
  for (const state of ['Not implemented', 'Not configured', 'Unavailable', 'Not a live health check']) assert.ok(systemText.includes(state))
  console.log('PASS: all five Bento navigation controls and honest development states')
  for (const section of ['Products', 'Inventory', 'Orders', 'Customers', 'Reports']) {
    await click(button(section))
    assert.equal(heading(), section)
    assert.equal(window.location.hash, '#/' + section.toLowerCase())
    assert.equal(document.activeElement, document.querySelector('h1'))
    assert.equal(document.querySelectorAll('[aria-current="page"]').length, 1)
    assert.equal(document.querySelector('.view-stage').hasAttribute('inert'), false)
  }
  await click(button('Sign in'))
  assert.equal(heading(), 'Sign in')
  assert.ok(button('Sign in unavailable').disabled)
  assert.equal(document.querySelectorAll('input').length, 0)
  await click(button('Back to dashboard'))
  console.log('PASS: reduced motion, six sections, sign-in, focus, hashes and unavailable credentials')

  await click(button('Products'))
  await click(button('Inventory'))
  await act(async () => { window.history.back(); await wait(100) })
  await settle()
  assert.equal(heading(), 'Products')
  await act(async () => { window.history.forward(); await wait(100) })
  await settle()
  assert.equal(heading(), 'Inventory')
  await act(async () => root.unmount())
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(createElement(StrictMode, null, createElement(App))))
  await settle()
  assert.equal(heading(), 'Inventory')
  console.log('PASS: Back/Forward and remount at current hash (refresh semantics)')

  await act(async () => { reduced = false; mediaChange() })
  await settle()
  await act(async () => { button('Products').click(); button('Orders').click(); button('Reports').click() })
  await settle()
  assert.equal(heading(), 'Reports')
  assert.equal(window.location.hash, '#/reports')
  await click(button('Dashboard'))
  await settle()
  for (const node of document.querySelectorAll('.hero-line, .workspace-card, .connection-panel, .view-stage')) assert.notEqual(getComputedStyle(node).opacity, '0')
  const card = document.querySelector('.workspace-card')
  await act(async () => { card.dispatchEvent(new MouseEvent('pointerenter')); card.dispatchEvent(new MouseEvent('pointermove', { clientX: 50, clientY: 30 })); card.dispatchEvent(new MouseEvent('pointerdown')); card.dispatchEvent(new MouseEvent('pointercancel')) })
  await settle()
  console.log('PASS: animated rapid navigation resolves latest destination; entrance finishes visibly; pointer handlers run')
  const hero = document.querySelector('.hero-panel')
  hero.getBoundingClientRect = () => ({ left: 0, top: 0, width: 800, height: 400 })
  await act(async () => {
    hero.dispatchEvent(new MouseEvent('pointerenter'))
    hero.dispatchEvent(new MouseEvent('pointermove', { clientX: 750, clientY: 350 }))
  })
  await settle()
  const perspective = document.querySelector('.schematic-perspective')
  assert.ok(Number(gsap.getProperty(perspective, 'rotationY')) > 0)
  assert.ok(Number(gsap.getProperty(document.querySelector('[data-depth="core"]'), 'x')) > 0)
  await act(async () => hero.dispatchEvent(new MouseEvent('pointerleave')))
  await settle()
  assert.ok(Math.abs(Number(gsap.getProperty(perspective, 'rotationY'))) < .01)
  console.log('PASS: hero depth responds to pointer and returns to neutral')

  await act(async () => { mobile = true; mediaChange() })
  await settle()
  await click(button('Hide navigation−'))
  assert.equal(document.querySelector('#admin-navigation').inert, true)
  assert.equal(document.querySelector('.nav-toggle').getAttribute('aria-expanded'), 'false')
  await click(button('Show navigation+'))
  assert.equal(document.querySelector('#admin-navigation').inert, false)
  await act(async () => { reduced = true; mediaChange() })
  await settle()
  assert.equal(document.querySelector('[data-motion="hero-line"]').style.opacity, '')
  assert.equal(perspective.style.transform, '')
  console.log('PASS: mobile disclosure semantics and live reduced-motion changes')
  await act(async () => { window.location.hash = '#/unknown'; await wait(50) })
  await settle()
  assert.equal(heading(), 'Command center')
  assert.equal(window.location.hash, '#/dashboard')
  await act(async () => { document.querySelector('.skip-link').click() })
  assert.equal(window.location.hash, '#/dashboard')
  assert.equal(document.activeElement.id, 'main-content')
  await act(async () => { reduced = false; mediaChange(); button('Orders').click() })
  await act(async () => { reduced = true; mediaChange() })
  await settle()
  assert.equal(heading(), 'Orders')
  assert.equal(document.querySelector('.view-stage').hasAttribute('inert'), false)
  console.log('PASS: invalid hash fallback, skip link preserves route, reduced-motion switch during navigation')
  await act(async () => root.unmount())
  root = null
  assert.equal(gsap.globalTimeline.getChildren(true, true, true).length, 0)
  assert.deepEqual(errors, [])
  console.log('PASS: Strict Mode cleanup; no remaining GSAP animations or captured React/GSAP warnings')
} finally {
  if (root) await act(async () => root.unmount())
  console.error = originalError
  console.warn = originalWarn
  gsap?.ticker.sleep()
  await server.close()
  window.close()
}
