import { SOCIAL_LINKS, generalInquiryUrl, topicInquiryUrl } from '../config/business-contact'
import { PhoneIcon, WhatsAppIcon } from './icons'
import './site-footer.css'

const columns = [
  {
    title: 'Shop',
    links: [
      { label: 'Laptops', href: '/laptops' },
      { label: 'Gaming Laptops', href: '/laptops?use=GAMING' },
      { label: 'Workstations', href: '/laptops?use=WORK' },
      { label: 'Accessories', href: '/laptops#accessories' },
      { label: 'Deals', href: '/#featured' },
    ],
  },
  {
    title: 'Customer Service',
    links: [
      { label: 'Track Order', href: topicInquiryUrl('tracking my order'), external: true },
      { label: 'Shipping & Delivery', href: topicInquiryUrl('shipping and delivery'), external: true },
      { label: 'Returns & Warranty', href: topicInquiryUrl('returns and warranty'), external: true },
      { label: 'FAQ', href: '/about' },
      { label: 'Contact Us', href: generalInquiryUrl(), external: true },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'About RXB', href: '/about' },
      { label: 'Our Mission', href: '/about' },
      { label: 'Browse Brands', href: '/#brands' },
    ],
  },
]

const paymentMethods = ['VISA', 'Mastercard', 'Meeza', 'Vodafone Cash', 'InstaPay']

export function SiteFooter() {
  const socials = SOCIAL_LINKS.filter(link => link.url)
  return <footer className="sf-footer">
    <div className="sf-container sf-footer-grid">
      <div className="sf-footer-brand">
        <a className="sf-footer-logo" href="/" aria-label="RXB Laptops and Tech home"><img src="/rxb-logo-transparent.png" alt="" width="973" height="575" /></a>
        <p>Your trusted source for laptops, workstations, and tech accessories in Egypt.</p>
        {socials.length > 0 && <ul className="sf-socials">{socials.map(link => <li key={link.label}><a href={link.url} target="_blank" rel="noreferrer">{link.label}</a></li>)}</ul>}
      </div>
      {columns.map(column => <nav key={column.title} aria-label={column.title}>
        <h2>{column.title}</h2>
        <ul>{column.links.map(link => <li key={link.label}><a href={link.href} {...('external' in link ? { target: '_blank', rel: 'noreferrer' } : {})}>{link.label}</a></li>)}</ul>
      </nav>)}
      <div className="sf-footer-help">
        <p className="sf-footer-help-head"><PhoneIcon /><strong>Need Help?</strong><span>Chat with us on WhatsApp</span></p>
        <a className="sf-footer-whatsapp" href={generalInquiryUrl()} target="_blank" rel="noreferrer"><WhatsAppIcon />Order via WhatsApp</a>
        <h2>We Accept</h2>
        <ul className="sf-payments">{paymentMethods.map(method => <li key={method}>{method}</li>)}</ul>
      </div>
    </div>
    <div className="sf-footer-bottom">
      <div className="sf-container">
        <span>© {new Date().getFullYear()} RXB Laptops &amp; Tech. All rights reserved.</span>
        <span>Built with passion for a better tech experience. <i>|</i> Egypt <i>|</i> English <i>|</i> EGP</span>
      </div>
    </div>
  </footer>
}
