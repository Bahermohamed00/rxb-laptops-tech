import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import { fileURLToPath } from 'node:url'

const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', { url: 'http://localhost/', pretendToBeVisual: true })
const { window } = dom
for (const key of ['window', 'document', 'HTMLElement', 'Element', 'Event', 'MouseEvent']) globalThis[key] = key === 'window' ? window : window[key]
Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true })
globalThis.IS_REACT_ACT_ENVIRONMENT = true
globalThis.requestAnimationFrame = window.requestAnimationFrame.bind(window)
globalThis.cancelAnimationFrame = window.cancelAnimationFrame.bind(window)
window.matchMedia = query => ({ matches: query.includes(': reduce'), media: query, addEventListener() {}, removeEventListener() {} })

const server = await createServer({ root: fileURLToPath(new URL('..', import.meta.url)), server: { middlewareMode: true, hmr: false }, appType: 'custom' })
const { createElement, act } = await import('react')
const { createRoot } = await import('react-dom/client')
let root
const previousFetch = globalThis.fetch
try {
  const { SignInPage } = await server.ssrLoadModule('/src/features/auth/SignInPage.tsx')
  root = createRoot(document.getElementById('root'))
  let authenticated = null
  await act(async () => root.render(createElement(SignInPage, { onAuthenticated: session => { authenticated = session } })))
  assert.match(document.querySelector('h1').textContent, /Welcome back/)
  assert.match(document.querySelector('.signin-subtitle').textContent, /manage your store/)
  assert.equal(document.querySelectorAll('.signin-form input').length, 2)
  assert.equal(document.querySelector('input[type="password"]').autocomplete, 'current-password')
  assert.equal(document.querySelectorAll('.connection-panel,.system-disclaimer').length, 0)

  await act(async () => document.querySelector('[aria-label="Show password"]').click())
  assert.equal(document.querySelector('#signin-password').type, 'text')
  await act(async () => document.querySelector('[aria-label="Hide password"]').click())
  assert.equal(document.querySelector('#signin-password').type, 'password')

  let finishLogin
  let attempts = 0
  globalThis.fetch = (url, init) => {
    attempts += 1
    assert.match(String(url), /\/auth\/login$/)
    assert.equal(init.credentials, 'include')
    assert.equal(JSON.parse(init.body).email, 'admin@example.test')
    return new Promise(resolve => { finishLogin = resolve })
  }
  const email = document.querySelector('#signin-email')
  const password = document.querySelector('#signin-password')
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(email, 'admin@example.test')
    email.dispatchEvent(new window.Event('input', { bubbles: true }))
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(password, 'not-a-real-test-password')
    password.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  const form = document.querySelector('form')
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(document.querySelector('.signin-submit').disabled, true)
  assert.match(document.querySelector('.signin-submit').textContent, /Signing in/)
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  assert.equal(attempts, 1, 'A pending sign-in must not submit twice')
  await act(async () => finishLogin(new Response(JSON.stringify({ user: { id: 'admin-1', email: 'admin@example.test', role: 'ADMIN', status: 'ACTIVE' }, csrfToken: 'memory-only-test-token' }), { status: 200, headers: { 'Content-Type': 'application/json' } })))
  assert.equal(authenticated.user.email, 'admin@example.test')
  assert.equal(password.value, '')
  assert.equal(window.localStorage.length, 0)

  globalThis.fetch = async () => new Response(JSON.stringify({ message: ['Sensitive server trace'] }), { status: 401, headers: { 'Content-Type': 'application/json' } })
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(password, 'wrong')
    password.dispatchEvent(new window.Event('input', { bubbles: true }))
  })
  await act(async () => form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })))
  await act(async () => new Promise(resolve => setTimeout(resolve, 0)))
  assert.match(document.querySelector('[role="alert"]').textContent, /email or password is incorrect/i)
  assert.doesNotMatch(document.querySelector('[role="alert"]').textContent, /trace|Sensitive/i)
  assert.equal(password.value, '')
  console.log('PASS: simple login UI, password visibility, loading, duplicate-submit prevention, safe errors, credentials-in-cookie flow, and no localStorage')
} finally {
  if (root) await act(async () => root.unmount())
  globalThis.fetch = previousFetch
  await server.close()
  window.close()
}
