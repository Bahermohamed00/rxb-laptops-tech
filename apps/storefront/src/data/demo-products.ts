import type { Product } from '../features/home/products.types'

export const demoProducts: Product[] = [
  { name: 'Zenbook 14 OLED', line: 'Core Ultra 7 · 16GB · 1TB SSD', price: 'EGP 48,900', condition: 'NEW', type: 'new', visual: 'zenbook', accent: 'violet' },
  { name: 'ThinkPad X1 Carbon', line: 'Core i7 · 16GB · 512GB SSD', price: 'EGP 32,500', condition: 'PRE-OWNED · EXCELLENT', type: 'pre-owned', visual: 'thinkpad', accent: 'silver' },
  { name: 'ROG Zephyrus G14', line: 'Ryzen 9 · RTX 4060 · 1TB SSD', price: 'EGP 76,900', condition: 'NEW', type: 'new', visual: 'zephyrus', accent: 'blue' },
]
