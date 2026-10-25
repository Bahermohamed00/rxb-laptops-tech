import { useState } from 'react'
import { Icon } from '../../components/Icon'

export function ProductImage({ url }: { url?: string }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const [loadedUrl, setLoadedUrl] = useState<string | null>(null)
  return <span className="product-thumbnail" aria-hidden="true">
    <Icon name="Products" />
    {url && failedUrl !== url && <img key={url} src={url} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" className={loadedUrl === url ? 'is-loaded' : ''} onLoad={() => setLoadedUrl(url)} onError={() => setFailedUrl(url)} />}
  </span>
}
