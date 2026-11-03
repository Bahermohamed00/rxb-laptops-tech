import assert from 'node:assert/strict'
import worker, { apiOrigin, proxyApi } from '../public/_worker.js'

const env = { API_ORIGIN: 'https://rxb-api.onrender.com' }

assert.equal(apiOrigin(env), 'https://rxb-api.onrender.com')
assert.equal(apiOrigin({ API_ORIGIN: 'http://127.0.0.1:5195' }), 'http://127.0.0.1:5195', 'plain HTTP only for local loopback testing')
for (const bad of ['', 'http://rxb-api.onrender.com', 'https://rxb-api.onrender.com/api', 'https://u:p@rxb-api.onrender.com', 'not a url']) {
  assert.equal(apiOrigin({ API_ORIGIN: bad }), null, `rejects ${bad || 'empty'}`)
}
const unconfigured = await proxyApi(new Request('https://admin.example.pages.dev/api/auth/session'), {}, () => { throw new Error('must not fetch') })
assert.equal(unconfigured.status, 503)

let seen
const upstreamHeaders = new Headers({ 'content-type': 'application/json', 'access-control-allow-origin': 'https://admin.example.pages.dev', 'access-control-allow-credentials': 'true' })
upstreamHeaders.append('set-cookie', 'rxb_admin_session=abc; Path=/api; HttpOnly; Secure; SameSite=Lax')
const fakeFetch = async (url, init) => { seen = { url, init }; return new Response('{"ok":true}', { status: 200, headers: upstreamHeaders }) }
const request = new Request('https://admin.example.pages.dev/api/auth/login?x=1', {
  method: 'POST', body: '{"email":"a@b.c"}',
  headers: { Origin: 'https://admin.example.pages.dev', 'X-CSRF-Token': 'csrf', Cookie: 'rxb_admin_session=old', 'Content-Type': 'application/json', 'cf-connecting-ip': '203.0.113.7', 'x-forwarded-for': '6.6.6.6', 'cf-ray': 'r' },
})
const response = await proxyApi(request, env, fakeFetch)
assert.equal(seen.url, 'https://rxb-api.onrender.com/api/auth/login?x=1')
assert.equal(seen.init.method, 'POST')
assert.equal(seen.init.redirect, 'manual')
const sent = seen.init.headers
assert.equal(sent.get('origin'), 'https://admin.example.pages.dev', 'Origin is preserved for the API Origin/CSRF guards')
assert.equal(sent.get('x-csrf-token'), 'csrf')
assert.equal(sent.get('cookie'), 'rxb_admin_session=old')
assert.equal(sent.get('x-forwarded-for'), '203.0.113.7', 'client-supplied X-Forwarded-For is replaced with the Cloudflare client IP')
assert.equal(sent.get('cf-ray'), null)
assert.equal(sent.get('host'), null)
assert.equal(response.status, 200)
assert.deepEqual(response.headers.getSetCookie(), ['rxb_admin_session=abc; Path=/api; HttpOnly; Secure; SameSite=Lax'])
assert.equal(response.headers.get('access-control-allow-origin'), null)

const unreachable = await proxyApi(new Request('https://admin.example.pages.dev/api/health'), env, async () => { throw new Error('down') })
assert.equal(unreachable.status, 502)

const assets = { fetch: async req => new URL(req.url).pathname === '/index.html' ? new Response('<html>app</html>', { status: 200 }) : new Response('nf', { status: 404 }) }
const fallback = await worker.fetch(new Request('https://admin.example.pages.dev/some/deep/route'), { ...env, ASSETS: assets })
assert.equal(fallback.status, 200)
assert.equal(await fallback.text(), '<html>app</html>')
const apiRouted = await worker.fetch(new Request('https://admin.example.pages.dev/api'), { ASSETS: assets })
assert.equal(apiRouted.status, 503, '/api is never served from static assets')

console.log('PASS: admin same-origin API proxy routes /api/*, preserves Origin/CSRF/cookies, replaces forwarded IPs, strips CORS headers, and falls back to index.html')
