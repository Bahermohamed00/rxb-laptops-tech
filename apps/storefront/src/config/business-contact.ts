import type { StoreProduct } from '../features/products/products.api'

export const WHATSAPP_BUSINESS_NUMBER = '201143164440'

export function whatsappUrl(message: string) {
  return `https://wa.me/${WHATSAPP_BUSINESS_NUMBER}?${new URLSearchParams({ text: message })}`
}

export function productInquiryMessage(
  product: Pick<StoreProduct, 'brand' | 'model' | 'slug' | 'productType'>,
  productUrl: string,
  configuration: { ram: string; storage: string } | null,
  currency: string,
  priceMinor: number,
) {
  const productType = product.productType === 'OTHER_ACCESSORY'
    ? 'Other accessory'
    : product.productType.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, letter => letter.toUpperCase())
  const configurationLine = configuration
    ? `Selected configuration: ${configuration.ram} RAM; ${configuration.storage} storage.`
    : product.productType === 'LAPTOP' ? 'Configuration: listed laptop configuration.' : 'Configuration: listed product configuration.'
  const price = (priceMinor / 100).toLocaleString('en-EG', { style: 'currency', currency })
  return [
    product.productType === 'LAPTOP'
      ? 'Hello RXB, I am interested in this laptop listing.'
      : 'Hello RXB, I am interested in this product listing.',
    `Product: ${product.brand} ${product.model}`,
    `Product type: ${productType}`,
    `Product URL: ${productUrl}`,
    configurationLine,
    `Price: ${price}`,
    'Please let me know more. This is an inquiry, not an order.',
  ].join('\n')
}

export function generalInquiryUrl() {
  return whatsappUrl('Hello RXB, I have a general question about your laptop and technology listings.')
}

export function topicInquiryUrl(topic: string) {
  return whatsappUrl(`Hello RXB, I have a question about ${topic}.`)
}

/** Public social profiles. Leave a value empty to hide its icon in the footer. */
export const SOCIAL_LINKS: { label: string; url: string }[] = [
  { label: 'Facebook', url: '' },
  { label: 'Instagram', url: '' },
  { label: 'YouTube', url: '' },
  { label: 'TikTok', url: '' },
]
