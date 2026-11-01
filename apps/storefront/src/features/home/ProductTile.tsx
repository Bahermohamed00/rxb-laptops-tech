import { useState } from 'react'
import { GlowBorderCard } from '@/components/ui/glow-border-card'
import { imageSource, type StoreProduct } from '../products/products.api'
import { HeartIcon } from '../../components/icons'
import { formatEgp, specLines } from './catalog'
import { OpenLaptopArt, PeripheralsArt, type ScreenPalette } from './LaptopArt'

const fallbackPalettes: ScreenPalette[] = ['violet', 'night', 'ember', 'blue']
// RXB electric blue / cyan travelling over the card's own navy, so the glow reads as a moving highlight rather than a rainbow.
// The quiet stops are CSS variables (dark fallbacks) so the light theme can swap them for soft blue-grey.
const glowColors = ['#1687ff', '#61c7ff', '#1687ff', 'var(--sf-glow-mid, #0b1a33)', 'var(--sf-glow-base, #0b1324)', 'var(--sf-glow-base, #0b1324)', 'var(--sf-glow-mid, #0b1a33)', '#1d5cff', '#61c7ff', '#1687ff']
const SAVED_KEY = 'rxb-saved-products'

function readSaved(): string[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as string[] } catch { return [] }
}

function badgeFor(product: StoreProduct) {
  if (!product.available) return { label: 'Sold out', tone: 'red' }
  return product.condition === 'NEW' ? { label: 'New', tone: 'blue' } : { label: 'Pre-owned', tone: 'amber' }
}

export function ProductTile({ product, index, onOpen, glow = false }: { product: StoreProduct; index: number; onOpen: () => void; glow?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false)
  const [saved, setSaved] = useState(() => readSaved().includes(product.id))
  const badge = badgeFor(product)
  const label = `${product.brand} ${product.model}`

  function toggleSaved() {
    const next = saved ? readSaved().filter(id => id !== product.id) : [...readSaved(), product.id]
    try { localStorage.setItem(SAVED_KEY, JSON.stringify(next)) } catch { /* storage unavailable: keep in-memory state only */ }
    setSaved(!saved)
  }

  const card = <article className="sf-product">
    <div className="sf-product-media">
      <span className={`sf-badge sf-badge-${badge.tone}`}>{badge.label}</span>
      <button type="button" className="sf-save" aria-pressed={saved} aria-label={saved ? `Remove ${label} from saved` : `Save ${label}`} onClick={toggleSaved}><HeartIcon /></button>
      {product.imageUrl && !imageFailed
        ? <img src={imageSource(product.imageUrl)} alt={label} loading="lazy" onError={() => setImageFailed(true)} />
        : product.productType === 'LAPTOP' ? <OpenLaptopArt palette={fallbackPalettes[index % fallbackPalettes.length]} /> : <PeripheralsArt />}
    </div>
    <h3>{label}</h3>
    <div className="sf-product-specs">{specLines(product).map(line => <p key={line}>{line}</p>)}</div>
    <div className="sf-product-foot">
      <strong>{formatEgp(product.priceMinor, product.currency)}</strong>
      <a className="sf-btn sf-btn-primary sf-btn-sm" href={`/products/${encodeURIComponent(product.slug)}`} onClick={event => { event.preventDefault(); onOpen() }} aria-label={`View details for ${label}`}>View Details</a>
    </div>
  </article>
  if (!glow) return card
  return <GlowBorderCard className="sf-product-glow" width="100%" aspectRatio="auto" borderRadius="var(--sf-radius)" gradientColors={glowColors} animationDuration={6} borderWidth="0.75em" blurAmount="6px" inset="-0.5em">
    {card}
  </GlowBorderCard>
}

export function ProductTileSkeleton() {
  return <div className="sf-product sf-product-skeleton" aria-hidden="true"><div className="sf-product-media" /><i /><i /><i /></div>
}
