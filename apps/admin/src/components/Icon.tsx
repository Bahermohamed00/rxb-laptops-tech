import type { View } from '../navigation'
export type IconName = View | 'Arrow' | 'Lock' | 'Connection' | 'Layers'
const paths: Record<IconName, string> = {
  Dashboard: 'M3 3h7v7H3z M14 3h7v5h-7z M14 12h7v9h-7z M3 14h7v7H3z',
  Products: 'M4 7.5 12 3l8 4.5v9L12 21l-8-4.5z M4.5 7.8 12 12l7.5-4.2 M12 12v9',
  Inventory: 'M3 8h18v13H3z M7 8V3h10v5 M3 13h18 M10 13v3h4v-3',
  Orders: 'M5 3h14v18l-3-2-4 2-4-2-3 2z M8 8h8 M8 12h5',
  Customers: 'M15 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M16 4a4 4 0 0 1 0 7 M21 21v-2a4 4 0 0 0-3-3.87',
  Reports: 'M4 3v18h17 M8 16v-4 M13 16V7 M18 16v-7',
  'Sign in': 'M10 17l5-5-5-5 M15 12H3 M16 3h5v18h-5',
  Arrow: 'M5 12h14 M13 6l6 6-6 6',
  Lock: 'M5 10h14v11H5z M8 10V6a4 4 0 0 1 8 0v4 M12 14v3',
  Connection: 'M8 3v4 M16 3v4 M5 7h14v3a7 7 0 0 1-7 7v4 M5 10a7 7 0 0 0 3 5.75 M3 21 21 3',
  Layers: 'm3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5',
}
export function Icon({ name, className = '' }: { name: IconName; className?: string }) {
  return <svg className={`icon ${className}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name]} /></svg>
}
