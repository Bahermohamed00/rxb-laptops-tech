import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { archiveAccessoryCategory, listAccessoryCategories, listProducts, ProductRequestError, saveAccessoryCategory, type AccessoryCategory, type ApiProduct } from './products.api'
import './live-products.css'

type Draft = { name: string; slug: string; description: string; imageUrl: string; isActive: boolean }
const emptyDraft: Draft = { name: '', slug: '', description: '', imageUrl: '', isActive: true }
const draftFrom = (category: AccessoryCategory): Draft => ({ name: category.name, slug: category.slug, description: category.description, imageUrl: category.imageUrl ?? '', isActive: category.isActive })

export function CategoriesPage({ csrfToken }: { csrfToken: string }) {
  const [categories, setCategories] = useState<AccessoryCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<AccessoryCategory | null>(null)
  const [creating, setCreating] = useState(false)
  const [draft, setDraft] = useState<Draft>(emptyDraft)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [viewingCategoryId, setViewingCategoryId] = useState('')
  const [associatedProducts, setAssociatedProducts] = useState<ApiProduct[]>([])
  const [associatedProductTotal, setAssociatedProductTotal] = useState(0)
  const [loadingAssociated, setLoadingAssociated] = useState(false)

  const refresh = useCallback(async () => {
    setLoading(true)
    try { setCategories(await listAccessoryCategories()); setError('') }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Categories could not be loaded.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => { void refresh() }, [refresh])

  function startCreate() { setEditing(null); setCreating(true); setDraft(emptyDraft); setFieldErrors({}); setError(''); setNotice('') }
  function startEdit(category: AccessoryCategory) { setEditing(category); setCreating(true); setDraft(draftFrom(category)); setFieldErrors({}); setError(''); setNotice('') }
  function cancelEdit() { setEditing(null); setCreating(false); setFieldErrors({}) }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const errors: Record<string, string> = {}
    if (!draft.name.trim()) errors.name = 'Enter a category name.'
    if (draft.name.trim().length > 100) errors.name = 'Category names are limited to 100 characters.'
    if (draft.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(draft.slug.trim().toLowerCase())) errors.slug = 'Use lowercase letters, numbers, and single hyphens.'
    if (draft.imageUrl && !/^https?:\/\//i.test(draft.imageUrl.trim())) errors.imageUrl = 'Enter a full HTTP or HTTPS image URL.'
    if (Object.keys(errors).length) { setFieldErrors(errors); return }
    setSaving(true); setError(''); setFieldErrors({})
    try {
      const saved = await saveAccessoryCategory({ id: editing?.id, name: draft.name.trim(), slug: draft.slug.trim() || undefined, description: draft.description.trim(), imageUrl: draft.imageUrl.trim() || null, isActive: draft.isActive }, csrfToken)
      setNotice(`${saved.name} ${editing ? 'was updated' : 'was created'}.`)
      cancelEdit(); await refresh()
    } catch (cause) {
      if (cause instanceof ProductRequestError) setFieldErrors(cause.fieldErrors)
      setError(cause instanceof Error ? cause.message : 'Category could not be saved.')
    } finally { setSaving(false) }
  }

  async function archive(category: AccessoryCategory) {
    if (!window.confirm(`Archive “${category.name}”? Products remain assigned to it and their history is preserved. New products cannot use an archived category.`)) return
    setError(''); setNotice('')
    try { await archiveAccessoryCategory(category.id, csrfToken); setNotice(`${category.name} was archived.`); if (editing?.id === category.id) cancelEdit(); await refresh() }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Category could not be archived.') }
  }

  async function viewProducts(category: AccessoryCategory) {
    setViewingCategoryId(category.id); setLoadingAssociated(true); setError('')
    try {
      const result = await listProducts({ family: 'ACCESSORY', accessoryCategoryId: category.id, page: 1, pageSize: 100 })
      setAssociatedProducts(result.items); setAssociatedProductTotal(result.total)
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Products for this category could not be loaded.') }
    finally { setLoadingAssociated(false) }
  }

  return <section className="live-products category-management" aria-labelledby="category-management-title">
    <header className="live-products-heading"><div><span>DATABASE CATALOG · ACCESSORY ORGANIZATION</span><h2 id="category-management-title">Categories</h2><p>Manage reusable accessory categories. Existing products remain assigned when a category is archived.</p></div><button type="button" className="button button-primary" onClick={startCreate}>Add category <span aria-hidden="true">+</span></button></header>
    {notice && <p className="live-products-success" role="status">{notice}</p>}
    {error && <div className="live-products-message" role="alert"><span>{error}</span><button type="button" className="button button-quiet" onClick={() => void refresh()}>Retry</button></div>}
    {creating && <form className="category-editor" onSubmit={event => void save(event)} noValidate>
      <div className="category-editor-heading"><h3>{editing ? `Edit ${editing.name}` : 'Create accessory category'}</h3><button type="button" className="button button-quiet" disabled={saving} onClick={cancelEdit}>Cancel</button></div>
      <div className="live-form-grid">
        <label>Name<input required maxLength={100} value={draft.name} aria-invalid={Boolean(fieldErrors.name)} onChange={event => setDraft(value => ({ ...value, name: event.target.value }))} />{fieldErrors.name && <span className="live-field-error">{fieldErrors.name}</span>}</label>
        <label>URL slug<input maxLength={120} value={draft.slug} aria-invalid={Boolean(fieldErrors.slug)} placeholder="Generated from the category name" onChange={event => setDraft(value => ({ ...value, slug: event.target.value }))} />{fieldErrors.slug && <span className="live-field-error">{fieldErrors.slug}</span>}</label>
        <label>Image URL<input type="url" maxLength={2048} value={draft.imageUrl} aria-invalid={Boolean(fieldErrors.imageUrl)} placeholder="https://…" onChange={event => setDraft(value => ({ ...value, imageUrl: event.target.value }))} />{fieldErrors.imageUrl && <span className="live-field-error">{fieldErrors.imageUrl}</span>}<small>Use an existing hosted image URL; this field does not upload files.</small></label>
        <label className="category-active-toggle"><input type="checkbox" checked={draft.isActive} onChange={event => setDraft(value => ({ ...value, isActive: event.target.checked }))} /> Active and available for new products</label>
        <label className="live-field-wide">Description<textarea rows={3} maxLength={2000} value={draft.description} onChange={event => setDraft(value => ({ ...value, description: event.target.value }))} /></label>
      </div>
      <div className="live-editor-actions"><button type="submit" className="button button-primary" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save category' : 'Create category'}</button></div>
    </form>}
    {loading ? <div className="live-products-empty" role="status">Loading categories…</div> : !error && categories.length === 0 ? <div className="live-products-empty"><strong>No accessory categories yet</strong><span>Create a category before adding accessory products.</span></div> : !error && <div className="live-products-table-wrap"><table className="live-products-table"><thead><tr><th scope="col">Category</th><th scope="col">Slug</th><th scope="col">Products</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead><tbody>{categories.map(category => <tr key={category.id}><td><strong>{category.name}</strong><span>{category.description || 'No description'}</span></td><td>{category.slug}</td><td><button type="button" className="category-view-products" onClick={() => void viewProducts(category)}>{category.productCount ?? 0} products</button></td><td><span className={`live-status status-${category.isActive ? 'active' : 'archived'}`}>{category.isActive ? 'ACTIVE' : 'ARCHIVED'}</span></td><td><div className="live-product-row-actions"><button type="button" onClick={() => startEdit(category)}>Edit</button>{category.isActive && <button type="button" onClick={() => void archive(category)}>Archive</button>}</div></td></tr>)}</tbody></table>
      {viewingCategoryId && <section className="category-products-preview" aria-live="polite"><h3>{categories.find(category => category.id === viewingCategoryId)?.name} products</h3>{loadingAssociated ? <p>Loading associated products…</p> : associatedProducts.length ? <><ul>{associatedProducts.map(product => <li key={product.id}><a href={`#/products/${encodeURIComponent(product.id)}/edit`}>{product.brand} {product.model}</a><span>{product.sku || 'No SKU'} · {product.status}</span></li>)}</ul>{associatedProductTotal > associatedProducts.length && <p>Showing {associatedProducts.length} of {associatedProductTotal} products. Use Accessories to browse and paginate the full list.</p>}</> : <p>No products are currently assigned to this category.</p>}</section>}
    </div>}
  </section>
}
