import { useEffect } from 'react'
import LogoAssembly from './LogoAssembly'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { Theme } from '../../theme/useTheme'
import './intro.css'
import './logo-assembly.css'

type IntroScreenProps = { onComplete: () => void; theme: Theme; onToggleTheme: () => void }

export default function IntroScreen({ onComplete, theme, onToggleTheme }: IntroScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2700)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return <div className="intro" role="dialog" aria-label="RXB intro">
    <div className="intro-grid" /><div className="intro-blue intro-blue-left" /><div className="intro-blue intro-blue-right" />
    <div className="intro-top"><span>RXB / SYSTEMS</span><div className="intro-status"><span>INITIALIZING <i /></span><ThemeToggle theme={theme} onToggle={onToggleTheme} /></div></div>
    <div className="intro-center"><span className="intro-overline">A NEW STANDARD IN PERSONAL TECH</span><LogoAssembly /><p>POWER YOUR NEXT MOVE</p><div className="loader"><span /></div></div>
    <div className="intro-bottom"><span>SELECTED WITH INTENTION</span><button type="button" aria-label="Skip RXB introduction" onClick={onComplete}>SKIP INTRO <span aria-hidden="true">↗</span></button><span>001 — 003</span></div>
    <div className="intro-scanline" />
  </div>
}
