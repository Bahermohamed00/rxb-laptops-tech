import { useCallback, useEffect, useState } from 'react'

export type Theme = 'light' | 'dark'

const storageKey = 'rxb-theme'

function systemTheme(): Theme {
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

function storedTheme(): Theme | null {
  const cookie = document.cookie.split('; ').find(value => value.startsWith(`${storageKey}=`))?.split('=')[1]
  if (cookie === 'light' || cookie === 'dark') return cookie
  try {
    const stored = window.localStorage.getItem(storageKey)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>(() => storedTheme() ?? systemTheme())
  const [hasUserChoice, setHasUserChoice] = useState(() => storedTheme() !== null)

  useEffect(() => {
    const root = document.documentElement
    root.dataset.theme = theme
    root.style.colorScheme = theme
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'light' ? '#f4f7fb' : '#030509')

    if (hasUserChoice) {
      const secure = window.location.protocol === 'https:' ? '; Secure' : ''
      document.cookie = `${storageKey}=${theme}; Max-Age=31536000; Path=/; SameSite=Lax${secure}`
      try {
        window.localStorage.setItem(storageKey, theme)
      } catch {
        // The selected theme remains active for this page when storage is unavailable.
      }
    }

    const syncStoredTheme = (event: StorageEvent) => {
      if (event.key !== storageKey) return
      const next = event.newValue === 'light' || event.newValue === 'dark' ? event.newValue : null
      setHasUserChoice(next !== null)
      setTheme(next ?? systemTheme())
    }
    const syncSystemTheme = (event: MediaQueryListEvent) => {
      if (!hasUserChoice) setTheme(event.matches ? 'light' : 'dark')
    }
    const media = window.matchMedia('(prefers-color-scheme: light)')

    window.addEventListener('storage', syncStoredTheme)
    media.addEventListener('change', syncSystemTheme)
    return () => {
      window.removeEventListener('storage', syncStoredTheme)
      media.removeEventListener('change', syncSystemTheme)
    }
  }, [hasUserChoice, theme])

  const toggleTheme = useCallback(() => {
    setHasUserChoice(true)
    setTheme(current => current === 'dark' ? 'light' : 'dark')
  }, [])

  return { theme, toggleTheme }
}
