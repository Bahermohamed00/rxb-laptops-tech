import { sections, type View } from './navigation'

const views: readonly View[] = [...sections, 'Sign in']
export function viewHash(view: View): string {
  return `#/${view.toLowerCase().replaceAll(' ', '-')}`
}
export function productEditHash(id: string): string {
  return `#/products/${encodeURIComponent(id)}/edit`
}
export function productIdFromHash(hash: string): string | null {
  const match = hash.match(/^#\/products\/([^/]+)\/edit$/i)
  if (!match) return null
  try { return decodeURIComponent(match[1]) } catch { return null }
}
export function hashView(hash: string): View {
  if (productIdFromHash(hash)) return 'Products'
  return views.find(view => viewHash(view) === hash.toLowerCase()) ?? 'Dashboard'
}
