// Cloudflare Pages advanced-mode worker for the Admin project only.
//
// Proxies same-origin `/api/*` requests to the Render API so the Admin
// session cookie (HttpOnly, Secure, SameSite=Lax, Path=/api, host-only) is a
// first-party cookie of the Admin origin. Without this, *.pages.dev and
// *.onrender.com are different sites and browsers may refuse the cookie.
//
// Runtime configuration (Cloudflare Pages → Settings → Variables):
//   API_ORIGIN = https://<render-service>.onrender.com   (origin only, no path)
// Every other path is served from the static build, with an index.html
// fallback for client routes.

const HOP_BY_HOP = ['connection', 'keep-alive', 'proxy-authenticate', 'proxy-authorization', 'te', 'trailer', 'transfer-encoding', 'upgrade', 'host']

export function apiOrigin(env) {
  const raw = String(env?.API_ORIGIN ?? '').trim()
  let url
  try { url = new URL(raw) } catch { return null }
  const loopback = ['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)
  if ((url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) || url.username || url.password || url.search || url.hash || url.pathname !== '/') return null
  return url.origin
}

export async function proxyApi(request, env, fetchImpl = fetch) {
  const origin = apiOrigin(env)
  if (!origin) return Response.json({ statusCode: 503, message: 'The admin API proxy is not configured.' }, { status: 503 })
  const incoming = new URL(request.url)
  const target = new URL(incoming.pathname + incoming.search, origin)
  const headers = new Headers(request.headers)
  for (const name of HOP_BY_HOP) headers.delete(name)
  for (const name of [...headers.keys()]) if (name.startsWith('cf-') || name === 'x-forwarded-for' || name === 'x-real-ip') headers.delete(name)
  const clientIp = request.headers.get('cf-connecting-ip')
  if (clientIp) headers.set('x-forwarded-for', clientIp)
  headers.set('x-forwarded-proto', 'https')
  const hasBody = !['GET', 'HEAD'].includes(request.method)
  let upstream
  try {
    upstream = await fetchImpl(target.toString(), { method: request.method, headers, body: hasBody ? request.body : undefined, redirect: 'manual' })
  } catch {
    return Response.json({ statusCode: 502, message: 'The admin API is unreachable. It may be starting up; retry shortly.' }, { status: 502 })
  }
  const responseHeaders = new Headers(upstream.headers)
  // Same-origin responses need no CORS headers; drop them so the browser never sees a mismatched origin.
  for (const name of [...responseHeaders.keys()]) if (name.startsWith('access-control-')) responseHeaders.delete(name)
  return new Response(upstream.body, { status: upstream.status, statusText: upstream.statusText, headers: responseHeaders })
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (url.pathname === '/api' || url.pathname.startsWith('/api/')) return proxyApi(request, env)
    const asset = await env.ASSETS.fetch(request)
    if (asset.status !== 404 || !['GET', 'HEAD'].includes(request.method)) return asset
    return env.ASSETS.fetch(new Request(new URL('/index.html', url), request))
  },
}
