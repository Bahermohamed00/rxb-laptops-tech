export interface AdminIdentity {
  id: string
  email: string
  role: 'ADMIN' | 'SUPER_ADMIN'
  status: 'ACTIVE' | 'DISABLED'
}

export interface AuthResponse {
  user: AdminIdentity
  csrfToken: string
  expiresAt?: string
}

const apiBase = (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:5185/api').replace(/\/$/, '')

async function apiRequest(path: string, init: RequestInit = {}): Promise<Response> {
  try {
    return await fetch(`${apiBase}${path}`, { ...init, credentials: 'include', headers: { 'Content-Type': 'application/json', ...init.headers } })
  } catch {
    throw new Error('The admin API could not be reached. Start the API and try again.')
  }
}

async function readResponse(response: Response): Promise<AuthResponse> {
  if (response.ok) return response.json() as Promise<AuthResponse>
  if (response.status === 401) throw new Error('The email or password is incorrect.')
  if (response.status === 429) throw new Error('Too many sign-in attempts. Wait before trying again.')
  if (response.status >= 500) throw new Error('The admin service is temporarily unavailable.')
  throw new Error('Sign-in could not be completed. Check the request and try again.')
}

export async function getAdminSession(): Promise<AuthResponse> {
  const response = await apiRequest('/auth/session', { method: 'GET', headers: {} })
  return readResponse(response)
}

export async function signIn(email: string, password: string): Promise<AuthResponse> {
  const response = await apiRequest('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  return readResponse(response)
}

export async function signOut(csrfToken: string): Promise<void> {
  const response = await apiRequest('/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': csrfToken }, body: '{}' })
  if (response.status === 401) throw new Error('The admin session has expired. Sign in again.')
  if (response.status === 403) throw new Error('The session could not be safely ended. Refresh and try again.')
  if (!response.ok) throw new Error('Sign-out could not be completed. Try again.')
}
