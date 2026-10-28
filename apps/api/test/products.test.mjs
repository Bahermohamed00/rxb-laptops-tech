import assert from 'node:assert/strict';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = '5185';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@127.0.0.1:5432/rxb_test?schema=public';
process.env.CORS_ORIGINS = 'http://127.0.0.1:5183,http://127.0.0.1:5184';
process.env.API_RATE_LIMIT = '500';
process.env.API_RATE_TTL_MS = '60000';
process.env.AUTH_LOGIN_LIMIT = '6';
process.env.AUTH_LOGIN_TTL_MS = '900000';
process.env.ADMIN_SESSION_TTL_MS = '300000';
process.env.TRUST_PROXY_HOPS = '0';

const [{ Test }, { AppModule }, { PrismaService }, { configureApiApp }, { validateEnvironment }] = await Promise.all([
  import('@nestjs/testing'), import('../.phase1-build/app.module.js'), import('../.phase1-build/prisma/prisma.service.js'),
  import('../.phase1-build/app-config.js'), import('../.phase1-build/config/environment.js'),
]);
const [{ ProductsService }, { BadRequestException }] = await Promise.all([
  import('../.phase1-build/features/products/products.service.js'), import('@nestjs/common'),
]);

const product = {
  id: '9c490877-4e17-4f25-99da-a104c0803af1', slug: 'rxb-demo-laptop', productType: 'LAPTOP', brand: 'Demo', model: 'Laptop', description: 'Fixture only',
  condition: 'NEW', conditionNotes: null, useCase: 'WORK', status: 'ACTIVE', currency: 'EGP', priceMinor: 100000,
  specs: {},
  cpu: 'Fixed CPU', gpu: 'Fixed GPU', baseRamGB: 16, baseRamType: 'DDR5', baseStorageGB: 512, baseStorageType: 'NVME',
  displaySizeInches: null, displayResolution: null, displayPanel: null, refreshRateHz: null, stockQuantity: 2,
  createdAt: new Date(), updatedAt: new Date(),
  ramOptions: [
    { id: '28b46e30-66de-4e1c-ab80-9915e11a908a', productId: '9c490877-4e17-4f25-99da-a104c0803af1', capacityGB: 16, type: 'DDR5', priceDeltaMinor: 0, isBase: true, isAvailable: true },
    { id: '6da2cebd-c017-45ce-9e81-8ec70a3cc174', productId: '9c490877-4e17-4f25-99da-a104c0803af1', capacityGB: 32, type: 'DDR5', priceDeltaMinor: 12000, isBase: false, isAvailable: true },
    { id: '32a8f565-3e92-41ac-b35f-5fffd6a2e8da', productId: '9c490877-4e17-4f25-99da-a104c0803af1', capacityGB: 64, type: 'DDR5', priceDeltaMinor: 50000, isBase: false, isAvailable: false },
  ],
  storageOptions: [
    { id: '7e4bcd62-35ea-4d30-9cd7-8f3e5c04b788', productId: '9c490877-4e17-4f25-99da-a104c0803af1', capacityGB: 512, type: 'NVME', priceDeltaMinor: 0, isBase: true, isAvailable: true },
    { id: '658a03c3-dbad-4548-9f74-3987da14043d', productId: '9c490877-4e17-4f25-99da-a104c0803af1', capacityGB: 1024, type: 'NVME', priceDeltaMinor: 8000, isBase: false, isAvailable: true },
  ], combinations: [
    { productId: '9c490877-4e17-4f25-99da-a104c0803af1', ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true },
    { productId: '9c490877-4e17-4f25-99da-a104c0803af1', ramCapacityGB: 32, ramType: 'DDR5', storageCapacityGB: 1024, storageType: 'NVME', isAvailable: true },
  ], image: { id: 'ed6de2f1-df48-457c-9436-c2438ce37f61', productId: '9c490877-4e17-4f25-99da-a104c0803af1', storageKey: 'private-key.webp', contentType: 'image/webp', byteSize: 123, createdAt: new Date() },
};

test('product API publishes safe catalog fields and calculates prices from compatible options', async t => {
  let publishedProducts = [product];
  const fakePrisma = {
    product: {
      findMany: async () => publishedProducts,
      findFirst: async ({ where }) => where.slug === product.slug && where.status === 'ACTIVE' ? product : null,
    },
  };
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(PrismaService).useValue(fakePrisma).compile();
  const app = moduleRef.createNestApplication();
  configureApiApp(app, validateEnvironment(process.env));
  await app.init(); await app.listen(0, '127.0.0.1');
  const base = `${await app.getUrl()}/api`;
  t.after(async () => { await app.close(); });

  const anonymousAdmin = await fetch(`${base}/admin/products`);
  assert.equal(anonymousAdmin.status, 401);
  const anonymousWrite = await fetch(`${base}/admin/products`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' });
  assert.equal(anonymousWrite.status, 401);
  const anonymousUpload = await fetch(`${base}/admin/images`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.from([1, 2, 3]) });
  assert.equal(anonymousUpload.status, 401);
  const oversizedUpload = await fetch(`${base}/admin/images`, { method: 'POST', headers: { 'Content-Type': 'application/octet-stream' }, body: Buffer.alloc(5 * 1024 * 1024 + 1) });
  assert.equal(oversizedUpload.status, 413);
  assert.doesNotMatch(await oversizedUpload.text(), /stack|node_modules/i);

  const listing = await fetch(`${base}/public/products`);
  assert.equal(listing.status, 200);
  const publicProducts = await listing.json();
  assert.equal(publicProducts.length, 1);
  assert.equal('stockQuantity' in publicProducts[0], false);
  assert.equal('storageKey' in publicProducts[0], false);
  assert.equal(publicProducts[0].imageUrl, `/api/public/images/${product.image.id}`);
  assert.deepEqual(publicProducts[0].ramOptions.map(option => option.capacityGB), [16, 32]);
  assert.deepEqual(publicProducts[0].combinations, [
    { ramOptionId: product.ramOptions[0].id, storageOptionId: product.storageOptions[0].id },
    { ramOptionId: product.ramOptions[1].id, storageOptionId: product.storageOptions[1].id },
  ]);
  assert.equal(publicProducts[0].cpu, 'Fixed CPU');
  assert.equal(publicProducts[0].useCase, 'WORK');
  assert.equal('gpuOptions' in publicProducts[0], false);
  const detail = await fetch(`${base}/public/products/${product.slug}`);
  assert.equal(detail.status, 200);
  assert.equal((await detail.json()).slug, product.slug);
  const storefrontPreflight = await fetch(`${base}/public/products/${product.slug}/quote`, { method: 'OPTIONS', headers: { Origin: 'http://127.0.0.1:5183', 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type' } });
  assert.equal(storefrontPreflight.headers.get('access-control-allow-origin'), 'http://127.0.0.1:5183');

  const quoteResponse = await fetch(`${base}/public/products/${product.slug}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ramOptionId: product.ramOptions[1].id, storageOptionId: product.storageOptions[1].id }),
  });
  assert.equal(quoteResponse.status, 201);
  assert.deepEqual(await quoteResponse.json(), { currency: 'EGP', priceMinor: 120000, ramOptionId: product.ramOptions[1].id, storageOptionId: product.storageOptions[1].id });

  product.stockQuantity = 0;
  const unavailableListingQuote = await fetch(`${base}/public/products/${product.slug}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ramOptionId: product.ramOptions[0].id, storageOptionId: product.storageOptions[0].id }),
  });
  assert.equal(unavailableListingQuote.status, 201, 'Pricing an inquiry configuration does not claim stock is available');
  assert.equal((await unavailableListingQuote.json()).priceMinor, product.priceMinor);
  product.stockQuantity = 2;

  const unavailable = await fetch(`${base}/public/products/${product.slug}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ramOptionId: product.ramOptions[2].id, storageOptionId: product.storageOptions[0].id }),
  });
  assert.equal(unavailable.status, 400);

  const unsupportedPair = await fetch(`${base}/public/products/${product.slug}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ramOptionId: product.ramOptions[1].id, storageOptionId: product.storageOptions[0].id }),
  });
  assert.equal(unsupportedPair.status, 400, 'Options that are individually available must still be an explicitly supported pair');

  const attemptsToCustomizeFixedHardware = await fetch(`${base}/public/products/${product.slug}/quote`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ramOptionId: product.ramOptions[0].id, storageOptionId: product.storageOptions[0].id, cpu: 'Client supplied CPU', gpu: 'Client supplied GPU' }),
  });
  assert.equal(attemptsToCustomizeFixedHardware.status, 400);

  publishedProducts = [];
  const emptyCatalog = await fetch(`${base}/public/products`);
  assert.equal(emptyCatalog.status, 200);
  assert.deepEqual(await emptyCatalog.json(), []);
});

test('product creation requires base options matching the fixed laptop configuration', async () => {
  const service = new ProductsService({}, {});
  const invalid = {
    brand: 'Demo', model: 'Laptop', slug: 'demo-laptop', condition: 'NEW', status: 'DRAFT', priceMinor: 100000,
    useCase: 'STUDY',
    cpu: 'Fixed CPU', gpu: 'Fixed GPU', baseRamGB: 16, baseRamType: 'DDR5', baseStorageGB: 512, baseStorageType: 'NVME', stockQuantity: 1,
    ramOptions: [{ capacityGB: 32, type: 'DDR5', priceDeltaMinor: 1000, isBase: true, isAvailable: true }],
    storageOptions: [{ capacityGB: 512, type: 'NVME', priceDeltaMinor: 0, isBase: true, isAvailable: true }],
    combinations: [{ ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true }],
  };
  await assert.rejects(service.create(invalid), BadRequestException);
});

test('valid product creation persists one laptop record and product-scoped upgrade options atomically', async () => {
  let persisted;
  const tx = {
    product: {
      create: async ({ data }) => { persisted = data; return { id: product.id }; },
      findUniqueOrThrow: async () => ({ ...product, ...persisted, image: null, ramOptions: persisted.ramOptions.create, storageOptions: persisted.storageOptions.create, combinations: [{ ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true }] }),
    },
    productUpgradeCombination: { createMany: async ({ data }) => { persisted.combinations = data; } },
  };
  const prisma = { $transaction: callback => callback(tx) };
  const service = new ProductsService(prisma, {});
  const created = await service.create({
    slug: 'new-laptop', brand: 'Demo', model: 'New Laptop', description: '', condition: 'NEW', useCase: 'GAMING', status: 'DRAFT', priceMinor: 100000,
    cpu: 'Fixed CPU', gpu: 'Fixed GPU', baseRamGB: 16, baseRamType: 'DDR5', baseStorageGB: 512, baseStorageType: 'NVME', stockQuantity: 1,
    ramOptions: [{ capacityGB: 16, type: 'DDR5', priceDeltaMinor: 0, isBase: true, isAvailable: true }],
    storageOptions: [{ capacityGB: 512, type: 'NVME', priceDeltaMinor: 0, isBase: true, isAvailable: true }],
    combinations: [{ ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true }],
  });
  assert.equal(created.slug, 'new-laptop');
  assert.equal(persisted.cpu, 'Fixed CPU');
  assert.equal(persisted.gpu, 'Fixed GPU');
  assert.equal(persisted.useCase, 'GAMING');
  assert.equal(persisted.ramOptions.create.length, 1);
  assert.equal(persisted.storageOptions.create.length, 1);
  assert.equal(persisted.combinations.length, 1);
});

test('accessory products persist their type-specific specs without laptop-only fields or upgrade options', async () => {
  let persisted;
  const tx = {
    product: {
      create: async ({ data }) => { persisted = data; return { id: product.id }; },
      findUniqueOrThrow: async () => ({ ...product, ...persisted, image: null, ramOptions: [], storageOptions: [], combinations: [] }),
    },
  };
  const service = new ProductsService({ $transaction: callback => callback(tx) }, {});
  const created = await service.create({
    slug: 'rxb-keyboard', productType: 'KEYBOARD', brand: 'RXB', model: 'Mechanical Keyboard', description: 'A real catalog listing.',
    condition: 'NEW', status: 'ACTIVE', priceMinor: 125000, stockQuantity: 3,
    specs: { keyboardType: 'Mechanical', connection: 'Wired', layout: 'EN+AR', backlight: 'RGB' },
  });
  assert.equal(created.productType, 'KEYBOARD');
  assert.equal(persisted.productType, 'KEYBOARD');
  assert.equal(persisted.cpu, null);
  assert.equal(persisted.gpu, null);
  assert.equal(persisted.baseRamGB, null);
  assert.equal(persisted.baseStorageGB, null);
  assert.deepEqual(persisted.specs, { keyboardType: 'Mechanical', connection: 'Wired', layout: 'EN+AR', backlight: 'RGB' });
  assert.deepEqual(persisted.ramOptions.create, []);
  assert.deepEqual(persisted.storageOptions.create, []);
});

test('accessory specifications are validated by product type and reject unsupported fields or values', async () => {
  const service = new ProductsService({}, {});
  const base = {
    slug: 'rxb-mouse', productType: 'MOUSE', brand: 'RXB', model: 'Wireless Mouse', description: 'A real catalog listing.',
    condition: 'NEW', status: 'ACTIVE', priceMinor: 100000, stockQuantity: 1,
  };
  await assert.rejects(service.create({ ...base, specs: { connection: 'Bluetooth', dpi: 1600, buttonCount: 6, color: 'Black' } }), BadRequestException);
  await assert.rejects(service.create({ ...base, specs: { connection: 'Wired', dpi: 1600, buttonCount: 6, color: 'Black', keyboardType: 'Mechanical' } }), BadRequestException);
  await assert.rejects(service.create({ ...base, specs: { connection: 'Wireless', dpi: 1600.5, buttonCount: 6, color: 'Black' } }), BadRequestException);
  await assert.rejects(service.create({ ...base, specs: { connection: 'Wireless', buttonCount: 6, color: 'Black' } }), BadRequestException);
});

test('accessory public listings expose their product type and listed price without laptop options', async () => {
  const accessory = {
    ...product, slug: 'rxb-keyboard', productType: 'KEYBOARD', brand: 'RXB', model: 'Mechanical Keyboard',
    specs: { keyboardType: 'Mechanical', connection: 'Wired', layout: 'EN+AR', backlight: 'RGB' },
    cpu: null, gpu: null, baseRamGB: null, baseRamType: null, baseStorageGB: null, baseStorageType: null,
    useCase: null, stockQuantity: 0, image: null, ramOptions: [], storageOptions: [], combinations: [],
  };
  const service = new ProductsService({ product: { findMany: async () => [accessory] } }, {});
  const [listed] = await service.publicList();
  assert.equal(listed.productType, 'KEYBOARD');
  assert.equal(listed.priceMinor, accessory.priceMinor);
  assert.equal(listed.available, false);
  assert.deepEqual(listed.specs, accessory.specs);
  assert.equal(listed.cpu, null);
  assert.deepEqual(listed.ramOptions, []);
  assert.deepEqual(listed.storageOptions, []);
  assert.deepEqual(listed.combinations, []);
  assert.equal('stockQuantity' in listed, false);
});

test('accessory product quotes are rejected instead of applying laptop upgrade pricing', async () => {
  const accessory = { ...product, productType: 'MOUSE', ramOptions: [], storageOptions: [], combinations: [] };
  const service = new ProductsService({ product: { findFirst: async () => accessory } }, {});
  await assert.rejects(service.quote(accessory.slug, product.ramOptions[0].id, product.storageOptions[0].id), BadRequestException);
});

test('product edits replace supported options and compatible pairs in one transaction', async () => {
  const calls = [];
  const updated = { ...product, slug: 'updated-laptop', image: null };
  const tx = {
    productUpgradeCombination: { deleteMany: async () => { calls.push('delete-combinations'); }, createMany: async ({ data }) => { calls.push(['create-combinations', data]); } },
    productRamOption: { deleteMany: async () => { calls.push('delete-ram'); } },
    productStorageOption: { deleteMany: async () => { calls.push('delete-storage'); } },
    productImage: { updateMany: async () => ({ count: 0 }) },
    product: {
      findUniqueOrThrow: async () => ({ ...updated, ramOptions: product.ramOptions, storageOptions: product.storageOptions, combinations: product.combinations }),
      update: async ({ data }) => { Object.assign(updated, { slug: data.slug, status: data.status }); return updated; },
    },
  };
  const prisma = {
    product: { findUnique: async () => ({ ...product, ramOptions: product.ramOptions, storageOptions: product.storageOptions, combinations: product.combinations, image: null }) },
    $transaction: callback => callback(tx),
  };
  const service = new ProductsService(prisma, { deleteUnattached: async () => {} });
  const result = await service.update(product.id, {
    slug: 'updated-laptop', brand: product.brand, model: product.model, description: product.description,
    condition: 'NEW', status: 'ACTIVE', priceMinor: product.priceMinor, cpu: product.cpu, gpu: product.gpu,
    baseRamGB: 16, baseRamType: 'DDR5', baseStorageGB: 512, baseStorageType: 'NVME', stockQuantity: 2,
    ramOptions: [{ capacityGB: 16, type: 'DDR5', priceDeltaMinor: 0, isBase: true, isAvailable: true }],
    storageOptions: [{ capacityGB: 512, type: 'NVME', priceDeltaMinor: 0, isBase: true, isAvailable: true }],
    combinations: [{ ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true }],
  });
  assert.equal(result.slug, 'updated-laptop');
  assert.deepEqual(calls.slice(0, 3), ['delete-combinations', 'delete-ram', 'delete-storage']);
  assert.deepEqual(calls[3], ['create-combinations', [{ productId: product.id, ramCapacityGB: 16, ramType: 'DDR5', storageCapacityGB: 512, storageType: 'NVME', isAvailable: true }]]);
});

test('product deletion strategy archives the record instead of removing its history', async () => {
  let update;
  const service = new ProductsService({ product: { update: async args => { update = args; return { id: product.id, status: 'ARCHIVED' }; } } }, {});
  const result = await service.archive(product.id);
  assert.equal(result.status, 'ARCHIVED');
  assert.deepEqual(update, { where: { id: product.id }, data: { status: 'ARCHIVED' } });
});

test('Admin product search applies database filters, sorting, and pagination before serialization', async () => {
  let where;
  let listArguments;
  const prisma = {
    product: {
      count: async args => { where = args.where; return 13; },
      findMany: async args => { listArguments = args; return [product]; },
    },
    $transaction: operations => Promise.all(operations),
  };
  const service = new ProductsService(prisma, {});
  const page = await service.adminList({
    q: 'Ryzen 7', minPriceMinor: 3000000, maxPriceMinor: 5000000, condition: 'NEW', status: 'ACTIVE',
    ramGB: 16, ramType: 'DDR5', storageGB: 512, storageType: 'NVME', displaySizeInches: 14,
    displayResolution: '1920', page: 2, pageSize: 12, sort: 'PRICE_ASC',
  });
  assert.equal(page.total, 13);
  assert.equal(page.page, 2);
  assert.equal(page.items[0].slug, product.slug);
  assert.deepEqual(where.priceMinor, { gte: 3000000, lte: 5000000 });
  assert.deepEqual(where.ramOptions, { some: { capacityGB: 16, type: 'DDR5' } });
  assert.deepEqual(where.storageOptions, { some: { capacityGB: 512, type: 'NVME' } });
  assert.equal(where.OR.find(item => item.cpu)?.cpu.contains, 'Ryzen 7');
  assert.equal(listArguments.skip, 12);
  assert.equal(listArguments.take, 12);
  assert.deepEqual(listArguments.orderBy, [{ priceMinor: 'asc' }, { id: 'asc' }]);
});

test('inventory changes require a reason and atomically record the previous/new quantity and acting admin', async () => {
  let adjustment;
  let updateFilter;
  const updated = { id: product.id, slug: product.slug, stockQuantity: 5, status: product.status, updatedAt: new Date() };
  const tx = {
    product: {
      findUnique: async () => ({ stockQuantity: 2 }),
      updateMany: async ({ where }) => { updateFilter = where; return { count: 1 }; },
      findUniqueOrThrow: async () => updated,
    },
    inventoryAdjustment: { create: async ({ data }) => { adjustment = data; } },
  };
  const prisma = { $transaction: callback => callback(tx) };
  const service = new ProductsService(prisma, {});
  const result = await service.updateInventory(product.id, { stockQuantity: 5, reason: '  Physical count correction  ' }, '4c456728-493d-4283-b5db-5e3cd67f21a1');
  assert.equal(result.stockQuantity, 5);
  assert.deepEqual(updateFilter, { id: product.id, stockQuantity: 2 });
  assert.deepEqual(adjustment, {
    productId: product.id, adminUserId: '4c456728-493d-4283-b5db-5e3cd67f21a1',
    previousQuantity: 2, newQuantity: 5, reason: 'Physical count correction',
  });
});
