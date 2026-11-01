import type { CSSProperties } from 'react'
import { ArrowRightIcon } from '../../components/icons'
import './hero.css'

const delay = (index: number) => ({ '--d': `${index * 90}ms` }) as CSSProperties

export function Hero() {
  return <section className="sf-hero" aria-labelledby="sf-hero-title">
    <div className="sf-hero-backdrop" aria-hidden="true" />
    <div className="sf-container sf-hero-inner">
      <div className="sf-hero-copy">
        <p className="sf-hero-eyebrow sf-reveal" style={delay(0)}>Power meets possibility</p>
        <h1 id="sf-hero-title" className="sf-reveal" style={delay(1)}>Find Your<br /><span>Next Machine.</span></h1>
        <p className="sf-hero-lede sf-reveal" style={delay(2)}>High-performance laptops for gaming, work, and everything in between. Trusted. Tested. Delivered in Egypt.</p>
        <div className="sf-hero-actions sf-reveal" style={delay(3)}>
          <a className="sf-btn sf-btn-primary sf-btn-lg" href="/laptops">Shop Laptops<ArrowRightIcon /></a>
          <a className="sf-btn sf-btn-ghost sf-btn-lg" href="#featured">View Deals</a>
        </div>
      </div>

      <div className="sf-hero-visual">
        <div className="sf-hero-machine"><img src="/hero/hero-laptop.webp" alt="Slim laptop with a glowing keyboard and a vivid blue display" width="1010" height="816" fetchPriority="high" decoding="async" /></div>
      </div>
    </div>
  </section>
}
