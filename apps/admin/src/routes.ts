import { sections, type View } from './navigation'

const views: readonly View[] = [...sections, 'Sign in']
export function viewHash(view: View): string {
  return `#/${view.toLowerCase().replaceAll(' ', '-')}`
}
export function hashView(hash: string): View {
  return views.find(view => viewHash(view) === hash.toLowerCase()) ?? 'Dashboard'
}
