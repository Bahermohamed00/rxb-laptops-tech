import { useEffect, useRef, useState } from 'react'
import { deleteUnattachedImage, imageSource, uploadProductImage } from './products.api'

export type GalleryImage = { id: string; imageUrl: string }
export const MAX_PRODUCT_IMAGES = 12

function GalleryItem({ image, index, count, busy, onMain, onMove, onRemove }: {
  image: GalleryImage; index: number; count: number; busy: boolean
  onMain: () => void; onMove: (offset: number) => void; onRemove: () => void
}) {
  const [retry, setRetry] = useState(0)
  const [failed, setFailed] = useState(false)
  const [loading, setLoading] = useState(true)
  return <li className="product-upload-preview">
    {failed
      ? <div className="product-upload-preview-failed" role="alert"><strong>Image preview could not be loaded.</strong><button type="button" onClick={() => { setFailed(false); setLoading(true); setRetry(value => value + 1) }}>Retry preview</button></div>
      : <img key={`${image.id}-${retry}`} src={imageSource(image.imageUrl)} alt={index === 0 ? 'Selected product' : `Product photo ${index + 1}`} onLoad={() => setLoading(false)} onError={() => { setLoading(false); setFailed(true) }} />}
    <div>
      {loading && !failed && <span role="status">Loading image preview…</span>}
      <strong>{index === 0 ? 'Main image' : `Photo ${index + 1}`}</strong>
      <div>
        {index > 0 && <button type="button" disabled={busy} onClick={onMain}>Make main</button>}
        {index > 0 && <button type="button" disabled={busy} aria-label={`Move photo ${index + 1} earlier`} onClick={() => onMove(-1)}>←</button>}
        {index < count - 1 && <button type="button" disabled={busy} aria-label={`Move photo ${index + 1} later`} onClick={() => onMove(1)}>→</button>}
        <button type="button" disabled={busy} onClick={onRemove}>Remove</button>
      </div>
    </div>
  </li>
}

export function ProductImageUpload({ csrfToken, initial, onChange }: { csrfToken: string; initial?: GalleryImage[]; onChange: (images: GalleryImage[]) => void }) {
  const input = useRef<HTMLInputElement>(null)
  const [images, setImages] = useState<GalleryImage[]>(initial ?? [])
  const [dragging, setDragging] = useState(false)
  const [progress, setProgress] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const currentImages = useRef(images)
  const originalIds = useRef(new Set((initial ?? []).map(image => image.id)))
  useEffect(() => { currentImages.current = images }, [images])
  useEffect(() => () => {
    for (const image of currentImages.current) {
      if (!originalIds.current.has(image.id)) void deleteUnattachedImage(image.id, csrfToken).catch(() => undefined)
    }
  }, [csrfToken])

  function update(next: GalleryImage[]) {
    currentImages.current = next
    setImages(next); onChange(next)
  }

  function remove(image: GalleryImage) {
    update(currentImages.current.filter(item => item.id !== image.id))
    if (!originalIds.current.has(image.id)) void deleteUnattachedImage(image.id, csrfToken).catch(() => undefined)
  }

  function move(index: number, target: number) {
    const next = [...currentImages.current]
    const [item] = next.splice(index, 1)
    next.splice(target, 0, item)
    update(next)
  }

  async function select(fileList?: FileList | File[] | null) {
    const files = [...(fileList ?? [])]
    if (!files.length) return
    setError('')
    const room = MAX_PRODUCT_IMAGES - currentImages.current.length
    if (room <= 0) { setError(`A product can have up to ${MAX_PRODUCT_IMAGES} images.`); return }
    const valid = files.filter(file => ['image/jpeg', 'image/png', 'image/webp'].includes(file.type) && file.size <= 5 * 1024 * 1024)
    const skipped = files.length - valid.length
    const queue = valid.slice(0, room)
    setBusy(true)
    try {
      for (const [index, file] of queue.entries()) {
        setProgress(`Uploading image ${index + 1} of ${queue.length}… 0%`)
        const uploaded = await uploadProductImage(file, csrfToken, value => setProgress(`Uploading image ${index + 1} of ${queue.length}… ${value}%`))
        update([...currentImages.current, uploaded])
      }
      const notes = [
        ...(skipped ? [`${skipped} file${skipped === 1 ? ' was' : 's were'} skipped. Choose JPEG, PNG, or WebP images up to 5 MB.`] : []),
        ...(valid.length > room ? [`Only ${MAX_PRODUCT_IMAGES} images are allowed per product.`] : []),
      ]
      if (notes.length) setError(notes.join(' '))
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'The image could not be uploaded.') }
    finally { setBusy(false); setProgress(null); if (input.current) input.current.value = '' }
  }

  return <div className={`product-upload${dragging ? ' is-dragging' : ''}`} onDragOver={event => { event.preventDefault(); setDragging(true) }} onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false) }} onDrop={event => { event.preventDefault(); setDragging(false); void select(event.dataTransfer.files) }}>
    {images.length > 0 && <ol className="product-upload-gallery">
      {images.map((image, index) => <GalleryItem key={image.id} image={image} index={index} count={images.length} busy={busy}
        onMain={() => move(index, 0)} onMove={offset => move(index, index + offset)} onRemove={() => remove(image)} />)}
    </ol>}
    {images.length < MAX_PRODUCT_IMAGES && <button className="product-upload-empty" type="button" disabled={busy} onClick={() => input.current?.click()}><span aria-hidden="true">＋</span><strong>{dragging ? 'Drop images to upload' : images.length ? 'Add more product images' : 'Add product images'}</strong><small>Drag and drop or browse · up to 5 MB each · {images.length}/{MAX_PRODUCT_IMAGES}</small></button>}
    <input ref={input} className="product-upload-input" type="file" multiple accept="image/jpeg,image/png,image/webp" aria-label="Choose product images" onChange={event => void select(event.target.files)} />
    {progress !== null && <div className="product-upload-progress" role="status"><span>{progress}</span></div>}
    {error && <p className="product-upload-error" role="alert">{error}</p>}
  </div>
}
