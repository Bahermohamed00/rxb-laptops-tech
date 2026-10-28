import { generalInquiryUrl } from '../config/business-contact'

export function SiteFooter() {
  return <footer className="footer site-footer">
    <div className="wrap site-footer-grid">
      <div className="site-footer-brand">
        <a className="wordmark" href="/" aria-label="RXB Laptops and Tech home"><img className="wordmark-logo" src="/rxb-logo-transparent.png" alt="" /><span className="wordmark-caption">LAPTOPS <i>/</i> TECH</span></a>
        <p>Browse laptop listings and technology products from RXB.</p>
      </div>
      <nav aria-label="Footer navigation">
        <strong>EXPLORE</strong>
        <a href="/">Home</a>
        <a href="/#laptops">Laptops / catalog</a>
        <a href="/#parts">Parts &amp; accessories</a>
      </nav>
      <nav aria-label="About and contact">
        <strong>RXB</strong>
        <a href="/about">About</a>
        <a href={generalInquiryUrl()} target="_blank" rel="noreferrer" aria-label="Contact RXB on WhatsApp">Contact on WhatsApp</a>
      </nav>
      <div className="site-footer-legal"><span>© {new Date().getFullYear()} RXB Laptops &amp; Tech</span><span>Product details and availability are shown as listed.</span></div>
    </div>
  </footer>
}
