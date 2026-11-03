const LOCAL_API_BASE_URL = 'http://127.0.0.1:5185/api'

export function resolveApiBaseUrl(value: string | undefined, production: boolean): string {
  const configured = value?.trim()
  if (!configured && production) {
    throw new Error('VITE_API_BASE_URL must be set to the HTTPS API base URL before building for production.')
  }

  const candidate = configured || LOCAL_API_BASE_URL
  let url: URL
  try {
    url = new URL(candidate)
  } catch {
    throw new Error('VITE_API_BASE_URL must be an absolute HTTP(S) URL ending in /api.')
  }

  if (!['http:', 'https:'].includes(url.protocol)
    || (production && url.protocol !== 'https:')
    || url.username
    || url.password
    || url.search
    || url.hash
    || !url.pathname.replace(/\/$/, '').endsWith('/api')) {
    throw new Error('VITE_API_BASE_URL must be an HTTPS URL ending in /api without credentials, query, or fragment in production.')
  }

  return candidate.replace(/\/$/, '')
}
