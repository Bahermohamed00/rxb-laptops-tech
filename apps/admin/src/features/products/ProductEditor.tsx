import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { ModalSurface } from '../../components/ModalSurface'
import type { Product, ProductError } from './product.types'
import { useProductActions, useProductCatalog } from './ProductStore'
import { parseProductForm, productFormValues } from './product.form'
import type { ProductFormValues } from './product.form'

export function ProductEditor({ product, token, onClose, onSaved }: { product?: Product; token: string | null; onClose: () => void; onSaved: (product: Product) => void }) {
  const actions = useProductActions()
  const catalog = useProductCatalog()
  const [initial] = useState(() => productFormValues(product))
  const [values, setValues] = useState(initial)
  const [error, setError] = useState<ProductError | null>(null)
  const [discard, setDiscard] = useState(false)
  const [saved, setSaved] = useState(false)
  const completed = useRef(false)
  const form = useRef<HTMLFormElement>(null)
  const discardPanel = useRef<HTMLDivElement>(null)
  const id = useId()
  const dirty = !saved && JSON.stringify(values) !== JSON.stringify(initial)
  const changed = catalog.token !== token
  useEffect(() => {
    if (!dirty) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])
  useEffect(() => { if (discard) discardPanel.current?.querySelector('button')?.focus() }, [discard])

  function field(name: keyof ProductFormValues, label: string, options: { required?: boolean; hint?: string; inputMode?: 'numeric' | 'decimal'; maxLength?: number; children?: ReactNode; wide?: boolean; textarea?: boolean } = {}) {
    const fieldId = `${id}-${name}`
    const message = error?.fields?.[name]
    const common = { id: fieldId, name, value: values[name], required: options.required, 'aria-invalid': message ? true as const : undefined, 'aria-describedby': [options.hint ? `${fieldId}-hint` : '', message ? `${fieldId}-error` : ''].filter(Boolean).join(' ') || undefined,
      onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setValues(previous => ({ ...previous, [name]: event.target.value })) }
    return <div className={`product-field${options.wide ? ' product-field-wide' : ''}`}><label htmlFor={fieldId}>{label}{!options.required && <span>Optional</span>}</label>
      {options.children ? <select {...common}>{options.children}</select> : options.textarea ? <textarea {...common} rows={4} maxLength={options.maxLength} /> : <input {...common} type="text" inputMode={options.inputMode} maxLength={options.maxLength} autoComplete="off" data-autofocus={name === 'brand' ? '' : undefined} />}
      {options.hint && <span className="product-field-hint" id={`${fieldId}-hint`}>{options.hint}</span>}{message && <span className="product-field-error" id={`${fieldId}-error`}>{message}</span>}
    </div>
  }

  return <ModalSurface title={product ? 'Edit product' : 'Add product'} description="Build a local product record. Nothing here publishes to your storefront or changes real inventory." closeLabel="Close product editor" onClose={onClose} requestClose={() => { if (dirty) { setDiscard(true); return false } return true }}>
    {close => <>
      <form ref={form} className="product-editor" noValidate onSubmit={event => {
        event.preventDefault()
        if (completed.current) return
        const parsed = parseProductForm(values)
        if (!parsed.ok) {
          setError(parsed.error)
          const first = Object.keys(parsed.error.fields ?? {})[0]
          form.current?.querySelector<HTMLElement>(`[name="${first}"]`)?.focus()
          return
        }
        const result = product ? actions.update(product.id, parsed.value, token) : actions.create(parsed.value, token)
        if (!result.ok) { setError(result.error); return }
        completed.current = true
        setSaved(true)
        onSaved(result.value.product)
        close()
      }}>
        <div className="modal-body">
          {discard && <div ref={discardPanel} className="product-message product-discard" role="alert"><strong>Discard your unsaved changes?</strong><p>Your saved collection will stay unchanged.</p><div><button type="button" className="button button-quiet" onClick={() => { setDiscard(false); form.current?.querySelector<HTMLInputElement>('input')?.focus() }}>Keep editing</button><button type="button" className="button button-danger" onClick={close}>Discard changes</button></div></div>}
          {error && <div className="product-message product-error" role="alert"><strong>{error.message}</strong>{!error.fields && <p>Your draft is still here. {error.code === 'conflict' || error.code === 'not-found' ? 'Close this editor and reopen the latest record before making changes.' : 'Resolve the storage issue and try again.'}</p>}</div>}
          {changed && !saved && <p className="product-message" role="status">The local collection changed while this editor was open. Your draft has been kept; close and reopen the editor to work from the latest version.</p>}
          <fieldset><legend>Product identity</legend><p className="product-section-note">Start with the essentials. Optional fields are marked.</p><div className="product-form-grid">
            {field('brand', 'Brand', { required: true, maxLength: 80 })}{field('model', 'Model', { required: true, maxLength: 160 })}
          </div></fieldset>
          <fieldset><legend>Specifications</legend><div className="product-form-grid">
            {field('cpu', 'Processor / CPU', { required: true, maxLength: 200 })}{field('gpu', 'Graphics / GPU', { maxLength: 200 })}
            {field('ramGB', 'RAM (GB)', { required: true, inputMode: 'numeric' })}{field('storageGB', 'Storage capacity (GB)', { required: true, inputMode: 'numeric' })}
            {field('storageType', 'Storage type', { children: <><option value="">Unspecified</option><option value="ssd">SSD</option><option value="hdd">HDD</option><option value="hybrid">Hybrid</option></> })}
          </div></fieldset>
          <fieldset><legend>Display</legend><div className="product-form-grid">
            {field('sizeInches', 'Screen size (inches)', { inputMode: 'decimal' })}{field('resolution', 'Resolution', { maxLength: 80 })}
            {field('panelType', 'Panel type', { maxLength: 80 })}{field('refreshRateHz', 'Refresh rate (Hz)', { inputMode: 'numeric' })}
          </div></fieldset>
          <fieldset><legend>Price &amp; local availability</legend><div className="product-form-grid">
            {field('price', 'Price (EGP)', { required: true, inputMode: 'decimal', hint: 'Use a decimal point, for example 24999.50.' })}
            {field('stockQuantity', 'Prototype stock quantity', { required: true, inputMode: 'numeric', hint: 'Simulated quantity only. Never real stock.' })}
            {field('catalogStatus', 'Local catalog status', { required: true, wide: true, children: <><option value="draft">Draft</option><option value="listed">Listed locally</option></>, hint: 'Listed locally does not publish this product.' })}
          </div></fieldset>
          <fieldset><legend>Image &amp; description</legend><div className="product-form-grid">
            {field('imageUrl', 'Image URL', { maxLength: 2048, wide: true, hint: 'An absolute HTTPS image URL, without credentials.' })}
            {field('description', 'Description', { textarea: true, maxLength: 10000, wide: true, hint: 'Plain text. Up to 10,000 characters.' })}
          </div></fieldset>
        </div>
        <footer className="modal-footer"><span className="modal-footer-note">Saved in this browser only</span><button type="button" className="button button-quiet" onClick={() => dirty ? setDiscard(true) : close()}>Cancel</button><button type="submit" className="button button-primary" disabled={saved || catalog.status !== 'ready'}>{product ? 'Save changes' : 'Save product'}</button></footer>
      </form>
    </>}
  </ModalSurface>
}
