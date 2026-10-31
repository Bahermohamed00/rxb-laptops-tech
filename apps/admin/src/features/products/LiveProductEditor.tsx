import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { ProductRequestError, type ApiProduct, type ProductPayload, type ProductSpecs, type ProductType, type UpgradeCombination } from './products.api'
import { createProduct, updateProduct } from './products.api'
import { ProductImageUpload } from './ProductImageUpload'
import { accessorySpecs } from './accessory-specs'

type OptionDraft = { capacityGB: string; type: string; price: string; isBase: boolean; isAvailable: boolean }
type Draft = { slug: string; brand: string; model: string; condition: ''|'NEW'|'PRE_OWNED'; useCase: ''|'WORK'|'STUDY'|'GAMING'; status: 'DRAFT'|'ACTIVE'|'ARCHIVED'; price: string; cpu: string; gpu: string; ram: string; ramType: string; storage: string; storageType: string; stock: string; description: string; notes: string; screen: string; resolution: string; panel: string; refresh: string }
const defaultDraft: Draft = { slug: '', brand: '', model: '', condition: '', useCase: '', status: 'DRAFT', price: '', cpu: '', gpu: '', ram: '', ramType: '', storage: '', storageType: '', stock: '', description: '', notes: '', screen: '', resolution: '', panel: '', refresh: '' }
const money = (minor: number) => `${Math.floor(minor / 100)}.${String(minor % 100).padStart(2, '0')}`
function optionsFrom(product: ApiProduct | undefined, kind: 'ram'|'storage'): OptionDraft[] {
  const source = kind === 'ram' ? product?.ramOptions : product?.storageOptions
  return source?.map(option => ({ capacityGB: String(option.capacityGB), type: option.type, price: money(option.priceDeltaMinor), isBase: option.isBase, isAvailable: option.isAvailable })) ?? [{ capacityGB: '', type: '', price: '0.00', isBase: true, isAvailable: true }]
}
function draftFrom(product?: ApiProduct): Draft {
  if (!product) return defaultDraft
  return { slug: product.slug, brand: product.brand, model: product.model, condition: product.condition, useCase: product.useCase ?? '', status: product.status, price: money(product.priceMinor), cpu: product.cpu ?? '', gpu: product.gpu ?? '', ram: product.baseRamGB === null ? '' : String(product.baseRamGB), ramType: product.baseRamType ?? '', storage: product.baseStorageGB === null ? '' : String(product.baseStorageGB), storageType: product.baseStorageType ?? '', stock: String(product.stockQuantity), description: product.description, notes: product.conditionNotes ?? '', screen: product.displaySizeInches ? String(product.displaySizeInches) : '', resolution: product.displayResolution ?? '', panel: product.displayPanel ?? '', refresh: product.refreshRateHz ? String(product.refreshRateHz) : '' }
}
function minor(value: string) { if (!/^\d+(?:\.\d{1,2})?$/.test(value.trim())) return NaN; const [whole, fraction = ''] = value.trim().split('.'); return Number(whole) * 100 + Number(fraction.padEnd(2, '0')) }
const combinationKey = (ramCapacityGB: number, ramType: string, storageCapacityGB: number, storageType: string) => `${ramCapacityGB}:${ramType}/${storageCapacityGB}:${storageType}`

export function LiveProductEditor({ product, initialProductType = 'LAPTOP', csrfToken, onCancel, onSaved, cancelLabel = 'Cancel' }: { product?: ApiProduct; initialProductType?: ProductType; csrfToken: string; onCancel: () => void; onSaved: (product: ApiProduct) => void; cancelLabel?: string }) {
  const [draft, setDraft] = useState(() => draftFrom(product))
  const [productType, setProductType] = useState<ProductType>(() => product?.productType ?? initialProductType)
  const [specsDraft, setSpecsDraft] = useState<Record<string, string>>(() => Object.fromEntries(
    Object.entries(product?.specs ?? {}).map(([key, value]) => [key, String(value)]),
  ))
  const [ramOptions, setRamOptions] = useState(() => optionsFrom(product, 'ram'))
  const [storageOptions, setStorageOptions] = useState(() => optionsFrom(product, 'storage'))
  const [combinations, setCombinations] = useState<UpgradeCombination[]>(() => product?.combinations ?? [])
  const [images, setImages] = useState(product?.images ?? [])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const formRef = useRef<HTMLFormElement>(null)
  const initialSnapshot = useRef<string | null>(null)
  const skipNavigationGuard = useRef(false)
  const snapshot = JSON.stringify({ draft, productType, specsDraft, ramOptions, storageOptions, combinations, imageIds: images.map(image => image.id) })
  if (initialSnapshot.current === null) initialSnapshot.current = snapshot
  const isDirty = snapshot !== initialSnapshot.current
  useEffect(() => {
    if (!isDirty) return
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault()
      event.returnValue = ''
    }
    const guardRouteChange = (event: Event) => {
      if (skipNavigationGuard.current) {
        skipNavigationGuard.current = false
        return
      }
      if (!window.confirm('Discard unsaved product changes?')) event.preventDefault()
    }
    window.addEventListener('beforeunload', warnBeforeUnload)
    window.addEventListener('rxb:before-admin-route-change', guardRouteChange)
    return () => {
      window.removeEventListener('beforeunload', warnBeforeUnload)
      window.removeEventListener('rxb:before-admin-route-change', guardRouteChange)
    }
  }, [isDirty])
  function cancel() {
    if (isDirty && !window.confirm('Discard unsaved product changes?')) return
    if (isDirty) skipNavigationGuard.current = true
    onCancel()
  }
  const change = (key: keyof Draft, value: string) => {
    setDraft(current => ({ ...current, [key]: value }))
    setFieldErrors(current => {
      const { [key]: _removed, ...remaining } = current
      return remaining
    })
  }
  const changeSpec = (key: string, value: string) => {
    setSpecsDraft(current => ({ ...current, [key]: value }))
    setFieldErrors(current => {
      const { [`specs.${key}`]: _removed, ...remaining } = current
      return remaining
    })
  }
  const fieldError = (key: string) => {
    const alias: Record<string, string> = { price: 'priceMinor', stock: 'stockQuantity' }
    const message = fieldErrors[key] ?? fieldErrors[alias[key] ?? ''] ?? (key === 'ramOptions' ? Object.entries(fieldErrors).find(([field]) => field.startsWith('ramOptions.'))?.[1] : undefined)
      ?? (key === 'storageOptions' ? Object.entries(fieldErrors).find(([field]) => field.startsWith('storageOptions.'))?.[1] : undefined)
      ?? (key === 'combinations' ? Object.entries(fieldErrors).find(([field]) => field.startsWith('combinations.'))?.[1] : undefined)
    return message ? <span className="live-field-error" id={`field-error-${key}`} role="alert">{message}</span> : null
  }
  function showFieldErrors(next: Record<string, string>, message = 'Correct the highlighted fields and try again.') {
    setFieldErrors(next)
    setError(message)
    if (productType === 'LAPTOP' && Object.keys(next).some(field => ['cpu', 'gpu', 'baseRamGB', 'baseRamType', 'baseStorageGB', 'baseStorageType', 'ramOptions', 'storageOptions', 'combinations'].some(prefix => field === prefix || field.startsWith(`${prefix}.`)))) setAdvancedOpen(true)
    const first = Object.keys(next)[0]
    window.requestAnimationFrame(() => {
      const field = first === 'priceMinor' ? 'price' : first === 'stockQuantity' ? 'stock' : first
      const target = field ? formRef.current?.querySelector<HTMLElement>(`[name="${field}"], [data-error-target="${field}"]`) : null
      target?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      target?.focus()
    })
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (saving) return
    setError('')
    setFieldErrors({})
    const laptop = productType === 'LAPTOP'
    const priceMinor = minor(draft.price)
    const ram = Number(draft.ram), storage = Number(draft.storage), stock = Number(draft.stock)
    const slug = (draft.slug.trim() || `${draft.brand}-${draft.model}`).toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const errors: Record<string, string> = {}
    if (!draft.brand.trim()) errors.brand = 'Brand is required.'
    if (!draft.model.trim()) errors.model = 'Product name is required.'
    if (!draft.condition) errors.condition = 'Choose whether this product is new or pre-owned.'
    if (!Number.isSafeInteger(priceMinor) || priceMinor < 1 || priceMinor > 1_000_000_000) errors.price = 'Enter a valid price greater than zero, with up to two decimal places.'
    if (!Number.isSafeInteger(stock) || stock < 0 || stock > 1_000_000) errors.stock = 'Enter a non-negative whole-number quantity up to 1,000,000.'
    if (!slug) errors.slug = 'Enter a product name and brand that produce a valid URL slug.'
    if (laptop) {
      if (!draft.cpu.trim()) errors.cpu = 'Enter the installed processor.'
      if (!draft.gpu.trim()) errors.gpu = 'Enter installed graphics, or specify integrated graphics.'
      if (!Number.isSafeInteger(ram) || ram < 1 || ram > 4096) errors.baseRamGB = 'Enter a whole-number RAM capacity from 1 to 4,096 GB.'
      if (!draft.ramType) errors.baseRamType = 'Select the installed base RAM type.'
      if (!Number.isSafeInteger(storage) || storage < 1 || storage > 131072) errors.baseStorageGB = 'Enter a whole-number storage capacity from 1 to 131,072 GB.'
      if (!draft.storageType) errors.baseStorageType = 'Select the installed base storage type.'
      if (draft.screen && (!Number.isSafeInteger(Number(draft.screen)) || Number(draft.screen) < 1 || Number(draft.screen) > 100)) errors.displaySizeInches = 'Enter a whole-number screen size from 1 to 100 inches.'
    }
    const accessorySpecValues: ProductSpecs = {}
    if (!laptop) {
      for (const field of accessorySpecs[productType]) {
        const value = (specsDraft[field.key] ?? '').trim()
        const errorKey = `specs.${field.key}`
        if (!value) {
          if (field.required) errors[errorKey] = `${field.label} is required.`
          continue
        }
        if (field.kind === 'select' && !field.options?.includes(value)) {
          errors[errorKey] = `Choose a valid ${field.label.toLowerCase()}.`
          continue
        }
        if (field.kind === 'number') {
          const number = Number(value)
          if (!Number.isSafeInteger(number) || number < (field.min ?? Number.MIN_SAFE_INTEGER) || number > (field.max ?? Number.MAX_SAFE_INTEGER)) {
            errors[errorKey] = `Enter a whole number between ${field.min} and ${field.max}.`
            continue
          }
          accessorySpecValues[field.key] = number
          continue
        }
        if (field.max && value.length > field.max) {
          errors[errorKey] = `${field.label} must be ${field.max} characters or fewer.`
          continue
        }
        accessorySpecValues[field.key] = value
      }
    }
    if (Object.keys(errors).length) {
      showFieldErrors(errors)
      return
    }
    const parsedOptions = (items: OptionDraft[], name: string) => {
      if (!items.length || items.filter(item => item.isBase).length !== 1) {
        errors[`${name}Options`] = `Mark exactly one ${name} option as the base configuration.`
        return []
      }
      return items.flatMap((item, index) => {
        const capacityGB = Number(item.capacityGB), priceDeltaMinor = minor(item.price)
        const maximum = name === 'ram' ? 4096 : 131072
        const path = `${name}Options.${index}`
        if (!item.type) errors[`${path}.type`] = `Choose a compatible ${name} type.`
        if (!Number.isSafeInteger(capacityGB) || capacityGB < 1 || capacityGB > maximum) errors[`${path}.capacityGB`] = `Enter a whole-number ${name} capacity between 1 and ${maximum} GB.`
        if (!Number.isSafeInteger(priceDeltaMinor)) errors[`${path}.priceDeltaMinor`] = 'Enter a valid price difference with up to two decimal places.'
        if (!item.type || !Number.isSafeInteger(capacityGB) || capacityGB < 1 || capacityGB > maximum || !Number.isSafeInteger(priceDeltaMinor)) return []
        return [{ capacityGB, type: item.type, priceDeltaMinor, isBase: item.isBase, isAvailable: item.isAvailable }]
      })
    }
    try {
      const payload: ProductPayload = {
        slug, productType, brand: draft.brand.trim(), model: draft.model.trim(), description: draft.description, condition: draft.condition === 'NEW' ? 'NEW' : 'PRE_OWNED',
        conditionNotes: draft.notes || undefined, useCase: laptop ? draft.useCase || null : null, status: draft.status, priceMinor,
        ...(laptop ? {
          cpu: draft.cpu.trim(), gpu: draft.gpu.trim(), baseRamGB: ram, baseRamType: draft.ramType,
          baseStorageGB: storage, baseStorageType: draft.storageType,
          displaySizeInches: draft.screen ? Number(draft.screen) : undefined, displayResolution: draft.resolution || undefined,
          displayPanel: draft.panel || undefined, refreshRateHz: draft.refresh ? Number(draft.refresh) : undefined,
        } : {}),
        stockQuantity: stock,
        specs: laptop ? {} : accessorySpecValues,
        imageIds: images.map(image => image.id), ramOptions: [], storageOptions: [], combinations: [],
      }
      if (laptop) {
        payload.ramOptions = parsedOptions(ramOptions, 'ram')
        payload.storageOptions = parsedOptions(storageOptions, 'storage')
        if (Object.keys(errors).length) {
          showFieldErrors(errors)
          return
        }
        const baseRam = payload.ramOptions.find(option => option.isBase)
        const baseStorage = payload.storageOptions.find(option => option.isBase)
        if (!baseRam || baseRam.capacityGB !== ram || baseRam.type !== draft.ramType || baseRam.priceDeltaMinor !== 0 || !baseRam.isAvailable) errors.ramOptions = 'Choose a compatible, available RAM base option matching the installed capacity and type with no extra charge.'
        if (!baseStorage || baseStorage.capacityGB !== storage || baseStorage.type !== draft.storageType || baseStorage.priceDeltaMinor !== 0 || !baseStorage.isAvailable) errors.storageOptions = 'Choose a compatible, available storage base option matching the installed capacity and type with no extra charge.'
        if (Object.keys(errors).length) {
          showFieldErrors(errors)
          return
        }
        const basePair: UpgradeCombination = { ramCapacityGB: ram, ramType: draft.ramType, storageCapacityGB: storage, storageType: draft.storageType, isAvailable: true }
        const configuredPairs = [basePair, ...combinations.filter(pair => combinationKey(pair.ramCapacityGB, pair.ramType, pair.storageCapacityGB, pair.storageType) !== combinationKey(ram, draft.ramType, storage, draft.storageType))]
        payload.combinations = configuredPairs.filter(pair => payload.ramOptions.some(option => option.capacityGB === pair.ramCapacityGB && option.type === pair.ramType) && payload.storageOptions.some(option => option.capacityGB === pair.storageCapacityGB && option.type === pair.storageType)).map(pair => ({
          ...pair,
          isAvailable: pair.isAvailable && payload.ramOptions.some(option => option.capacityGB === pair.ramCapacityGB && option.type === pair.ramType && option.isAvailable) && payload.storageOptions.some(option => option.capacityGB === pair.storageCapacityGB && option.type === pair.storageType && option.isAvailable),
        }))
      }
      setSaving(true)
      const saved = product ? await updateProduct(product.id, payload, csrfToken) : await createProduct(payload, csrfToken)
      onSaved(saved)
    } catch (cause) {
      if (cause instanceof ProductRequestError && Object.keys(cause.fieldErrors).length) showFieldErrors(cause.fieldErrors, cause.message)
      else setError(cause instanceof Error ? cause.message : 'The product could not be saved.')
    }
    finally { setSaving(false) }
  }

  function optionList(kind: 'ram'|'storage', items: OptionDraft[], setItems: (next: OptionDraft[]) => void, types: string[]) {
    return <fieldset className="live-options" name={`${kind}Options`} tabIndex={-1}><legend>{kind === 'ram' ? 'Supported RAM options' : 'Supported storage options'}</legend><p>Compatibility is specific to this product. Price difference is added to the base configuration.</p>{fieldError(`${kind}Options`)}
      {items.map((option, index) => <div className="live-option-row" key={`${kind}-${index}`}>
        <label>Capacity (GB)<input name={`${kind}Options.${index}.capacityGB`} aria-invalid={Boolean(fieldErrors[`${kind}Options.${index}.capacityGB`])} type="number" min="1" value={option.capacityGB} onChange={event => { setItems(items.map((item, i) => i === index ? { ...item, capacityGB: event.target.value } : item)); setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => field !== `${kind}Options` && !field.startsWith(`${kind}Options.${index}.`)))) }} />{fieldError(`${kind}Options.${index}.capacityGB`)}</label>
        <label>Type<select name={`${kind}Options.${index}.type`} aria-invalid={Boolean(fieldErrors[`${kind}Options.${index}.type`])} value={option.type} onChange={event => { setItems(items.map((item, i) => i === index ? { ...item, type: event.target.value } : item)); setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => field !== `${kind}Options` && !field.startsWith(`${kind}Options.${index}.`)))) }}><option value="">Select type</option>{types.map(type => <option key={type}>{type}</option>)}</select>{fieldError(`${kind}Options.${index}.type`)}</label>
        <label>Price difference (EGP)<input name={`${kind}Options.${index}.priceDeltaMinor`} aria-invalid={Boolean(fieldErrors[`${kind}Options.${index}.priceDeltaMinor`])} inputMode="decimal" value={option.price} onChange={event => { setItems(items.map((item, i) => i === index ? { ...item, price: event.target.value } : item)); setFieldErrors(current => Object.fromEntries(Object.entries(current).filter(([field]) => field !== `${kind}Options` && !field.startsWith(`${kind}Options.${index}.`)))) }} />{fieldError(`${kind}Options.${index}.priceDeltaMinor`)}</label>
        <label className="live-option-check"><input type="radio" name={`${kind}-base`} checked={option.isBase} onChange={() => setItems(items.map((item, i) => ({ ...item, isBase: i === index })))} /> Base</label>
        <label className="live-option-check"><input type="checkbox" checked={option.isAvailable} onChange={event => setItems(items.map((item, i) => i === index ? { ...item, isAvailable: event.target.checked } : item))} /> Available</label>
        <button className="live-remove-option" type="button" aria-label={`Remove ${kind} option ${index + 1}`} disabled={items.length <= 1} onClick={() => setItems(items.filter((_, i) => i !== index))}>Remove</button>
      </div>)}
      <button className="button button-quiet" type="button" onClick={() => setItems([...items, { capacityGB: '', type: '', price: '0.00', isBase: false, isAvailable: true }])}>Add {kind} option</button>
    </fieldset>
  }

  const toggleCombination = (ram: OptionDraft, storage: OptionDraft, isAvailable: boolean) => {
    const pair = { ramCapacityGB: Number(ram.capacityGB), ramType: ram.type, storageCapacityGB: Number(storage.capacityGB), storageType: storage.type, isAvailable }
    const key = combinationKey(pair.ramCapacityGB, pair.ramType, pair.storageCapacityGB, pair.storageType)
    setCombinations(current => current.some(item => combinationKey(item.ramCapacityGB, item.ramType, item.storageCapacityGB, item.storageType) === key)
      ? current.map(item => combinationKey(item.ramCapacityGB, item.ramType, item.storageCapacityGB, item.storageType) === key ? pair : item)
      : [...current, pair])
  }

  const productTypeLabel = productType === 'OTHER_ACCESSORY' ? 'Other accessory' : productType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  const isLaptop = productType === 'LAPTOP'
  return <section className="live-product-editor" aria-labelledby="live-editor-title"><div className="live-editor-head"><div><span>PRODUCT CATALOG · {productTypeLabel.toUpperCase()}</span><h2 id="live-editor-title">{product ? `Edit ${product.brand} ${product.model}` : 'Add a product'}</h2><p>{isLaptop ? 'Add accurate laptop specifications and compatible upgrade options.' : 'Add an accessory listing with its confirmed price, quantity, and product details.'}</p></div><button type="button" className="button button-quiet" onClick={cancel}>{cancelLabel}</button></div>
    <form ref={formRef} onSubmit={submit} noValidate>
      <fieldset><legend>Basic information</legend><div className="live-form-grid">
        <label>Brand<input name="brand" aria-invalid={Boolean(fieldErrors.brand)} aria-describedby={fieldErrors.brand ? 'field-error-brand' : undefined} required maxLength={80} autoComplete="organization" value={draft.brand} onChange={event => change('brand', event.target.value)} placeholder="e.g. Dell" />{fieldError('brand')}</label>
        <label>Product name / model<input name="model" aria-invalid={Boolean(fieldErrors.model)} aria-describedby={fieldErrors.model ? 'field-error-model' : undefined} required maxLength={160} value={draft.model} onChange={event => change('model', event.target.value)} placeholder={isLaptop ? 'e.g. Latitude 5440' : 'e.g. Wireless mechanical keyboard'} />{fieldError('model')}</label>
        <label>Product type<select name="productType" value={productType} onChange={event => { setProductType(event.target.value as ProductType); setSpecsDraft({}); setFieldErrors({}) }}>{[['LAPTOP', 'Laptop'], ['KEYBOARD', 'Keyboard'], ['MOUSE', 'Mouse'], ['MOUSE_PAD', 'Mouse Pad'], ['OTHER_ACCESSORY', 'Other accessory']].map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label>Condition<select name="condition" aria-invalid={Boolean(fieldErrors.condition)} aria-describedby={fieldErrors.condition ? 'field-error-condition' : undefined} required value={draft.condition} onChange={event => change('condition', event.target.value as Draft['condition'])}><option value="">Choose condition</option><option value="NEW">New</option><option value="PRE_OWNED">Pre-owned</option></select>{fieldError('condition')}</label>
        {isLaptop && <label>Laptop use case<select value={draft.useCase} onChange={event => change('useCase', event.target.value as Draft['useCase'])}><option value="">Uncategorized</option><option value="WORK">Work</option><option value="STUDY">Study</option><option value="GAMING">Gaming</option></select></label>}
        <label>Price (EGP)<input name="price" aria-invalid={Boolean(fieldErrors.price || fieldErrors.priceMinor)} aria-describedby={fieldErrors.price || fieldErrors.priceMinor ? 'field-error-price' : undefined} required inputMode="decimal" value={draft.price} onChange={event => change('price', event.target.value)} placeholder="Enter the confirmed price" />{fieldError('price')}</label>
        <label>Available quantity<input name="stock" aria-invalid={Boolean(fieldErrors.stock || fieldErrors.stockQuantity)} aria-describedby={fieldErrors.stock || fieldErrors.stockQuantity ? 'field-error-stock' : undefined} required type="number" min="0" value={draft.stock} onChange={event => change('stock', event.target.value)} placeholder="Enter the counted quantity" />{fieldError('stock')}</label>
        <label>Listing status<select value={draft.status} onChange={event => change('status', event.target.value as Draft['status'])}><option value="DRAFT">Draft (not public)</option><option value="ACTIVE">Published</option><option value="ARCHIVED">Archived</option></select></label>
        <label>Condition notes<input maxLength={1000} value={draft.notes} onChange={event => change('notes', event.target.value)} /></label>
        <label className="live-field-wide">Short description<textarea name="description" aria-invalid={Boolean(fieldErrors.description)} aria-describedby={fieldErrors.description ? 'field-error-description' : undefined} rows={3} maxLength={10000} value={draft.description} onChange={event => change('description', event.target.value)} placeholder={isLaptop ? 'A short, accurate summary of this laptop.' : 'Describe the accessory and its supported features.'} />{fieldError('description')}</label>
        <div className="live-field-wide" data-error-target="imageIds" tabIndex={-1}><span className="live-form-label">Product images · the first image is the main one</span><ProductImageUpload key={product?.id ?? 'new'} csrfToken={csrfToken} initial={images} onChange={setImages} />{fieldError('imageIds')}</div>
      </div></fieldset>
      {!isLaptop && <fieldset className="live-accessory-specs"><legend>{productTypeLabel} specifications</legend><p>Enter the specifications that apply to this product type.</p><div className="live-form-grid">
        {accessorySpecs[productType].map(field => <label key={field.key}>{field.label}
          {field.kind === 'select'
            ? <select name={`specs.${field.key}`} value={specsDraft[field.key] ?? ''} aria-invalid={Boolean(fieldErrors[`specs.${field.key}`])} onChange={event => changeSpec(field.key, event.target.value)}>
              <option value="">Choose {field.label.toLowerCase()}</option>{field.options?.map(option => <option key={option} value={option}>{option}</option>)}
            </select>
            : <input name={`specs.${field.key}`} type={field.kind} min={field.min} max={field.max} maxLength={field.kind === 'text' ? field.max : undefined} value={specsDraft[field.key] ?? ''} aria-invalid={Boolean(fieldErrors[`specs.${field.key}`])} placeholder={field.placeholder} onChange={event => changeSpec(field.key, event.target.value)} />}
          {fieldError(`specs.${field.key}`)}
        </label>)}
      </div></fieldset>}
      {isLaptop && <details className="live-advanced-details" open={advancedOpen} onToggle={event => setAdvancedOpen(event.currentTarget.open)}>
        <summary>Advanced laptop specifications <span>Some details are required by the current API.</span></summary>
        <fieldset><legend>Specifications</legend><div className="live-form-grid">
          <label>URL slug<input name="slug" aria-invalid={Boolean(fieldErrors.slug)} aria-describedby={fieldErrors.slug ? 'field-error-slug' : undefined} maxLength={180} value={draft.slug} placeholder="Generated from brand and model" onChange={event => change('slug', event.target.value)} />{fieldError('slug')}</label>
          <label>Fixed CPU<input name="cpu" aria-invalid={Boolean(fieldErrors.cpu)} aria-describedby={fieldErrors.cpu ? 'field-error-cpu' : undefined} maxLength={200} value={draft.cpu} onChange={event => change('cpu', event.target.value)} placeholder="Enter the installed processor" />{fieldError('cpu')}</label>
          <label>Fixed GPU<input name="gpu" aria-invalid={Boolean(fieldErrors.gpu)} aria-describedby={fieldErrors.gpu ? 'field-error-gpu' : undefined} maxLength={200} value={draft.gpu} onChange={event => change('gpu', event.target.value)} placeholder="Enter installed graphics, or specify integrated graphics" />{fieldError('gpu')}</label>
          <label>Base RAM capacity (GB)<input name="baseRamGB" aria-invalid={Boolean(fieldErrors.baseRamGB)} aria-describedby={fieldErrors.baseRamGB ? 'field-error-baseRamGB' : undefined} type="number" min="1" max="4096" value={draft.ram} onChange={event => change('ram', event.target.value)} />{fieldError('baseRamGB')}</label>
          <label>Base RAM type<select name="baseRamType" aria-invalid={Boolean(fieldErrors.baseRamType)} aria-describedby={fieldErrors.baseRamType ? 'field-error-baseRamType' : undefined} value={draft.ramType} onChange={event => change('ramType', event.target.value)}><option value="">Select RAM type</option>{['DDR4','DDR5','LPDDR4X','LPDDR5','LPDDR5X','OTHER'].map(type => <option key={type}>{type}</option>)}</select>{fieldError('baseRamType')}</label>
          <label>Base storage capacity (GB)<input name="baseStorageGB" aria-invalid={Boolean(fieldErrors.baseStorageGB)} aria-describedby={fieldErrors.baseStorageGB ? 'field-error-baseStorageGB' : undefined} type="number" min="1" max="131072" value={draft.storage} onChange={event => change('storage', event.target.value)} />{fieldError('baseStorageGB')}</label>
          <label>Base storage type<select name="baseStorageType" aria-invalid={Boolean(fieldErrors.baseStorageType)} aria-describedby={fieldErrors.baseStorageType ? 'field-error-baseStorageType' : undefined} value={draft.storageType} onChange={event => change('storageType', event.target.value)}><option value="">Select storage type</option>{['SSD','HDD','NVME','SATA','OTHER'].map(type => <option key={type}>{type}</option>)}</select>{fieldError('baseStorageType')}</label>
          <label>Screen size (inches)<input name="displaySizeInches" aria-invalid={Boolean(fieldErrors.displaySizeInches)} aria-describedby={fieldErrors.displaySizeInches ? 'field-error-displaySizeInches' : undefined} type="number" min="1" max="100" step="1" value={draft.screen} onChange={event => change('screen', event.target.value)} />{fieldError('displaySizeInches')}</label>
          <label>Resolution<input value={draft.resolution} onChange={event => change('resolution', event.target.value)} /></label>
          <label>Panel type<input value={draft.panel} onChange={event => change('panel', event.target.value)} /></label>
          <label>Refresh rate (Hz)<input type="number" min="1" value={draft.refresh} onChange={event => change('refresh', event.target.value)} /></label>
        </div></fieldset>
        {optionList('ram', ramOptions, setRamOptions, ['DDR4','DDR5','LPDDR4X','LPDDR5','LPDDR5X','OTHER'])}
        {optionList('storage', storageOptions, setStorageOptions, ['SSD','HDD','NVME','SATA','OTHER'])}
        <fieldset className="live-options live-combinations" name="combinations" tabIndex={-1}><legend>Compatible RAM + storage combinations</legend><p>The checked pairs will be offered to customers. Verify against this laptop's supported configurations. The base configuration is always included.</p>{fieldError('combinations')}<div className="live-combination-scroll"><div className="live-combination-grid" style={{ gridTemplateColumns: `repeat(${storageOptions.length + 1}, minmax(110px, 1fr))` }}><strong>RAM / storage</strong>{storageOptions.map((option, index) => <strong key={`storage-head-${index}`}>{option.capacityGB || '—'} GB {option.type}</strong>)}{ramOptions.map((ram, ramIndex) => <div className="live-combination-row" key={`ram-row-${ramIndex}`}><strong>{ram.capacityGB || '—'} GB {ram.type}</strong>{storageOptions.map((storage, storageIndex) => {
        const key = combinationKey(Number(ram.capacityGB), ram.type, Number(storage.capacityGB), storage.type)
        const combination = combinations.find(item => combinationKey(item.ramCapacityGB, item.ramType, item.storageCapacityGB, item.storageType) === key)
        const allowed = ram.isAvailable && storage.isAvailable
        const isBasePair = ram.isBase && storage.isBase
        return <label key={`pair-${ramIndex}-${storageIndex}`} title={isBasePair ? 'The base configuration is always available' : allowed ? 'Allow this RAM and storage pair' : 'Enable both options before allowing this pair'}><input type="checkbox" checked={isBasePair || Boolean(combination?.isAvailable)} disabled={isBasePair || !allowed} onChange={event => toggleCombination(ram, storage, event.target.checked)} /> Available</label>
      })}</div>)}</div></div></fieldset>
      </details>}
      {error && <p className="live-product-error" role="alert">{error}</p>}
      <div className="live-editor-actions"><button type="button" className="button button-quiet" onClick={cancel} disabled={saving}>{cancelLabel}</button><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : product ? 'Save changes' : 'Create product'}</button></div>
    </form>
  </section>
}
