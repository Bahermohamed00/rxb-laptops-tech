import { useEffect, useRef, useState } from 'react'
import { deleteUnattachedImage, imageSource, uploadProductImage } from './products.api'

export function ProductImageUpload({ csrfToken, initial, onChange }: { csrfToken: string; initial?: { id: string; imageUrl: string } | null; onChange: (image: { id: string; imageUrl: string } | null) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [image, setImage] = useState(initial ?? null)
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [previewRetry, setPreviewRetry] = useState(0)
  const [previewFailed, setPreviewFailed] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(Boolean(initial))
  const currentImage = useRef(image)
  const originalId = useRef(initial?.id)
  useEffect(() => { currentImage.current = image }, [image])
  useEffect(() => () => {
    const current = currentImage.current
    if (current && current.id !== originalId.current) void deleteUnattachedImage(current.id, csrfToken).catch(() => undefined)
  }, [csrfToken])

  async function select(file?: File) {
    if (!file) return
    setError('')
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) {
      setError('Choose a JPEG, PNG, or WebP image up to 5 MB.')
      return
    }
    setBusy(true); setProgress(0)
    try {
      const uploaded = await uploadProductImage(file, csrfToken, setProgress)
      const previous = currentImage.current
      setImage(uploaded); onChange(uploaded)
      setPreviewFailed(false)
      setPreviewLoading(true)
      setPreviewRetry(0)
      if (previous && previous.id !== originalId.current) void deleteUnattachedImage(previous.id, csrfToken).catch(() => undefined)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The image could not be uploaded.') }
    finally { setBusy(false); setProgress(null); if (input.current) input.current.value = '' }
  }

  return <div className={`product-upload${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); void select(event.dataTransfer.files[0]) }}>
    {image ? <div className="product-upload-preview">
      {previewFailed
        ? <div className="product-upload-preview-failed" role="alert"><strong>Image preview could not be loaded.</strong><button type="button" onClick={() => { setPreviewFailed(false); setPreviewLoading(true); setPreviewRetry(value => value + 1) }}>Retry preview</button></div>
        : <img key={`${image.id}-${previewRetry}`} src={imageSource(image.imageUrl)} alt="Selected product" onLoad={() => setPreviewLoading(false)} onError={() => { setPreviewLoading(false); setPreviewFailed(true) }} />}
      <div>{previewLoading && <span role="status">Loading image preview…</span>}<strong>{previewFailed ? 'Image selected, preview unavailable' : 'Product image selected'}</strong><span>JPEG, PNG, or WebP</span><div><button type="button" disabled={busy} onClick={() => input.current?.click()}>Replace image</button><button type="button" disabled={busy} onClick={() => { const removed = image; currentImage.current = null; setImage(null); onChange(null); setPreviewLoading(false); setPreviewFailed(false); if (removed.id !== originalId.current) void deleteUnattachedImage(removed.id, csrfToken).catch(() => undefined) }}>Remove</button></div></div></div> : <button className="product-upload-empty" type="button" disabled={busy} onClick={() => input.current?.click()}><span aria-hidden="true">＋</span><strong>{dragging ? 'Drop image to upload' : 'Add a product image'}</strong><small>Drag and drop or browse · up to 5 MB</small></button>}
    <input ref={input} className="product-upload-input" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose a product image" onChange={event => void select(event.target.files?.[0])} />
    {progress !== null && <div className="product-upload-progress" role="status"><span>Uploading image… {progress}%</span><progress value={progress} max={100} /></div>}
    {error && <p className="product-upload-error" role="alert">{error}</p>}
  </div>
}
