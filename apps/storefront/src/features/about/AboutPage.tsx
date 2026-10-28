import { useState } from 'react'
import { SiteFooter } from '../../components/SiteFooter'
import { ThemeToggle } from '../../components/ThemeToggle'
import type { Theme } from '../../theme/useTheme'
import './about.css'

export function AboutPage({ theme, onToggleTheme }: { theme: Theme; onToggleTheme: () => void }) {
  const [menuOpen, setMenuOpen] = useState(false)
  return <main className="site site-ready about-page">
    <div className="announcement"><span className="status-dot" /> RXB LAPTOPS &amp; TECH</div>
    <header className="site-header">
      <div className="header wrap">
        <a className="wordmark" href="/" aria-label="RXB Laptops and Tech home"><img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a>
        <nav className={`main-nav ${menuOpen ? 'main-nav-open' : ''}`} aria-label="Main navigation">
          <a href="/">Home</a><a href="/#laptops">Laptops</a><a href="/#parts">Parts</a><a href="/about" aria-current="page">About</a>
        </nav>
        <div className="header-tools"><ThemeToggle theme={theme} onToggle={onToggleTheme} /><button className="mobile-menu-toggle" type="button" aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'} aria-expanded={menuOpen} onClick={() => setMenuOpen(open => !open)}><span /><span /><span /></button></div>
      </div>
    </header>
    <section className="about-hero wrap" aria-labelledby="about-title">
      <div className="eyebrow"><span>RXB</span><i /> ABOUT THE STORE</div>
      <h1 id="about-title">Technology for<br /><em>everyday needs.</em></h1>
      <p>RXB Laptops &amp; Tech focuses on laptops and technology. Explore published product details, compare compatible laptop configurations, and contact the store to ask about a listing.</p>
      <a className="button-primary" href="/#laptops">Explore the laptop catalog <span aria-hidden="true">↗</span></a>
    </section>
    <section className="about-content wrap" aria-label="About RXB">
      <article><span>01 / PRODUCT INFORMATION</span><h2>Clear listings</h2><p>Published catalog information is supplied by product listings. Specifications, images, prices, and availability may vary by listing.</p></article>
      <article><span>02 / CONFIGURATIONS</span><h2>Compatible choices</h2><p>Where a laptop supports configuration choices, compatible RAM and storage combinations are shown with prices confirmed by the catalog API.</p></article>
      <article><span>03 / ACCESSORIES</span><h2>Catalog scope</h2><p>Accessory availability is shown only when supported by the live catalog. Any separately labeled visual previews are not purchasable inventory.</p></article>
    </section>
    <SiteFooter />
  </main>
}
