import { useEffect, useId, useRef, useState } from 'react'
import { ModalSurface } from '../../components/ModalSurface'
import type { Product, ProductError } from '../products/product.types'
import { calculateAdjustment, parseAdjustmentAmount } from './inventory.model'
import { useInventory } from './useInventory'
import type { StockAdjustment } from './inventory.types'

export function StockAdjustmentDrawer({ selectedId, onClose, onSaved }: { selectedId?: string; onClose: () => void; onSaved: (product: Product) => void }) {
  const { catalog, actions } = useInventory()
  // Freeze the selection list and token together; never rebase an open adjustment.
  const [opened] = useState(() => ({ products: catalog.products, token: catalog.token }))
  const [productId, setProductId] = useState(selectedId ?? '')
  const [direction, setDirection] = useState<StockAdjustment['direction']>('increase')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState<ProductError | null>(null)
  const [discard, setDiscard] = useState(false)
  const [pending, setPending] = useState(false)
  const [saved, setSaved] = useState(false)
  const submitted = useRef(false)
  const mounted = useRef(true)
  const form = useRef<HTMLFormElement>(null)
  const keepEditing = useRef<HTMLButtonElement>(null)
  const id = useId()
  const product = opened.products.find(item => item.id === productId)
  const preview = product && amount.trim() ? calculateAdjustment(product.stockQuantity, direction, parseAdjustmentAmount(amount)) : null
  const changed = catalog.token !== opened.token
  const dirty = !saved && Boolean(amount || reason || direction !== 'increase' || productId !== (selectedId ?? ''))
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  useEffect(() => {
    if (!dirty && !pending) return
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = '' }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty, pending])
  useEffect(() => { if (discard) keepEditing.current?.focus() }, [discard])
  const requestClose = () => { if (pending) return false; if (dirty) { setDiscard(true); return false } return true }
  const errorProps = (name: string) => ({ 'aria-invalid': error?.fields?.[name] ? true as const : undefined, 'aria-describedby': error?.fields?.[name] ? `${id}-${name}-error` : undefined })
  const message = (name: string) => error?.fields?.[name] && <span className="inventory-field-error" id={`${id}-${name}-error`}>{error.fields[name]}</span>

  return <ModalSurface title="Adjust prototype stock" description="Simulate a quantity change in the shared local product catalog. This never changes real inventory." closeLabel="Close stock adjustment" onClose={onClose} requestClose={requestClose}>
    {close => <form ref={form} className="inventory-adjustment" aria-busy={pending} noValidate onSubmit={async event => {
      event.preventDefault()
      if (submitted.current) return
      let validation: ProductError | null = null
      if (!product) validation = { code: 'validation', message: 'Select a product.', fields: { productId: 'Choose an existing local product.' } }
      else if (!preview?.ok) validation = preview && !preview.ok ? preview.error : { code: 'validation', message: 'Enter an adjustment amount.', fields: { amount: 'Enter a positive whole number.' } }
      else if (!reason.trim() || reason.trim().length > 500) validation = { code: 'validation', message: 'Enter an adjustment reason.', fields: { reason: 'Enter a reason between 1 and 500 characters.' } }
      if (validation) { setError(validation); form.current?.querySelector<HTMLElement>(`[name="${Object.keys(validation.fields ?? {})[0]}"]`)?.focus(); return }
      submitted.current = true
      setPending(true)
      try {
        const result = await actions.adjust({ productId, direction, amount: parseAdjustmentAmount(amount), reason, expectedToken: opened.token })
        if (!mounted.current) return
        if (!result.ok) { setError(result.error); submitted.current = false; return }
        setSaved(true)
        onSaved(result.value)
        close()
      } catch {
        if (mounted.current) { setError({ code: 'storage-write', message: 'The adjustment could not be confirmed. Your input has been kept.' }); submitted.current = false }
      } finally { if (mounted.current) setPending(false) }
    }}>
      <div className="modal-body">
        {discard && <div className="inventory-notice" role="alert"><strong>Discard this unsaved adjustment?</strong><p>No quantity has been changed.</p><div className="inventory-inline-actions"><button ref={keepEditing} type="button" className="button button-quiet" onClick={() => { setDiscard(false); form.current?.querySelector('select')?.focus() }}>Keep editing</button><button type="button" className="button button-danger" onClick={close}>Discard adjustment</button></div></div>}
        {error && <div className="inventory-notice inventory-error" role="alert"><strong>{error.message}</strong>{!error.fields && <p>Your inputs remain available. Resolve the issue or close and reopen this drawer to review current data.</p>}</div>}
        {changed && !saved && <p className="inventory-notice" role="status">The catalog changed while this drawer was open. The quantities below are the opening snapshot; close and reopen before applying an adjustment.</p>}
        <fieldset disabled={pending || saved} className="inventory-fields">
          <div className="inventory-field"><label htmlFor={`${id}-product`}>Product</label><select id={`${id}-product`} name="productId" data-autofocus value={productId} onChange={event => setProductId(event.target.value)} {...errorProps('productId')}><option value="">Select a local product</option>{opened.products.map(item => <option key={item.id} value={item.id}>{item.brand} {item.model} · {item.id.slice(-8)}</option>)}</select>{message('productId')}</div>
          <div className="inventory-quantity-preview" aria-live="polite" aria-atomic="true"><div><span>Current prototype quantity{changed ? ' (at opening)' : ''}</span><strong>{product?.stockQuantity.toLocaleString('en-EG') ?? '—'}</strong></div><span className="inventory-preview-arrow" aria-hidden="true">→</span><div><span>New prototype quantity</span><strong>{preview?.ok ? preview.value.toLocaleString('en-EG') : '—'}</strong></div></div>
          <div className="inventory-form-grid"><div className="inventory-field"><label htmlFor={`${id}-direction`}>Adjustment type</label><select id={`${id}-direction`} name="direction" value={direction} onChange={event => setDirection(event.target.value as StockAdjustment['direction'])}><option value="increase">Increase</option><option value="decrease">Decrease</option></select></div>
          <div className="inventory-field"><label htmlFor={`${id}-amount`}>Adjustment amount</label><input id={`${id}-amount`} name="amount" type="text" inputMode="numeric" value={amount} onChange={event => setAmount(event.target.value)} required {...errorProps('amount')} />{message('amount')}</div></div>
          <div className="inventory-field"><label htmlFor={`${id}-reason`}>Reason</label><textarea id={`${id}-reason`} name="reason" rows={4} maxLength={500} value={reason} onChange={event => setReason(event.target.value)} required {...errorProps('reason')} />{message('reason')}<span className="inventory-help">Required for this preview workflow. Reasons are not saved: this model has no movement history.</span></div>
        </fieldset>
        <p className="inventory-scope-note">This updates the same quantity shown in Products. It does not reserve units, process an order, or record a stock transaction.</p>
      </div>
      <footer className="modal-footer"><span className="modal-footer-note">Simulation · Browser storage only</span><button type="button" className="button button-quiet" disabled={pending} onClick={() => { if (requestClose()) close() }}>Cancel</button><button type="submit" className="button button-primary" disabled={pending || saved || catalog.status !== 'ready'}>{pending ? 'Applying…' : 'Confirm simulated adjustment'}</button></footer>
    </form>}
  </ModalSurface>
}
