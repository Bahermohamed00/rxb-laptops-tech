import { useEffect } from 'react'
import LogoAssembly from './LogoAssembly'
import './intro.css'
import './logo-assembly.css'

type IntroScreenProps = { onComplete: () => void }

export default function IntroScreen({ onComplete }: IntroScreenProps) {
  useEffect(() => {
    const timer = window.setTimeout(onComplete, 2700)
    return () => window.clearTimeout(timer)
  }, [onComplete])

  return <div className="intro" role="dialog" aria-label="RXB intro">
    <div className="intro-grid" /><div className="intro-blue intro-blue-left" /><div className="intro-blue intro-blue-right" />
    <div className="intro-top"><span>RXB / SYSTEMS</span><span>INITIALIZING <i /></span></div>
    <div className="intro-center"><span className="intro-overline">A NEW STANDARD IN PERSONAL TECH</span><LogoAssembly /><p>POWER YOUR NEXT MOVE</p><div className="loader"><span /></div></div>
    <div className="intro-bottom"><span>SELECTED WITH INTENTION</span><button onClick={onComplete}>SKIP INTRO <span>↗</span></button><span>001 — 003</span></div>
    <div className="intro-scanline" />
  </div>
}
