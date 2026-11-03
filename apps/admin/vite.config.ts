import { defineConfig } from 'vite'
import { loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { resolveApiBaseUrl } from './src/config/api-base'

export default defineConfig(({ command, mode }) => {
  resolveApiBaseUrl(loadEnv(mode, process.cwd(), 'VITE_').VITE_API_BASE_URL, command === 'build')

  return {
    plugins: [react()],
    server: { strictPort: true },
  }
})
