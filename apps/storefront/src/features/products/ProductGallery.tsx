import { useEffect, useRef, useState } from 'react'
import type { KeyboardEvent, TouchEvent } from 'react'
import { imageSource } from './products.api'
import './product-gallery.css'

type ProductGalleryProps = { images: string[]; label: string; sample?: boolean }

/** Product photo viewer: large stage, thumbnail strip, swipe and a fullscreen view. */
export function ProductGallery({ images, label, sample = false }: ProductGalleryProps) {
  const [active, setActive] = useState(0)
  const [failed, setFailed] = useState<string[]>([])
  const [zoomOpen, setZoomOpen] = useState(false)
  const dialog = useRef<HTMLDialogElement>(null)
  const touchStart = useRef<number | null>(null)

  const count = images.length
  const index = Math.min(active, Math.max(count - 1, 0))
  const current = images[index]
  const currentOk = Boolean(current) && !failed.includes(current)
  const show = (next: number) => setActive((next + count) % count)
  const markFailed = (url: string) => setFailed(value => value.includes(url) ? value : [...value, url])
  const photoLabel = `${label}${count > 1 ? ` — photo ${index + 1} of ${count}` : ''}`

  const imagesKey = images.join('|')
  useEffect(() => { setActive(0); setFailed([]) }, [imagesKey])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (zoomOpen && !element.open) element.showModal()
    if (!zoomOpen && element.open) element.close()
  }, [zoomOpen])

  function onKeyDown(event: KeyboardEvent) {
    if (count < 2) return
    if (event.key === 'ArrowLeft') { event.preventDefault(); show(index - 1) }
    if (event.key === 'ArrowRight') { event.preventDefault(); show(index + 1) }
  }

  function onTouchStart(event: TouchEvent) { touchStart.current = event.touches[0]?.clientX ?? null }
  function onTouchEnd(event: TouchEvent) {
    const start = touchStart.current
    touchStart.current = null
    const end = event.changedTouches[0]?.clientX
    if (start === null || end === undefined || count < 2 || Math.abs(end - start) < 40) return
    show(end < start ? index + 1 : index - 1)
  }

  const arrows = count > 1 && <>
    <button type="button" className="pg-nav is-prev" aria-label="Previous photo" onClick={() => show(index - 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7" /></svg></button>
    <button type="button" className="pg-nav is-next" aria-label="Next photo" onClick={() => show(index + 1)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 5 7 7-7 7" /></svg></button>
  </>

  return <div className={`pg${count > 1 ? ' has-thumbs' : ''}`}>
    <div className="pg-stage" role="group" aria-roledescription="carousel" aria-label={`${label} photos`} tabIndex={0} onKeyDown={onKeyDown} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
      {currentOk
        ? <>
          <button type="button" className="pg-zoom" aria-label={`Open ${photoLabel} full screen`} onClick={() => setZoomOpen(true)}>
            <img key={current} className="pg-photo" src={imageSource(current)} alt={photoLabel} onError={() => markFailed(current)} />
          </button>
        </>
        : <div className="pg-empty"><strong>RXB</strong><span>{current ? 'Product image unavailable' : 'No product image provided'}</span></div>}
      {arrows}
      {count > 1 && <div className="pg-indicator" aria-live="polite">
        <span className="pg-dots" aria-hidden="true">{images.map((url, dot) => <i key={url} className={dot === index ? 'is-active' : undefined} />)}</span>
        <span>{index + 1} / {count}</span>
      </div>}
      {currentOk && <span className="pg-hint" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7" /></svg></span>}
      {sample && <span className="product-detail-sample">SAMPLE / TEST · NOT CONFIRMED INVENTORY</span>}
    </div>

    {count > 1 && <ul className="pg-thumbs" aria-label="Product photos">
      {images.map((url, thumb) => <li key={url}>
        <button type="button" className={thumb === index ? 'is-active' : undefined} aria-label={`Show photo ${thumb + 1}`} aria-current={thumb === index ? 'true' : undefined} onClick={() => setActive(thumb)}>
          {failed.includes(url) ? <span aria-hidden="true">RXB</span> : <img src={imageSource(url)} alt="" loading="lazy" onError={() => markFailed(url)} />}
        </button>
      </li>)}
    </ul>}

    <dialog ref={dialog} className="pg-lightbox" aria-label={`${label} photo viewer`} onClose={() => setZoomOpen(false)} onKeyDown={onKeyDown} onClick={event => { if (event.target === event.currentTarget) setZoomOpen(false) }}>
      {zoomOpen && currentOk && <img key={current} className="pg-lightbox-photo" src={imageSource(current)} alt={photoLabel} onTouchStart={onTouchStart} onTouchEnd={onTouchEnd} />}
      {arrows}
      {count > 1 && <span className="pg-lightbox-count">{index + 1} / {count}</span>}
      <button type="button" className="pg-close" aria-label="Close photo viewer" onClick={() => setZoomOpen(false)}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg></button>
    </dialog>
  </div>
}
