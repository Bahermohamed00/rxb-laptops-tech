import type { ProductType } from './products.api'

export type AccessoryProductType = Exclude<ProductType, 'LAPTOP'>
type AccessoryField = {
  key: string
  label: string
  kind: 'text' | 'number' | 'select'
  required: boolean
  options?: readonly string[]
  min?: number
  max?: number
  placeholder?: string
}

export const accessorySpecs: Record<AccessoryProductType, readonly AccessoryField[]> = {
  KEYBOARD: [
    { key: 'keyboardType', label: 'Keyboard type', kind: 'select', required: true, options: ['Mechanical', 'Membrane'] },
    { key: 'connection', label: 'Connection', kind: 'select', required: true, options: ['Wired', 'Wireless'] },
    { key: 'layout', label: 'Layout / language', kind: 'select', required: true, options: ['EN', 'AR', 'EN+AR'] },
    { key: 'backlight', label: 'Backlight', kind: 'select', required: true, options: ['RGB', 'None'] },
  ],
  MOUSE: [
    { key: 'connection', label: 'Connection', kind: 'select', required: true, options: ['Wired', 'Wireless'] },
    { key: 'dpi', label: 'DPI', kind: 'number', required: true, min: 1, max: 100000 },
    { key: 'buttonCount', label: 'Number of buttons', kind: 'number', required: true, min: 1, max: 50 },
    { key: 'color', label: 'Color', kind: 'text', required: true, max: 80, placeholder: 'e.g. Black' },
  ],
  MOUSE_PAD: [
    { key: 'size', label: 'Size', kind: 'select', required: true, options: ['Small', 'Medium', 'Large', 'XL'] },
    { key: 'material', label: 'Material', kind: 'text', required: true, max: 100, placeholder: 'e.g. Cloth' },
    { key: 'color', label: 'Color', kind: 'text', required: true, max: 80, placeholder: 'e.g. Black' },
  ],
  OTHER_ACCESSORY: [
    { key: 'categoryName', label: 'Category name', kind: 'text', required: true, max: 80, placeholder: 'e.g. Headset, Webcam, Bag' },
    { key: 'additionalNotes', label: 'Additional notes', kind: 'text', required: false, max: 500, placeholder: 'Optional product details' },
  ],
}
