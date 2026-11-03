const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()

function requireProductionApiBaseUrl(): string {
  if (!configuredApiBaseUrl) {
    throw new Error('VITE_API_BASE_URL must be set to the HTTPS API base URL before building for production.')
  }
  return configuredApiBaseUrl.replace(/\/$/, '')
}

export const API_BASE_URL = import.meta.env.PROD
  ? requireProductionApiBaseUrl()
  : (configuredApiBaseUrl || 'http://127.0.0.1:5185/api').replace(/\/$/, '')
