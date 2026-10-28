export const DEMO_CATALOG_ENABLED = true

export type DemoLaptopCategory = 'WORK' | 'STUDY' | 'GAMING'
export type DemoAccessoryCategory = 'KEYBOARD' | 'STAND' | 'MOUSE' | 'MOUSE_PAD'

export type DemoLaptop = {
  id: string
  category: DemoLaptopCategory
  brand: string
  model: string
  description: string
  cpu: string
  gpu: string
  ramGB: number
  ramType: string
  storageGB: number
  storageType: string
  display: string
  priceEgp: number
}

export type DemoAccessory = {
  id: string
  category: DemoAccessoryCategory
  brand: string
  model: string
  description: string
  priceEgp: number
}

export const demoLaptops: DemoLaptop[] = [
  { id: 'demo-work-01', category: 'WORK', brand: 'Aster', model: 'Pro 14', description: 'Lightweight everyday notebook for focused office work.', cpu: 'Intel Core Ultra 5 125U', gpu: 'Intel Graphics', ramGB: 16, ramType: 'DDR5', storageGB: 512, storageType: 'NVMe SSD', display: '14 in · 1920 × 1200 IPS', priceEgp: 38900 },
  { id: 'demo-work-02', category: 'WORK', brand: 'Northstar', model: 'Business 15', description: 'Comfortable large-screen laptop for multitasking.', cpu: 'AMD Ryzen 7 7730U', gpu: 'Radeon Graphics', ramGB: 16, ramType: 'DDR4', storageGB: 512, storageType: 'NVMe SSD', display: '15.6 in · 1920 × 1080 IPS', priceEgp: 42900 },
  { id: 'demo-work-03', category: 'WORK', brand: 'Forma', model: 'Studio 14', description: 'A slim work companion with a crisp high-resolution display.', cpu: 'Intel Core Ultra 7 155H', gpu: 'Intel Arc Graphics', ramGB: 16, ramType: 'LPDDR5X', storageGB: 1_000, storageType: 'NVMe SSD', display: '14 in · 2880 × 1800 OLED', priceEgp: 56900 },
  { id: 'demo-work-04', category: 'WORK', brand: 'Cobalt', model: 'Everyday 16', description: 'Roomy 16-inch workspace for documents and video calls.', cpu: 'AMD Ryzen 5 7530U', gpu: 'Radeon Graphics', ramGB: 16, ramType: 'DDR4', storageGB: 512, storageType: 'NVMe SSD', display: '16 in · 1920 × 1200 IPS', priceEgp: 35900 },
  { id: 'demo-work-05', category: 'WORK', brand: 'Meridian', model: 'Air 13', description: 'Compact laptop concept for hybrid work and travel.', cpu: 'Intel Core i5-1335U', gpu: 'Intel Iris Xe', ramGB: 16, ramType: 'LPDDR5', storageGB: 512, storageType: 'NVMe SSD', display: '13.3 in · 1920 × 1200 IPS', priceEgp: 44900 },
  { id: 'demo-study-01', category: 'STUDY', brand: 'Aster', model: 'Campus 14', description: 'A balanced study notebook for classes and research.', cpu: 'Intel Core i5-1235U', gpu: 'Intel Iris Xe', ramGB: 8, ramType: 'DDR4', storageGB: 512, storageType: 'NVMe SSD', display: '14 in · 1920 × 1080 IPS', priceEgp: 24900 },
  { id: 'demo-study-02', category: 'STUDY', brand: 'Northstar', model: 'Note 15', description: 'Full-size keyboard and screen for long study sessions.', cpu: 'AMD Ryzen 5 5625U', gpu: 'Radeon Graphics', ramGB: 16, ramType: 'DDR4', storageGB: 512, storageType: 'NVMe SSD', display: '15.6 in · 1920 × 1080 IPS', priceEgp: 28900 },
  { id: 'demo-study-03', category: 'STUDY', brand: 'Forma', model: 'Learn 13', description: 'Portable classroom-ready laptop with a vivid display.', cpu: 'Intel Core i3-1315U', gpu: 'Intel UHD Graphics', ramGB: 8, ramType: 'LPDDR5', storageGB: 256, storageType: 'NVMe SSD', display: '13.3 in · 1920 × 1200 IPS', priceEgp: 26900 },
  { id: 'demo-study-04', category: 'STUDY', brand: 'Cobalt', model: 'Student 14', description: 'Everyday performance for notes, browsing, and projects.', cpu: 'AMD Ryzen 5 7520U', gpu: 'Radeon 610M', ramGB: 8, ramType: 'LPDDR5', storageGB: 512, storageType: 'NVMe SSD', display: '14 in · 1920 × 1080 IPS', priceEgp: 22900 },
  { id: 'demo-study-05', category: 'STUDY', brand: 'Meridian', model: 'Scholar 15', description: 'A dependable large-screen concept for home study.', cpu: 'Intel Core i5-12450H', gpu: 'Intel UHD Graphics', ramGB: 16, ramType: 'DDR4', storageGB: 512, storageType: 'NVMe SSD', display: '15.6 in · 1920 × 1080 IPS', priceEgp: 31900 },
  { id: 'demo-gaming-01', category: 'GAMING', brand: 'Aster', model: 'Pulse 16', description: 'High-refresh gaming concept with dedicated graphics.', cpu: 'Intel Core i7-14650HX', gpu: 'NVIDIA GeForce RTX 4060', ramGB: 16, ramType: 'DDR5', storageGB: 1_000, storageType: 'NVMe SSD', display: '16 in · 2560 × 1600 · 165 Hz', priceEgp: 78900 },
  { id: 'demo-gaming-02', category: 'GAMING', brand: 'Northstar', model: 'Vector 15', description: 'A fast 15-inch gaming setup for demanding titles.', cpu: 'AMD Ryzen 7 8845HS', gpu: 'NVIDIA GeForce RTX 4070', ramGB: 16, ramType: 'DDR5', storageGB: 1_000, storageType: 'NVMe SSD', display: '15.6 in · 2560 × 1440 · 165 Hz', priceEgp: 89900 },
  { id: 'demo-gaming-03', category: 'GAMING', brand: 'Forma', model: 'Arcade 16', description: 'Large immersive display and balanced gaming hardware.', cpu: 'Intel Core i7-13620H', gpu: 'NVIDIA GeForce RTX 4050', ramGB: 16, ramType: 'DDR5', storageGB: 512, storageType: 'NVMe SSD', display: '16 in · 1920 × 1200 · 144 Hz', priceEgp: 65900 },
  { id: 'demo-gaming-04', category: 'GAMING', brand: 'Cobalt', model: 'Striker 17', description: 'A desktop-replacement visual concept for game nights.', cpu: 'Intel Core i9-14900HX', gpu: 'NVIDIA GeForce RTX 4080', ramGB: 32, ramType: 'DDR5', storageGB: 1_000, storageType: 'NVMe SSD', display: '17.3 in · 2560 × 1440 · 240 Hz', priceEgp: 129900 },
  { id: 'demo-gaming-05', category: 'GAMING', brand: 'Meridian', model: 'Quest 15', description: 'Portable gaming performance in a compact chassis.', cpu: 'AMD Ryzen 7 7735HS', gpu: 'NVIDIA GeForce RTX 4060', ramGB: 16, ramType: 'DDR5', storageGB: 1_000, storageType: 'NVMe SSD', display: '15.6 in · 1920 × 1080 · 144 Hz', priceEgp: 72900 },
]

export const demoAccessories: DemoAccessory[] = [
  { id: 'demo-keyboard-01', category: 'KEYBOARD', brand: 'Aster', model: 'Key 75', description: 'Compact mechanical keyboard with tactile switches.', priceEgp: 3490 },
  { id: 'demo-keyboard-02', category: 'KEYBOARD', brand: 'Northstar', model: 'Office Type', description: 'Quiet full-size wireless keyboard for daily desk work.', priceEgp: 1890 },
  { id: 'demo-keyboard-03', category: 'KEYBOARD', brand: 'Forma', model: 'Glow TKL', description: 'Tenkeyless gaming keyboard with adjustable lighting.', priceEgp: 4290 },
  { id: 'demo-keyboard-04', category: 'KEYBOARD', brand: 'Cobalt', model: 'Slim Keys', description: 'Low-profile Bluetooth keyboard for a tidy setup.', priceEgp: 2390 },
  { id: 'demo-keyboard-05', category: 'KEYBOARD', brand: 'Meridian', model: 'Studio Board', description: 'Full-layout board concept with programmable shortcuts.', priceEgp: 5190 },
  { id: 'demo-stand-01', category: 'STAND', brand: 'Aster', model: 'Lift Aluminum', description: 'Adjustable aluminum riser for a comfortable screen height.', priceEgp: 1790 },
  { id: 'demo-stand-02', category: 'STAND', brand: 'Northstar', model: 'Fold Stand', description: 'Portable folding laptop stand for flexible workspaces.', priceEgp: 990 },
  { id: 'demo-stand-03', category: 'STAND', brand: 'Forma', model: 'Desk Arc', description: 'Angled metal stand with an open airflow design.', priceEgp: 2290 },
  { id: 'demo-stand-04', category: 'STAND', brand: 'Cobalt', model: 'Rise Pro', description: 'Multi-height support for larger laptop screens.', priceEgp: 2890 },
  { id: 'demo-stand-05', category: 'STAND', brand: 'Meridian', model: 'Travel Base', description: 'Lightweight compact support for a mobile desk.', priceEgp: 1290 },
  { id: 'demo-mouse-01', category: 'MOUSE', brand: 'Aster', model: 'Glide Wireless', description: 'Ergonomic wireless mouse with adjustable sensitivity.', priceEgp: 1490 },
  { id: 'demo-mouse-02', category: 'MOUSE', brand: 'Northstar', model: 'Precision M', description: 'Quiet-click productivity mouse for everyday use.', priceEgp: 890 },
  { id: 'demo-mouse-03', category: 'MOUSE', brand: 'Forma', model: 'Vector RGB', description: 'Programmable gaming mouse with side controls.', priceEgp: 2490 },
  { id: 'demo-mouse-04', category: 'MOUSE', brand: 'Cobalt', model: 'Go Mini', description: 'Compact Bluetooth mouse for travel and study.', priceEgp: 1090 },
  { id: 'demo-mouse-05', category: 'MOUSE', brand: 'Meridian', model: 'Track Pro', description: 'Rechargeable multi-device mouse concept.', priceEgp: 1990 },
  { id: 'demo-mousepad-01', category: 'MOUSE_PAD', brand: 'Aster', model: 'Soft Mat M', description: 'Smooth fabric surface for precise everyday tracking.', priceEgp: 390 },
  { id: 'demo-mousepad-02', category: 'MOUSE_PAD', brand: 'Northstar', model: 'Desk Pad XL', description: 'Extended desk mat with stitched edges.', priceEgp: 890 },
  { id: 'demo-mousepad-03', category: 'MOUSE_PAD', brand: 'Forma', model: 'Control Surface', description: 'Textured gaming surface for consistent movement.', priceEgp: 690 },
  { id: 'demo-mousepad-04', category: 'MOUSE_PAD', brand: 'Cobalt', model: 'Travel Pad', description: 'Compact non-slip mat for small desks and travel.', priceEgp: 290 },
  { id: 'demo-mousepad-05', category: 'MOUSE_PAD', brand: 'Meridian', model: 'Charge Mat', description: 'Large desk mat concept with an integrated charging zone.', priceEgp: 1590 },
]
