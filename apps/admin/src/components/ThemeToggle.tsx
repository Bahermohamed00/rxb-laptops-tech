import type { Theme } from '../theme/useTheme'

export function ThemeToggle({ theme, onToggle }: { theme: Theme; onToggle: () => void }) {
  const nextTheme = theme === 'dark' ? 'light' : 'dark'
  return <button
    className="theme-toggle"
    type="button"
    aria-label={`Switch to ${nextTheme} mode`}
    aria-pressed={theme === 'light'}
    title={`Switch to ${nextTheme} mode`}
    onClick={onToggle}
  >
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {theme === 'dark'
        ? <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>
        : <path d="M20.2 15.4A8.5 8.5 0 0 1 8.6 3.8 8.5 8.5 0 1 0 20.2 15.4Z" />}
    </svg>
    <span>{theme === 'dark' ? 'Light' : 'Dark'} mode</span>
  </button>
}
