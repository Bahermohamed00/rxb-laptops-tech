import { useEffect, useState } from 'react'
import { AboutPage } from './features/about/AboutPage'
import HomePage from './features/home/HomePage'
import IntroScreen from './features/intro/IntroScreen'
import { FloatingWhatsApp } from './components/FloatingWhatsApp'
import { useTheme } from './theme/useTheme'

export default function App() {
  const { theme, toggleTheme } = useTheme()
  const [introVisible, setIntroVisible] = useState(() => !window.location.pathname.startsWith('/products/'))
  const [path, setPath] = useState(window.location.pathname)
  useEffect(() => {
    const updatePath = () => setPath(window.location.pathname)
    window.addEventListener('popstate', updatePath)
    return () => window.removeEventListener('popstate', updatePath)
  }, [])

  if (path === '/about') return <><AboutPage theme={theme} onToggleTheme={toggleTheme} /><FloatingWhatsApp /></>
  return <>
    <HomePage introVisible={introVisible} theme={theme} onToggleTheme={toggleTheme} />
    {introVisible && <IntroScreen onComplete={() => setIntroVisible(false)} theme={theme} onToggleTheme={toggleTheme} />}
    <FloatingWhatsApp />
  </>
}
