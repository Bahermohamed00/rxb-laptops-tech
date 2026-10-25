import type { Availability, Product } from './product.types'
import { deriveAvailability } from './product.validation'

export type ProductSort = 'updated' | 'name' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc'
export type ProductQuery = { search: string; brand: string; availability: Availability | ''; sort: ProductSort }
export const initialQuery: ProductQuery = { search: '', brand: '', availability: '', sort: 'updated' }
export const availabilityLabels: Record<Availability, string> = { draft: 'Draft', available: 'Available', 'out-of-stock': 'Out of stock' }
const collator = new Intl.Collator('en', { sensitivity: 'base', numeric: true })
export function selectProducts(products: readonly Product[], query: ProductQuery): Product[] {
  const term = query.search.trim().toLocaleLowerCase('en')
  return products.filter(product =>
    (!term || [product.brand, product.model, product.cpu, product.gpu ?? ''].some(value => value.toLocaleLowerCase('en').includes(term))) &&
    (!query.brand || product.brand === query.brand) &&
    (!query.availability || deriveAvailability(product) === query.availability)
  ).sort((a, b) => {
    let comparison = 0
    switch (query.sort) {
      case 'updated': comparison = b.updatedAt.localeCompare(a.updatedAt); break
      case 'name': comparison = collator.compare(`${a.brand} ${a.model}`, `${b.brand} ${b.model}`); break
      case 'price-asc': comparison = a.priceMinor - b.priceMinor; break
      case 'price-desc': comparison = b.priceMinor - a.priceMinor; break
      case 'stock-asc': comparison = a.stockQuantity - b.stockQuantity; break
      case 'stock-desc': comparison = b.stockQuantity - a.stockQuantity; break
    }
    return comparison || a.id.localeCompare(b.id)
  })
}
export function productBrands(products: readonly Product[]): string[] {
  return [...new Set(products.map(product => product.brand))].sort(collator.compare)
}
const priceFormat = new Intl.NumberFormat('en-EG', { style: 'currency', currency: 'EGP', currencyDisplay: 'code', minimumFractionDigits: 2 })
const dateFormat = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Cairo', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })
export const formatPrice = (piastres: number) => priceFormat.format(piastres / 100)
export const formatUpdated = (date: string) => dateFormat.format(new Date(date))
