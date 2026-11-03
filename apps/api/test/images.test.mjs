import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable } from 'node:stream';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@127.0.0.1:5432/rxb_test?schema=public';
const { ImagesService } = await import('../.phase1-build/features/images/images.service.js');
const { PublicImagesController } = await import('../.phase1-build/features/images/images.controller.js');
const { BadRequestException, PayloadTooLargeException, ServiceUnavailableException } = await import('@nestjs/common');

function createImagePrisma() {
  const images = new Map();
  const state = { failNextDelete: false, transactionOptions: [], lockedIds: [] };
  const deleteImage = async (target, where) => {
    const image = target.get(where.id);
    if (!image || (where.productId !== undefined && image.productId !== where.productId)) return { count: 0 };
    target.delete(where.id);
    return { count: 1 };
  };
  const prisma = {
    productImage: {
      create: async ({ data }) => {
        const image = { id: '16a44337-4508-4366-a2b2-19798aed8f8d', productId: null, ...data };
        images.set(image.id, image);
        return image;
      },
      findUnique: async ({ where }) => images.get(where.id) ?? null,
      deleteMany: ({ where }) => deleteImage(images, where),
    },
    $transaction: async (run, options) => {
      state.transactionOptions.push(options);
      const transactionImages = new Map([...images].map(([id, image]) => [id, { ...image }]));
      const tx = {
        $queryRaw: async (_query, id) => {
          state.lockedIds.push(id);
          return transactionImages.has(id) ? [{ id }] : [];
        },
        productImage: {
          findUnique: async ({ where }) => transactionImages.get(where.id) ?? null,
          deleteMany: async ({ where }) => {
            if (state.failNextDelete) {
              state.failNextDelete = false;
              throw new Error('simulated database finalization failure');
            }
            return deleteImage(transactionImages, where);
          },
        },
      };
      const result = await run(tx);
      images.clear();
      transactionImages.forEach((image, id) => images.set(id, image));
      return result;
    },
  };
  return { images, prisma, state };
}

test('development image storage checks signatures, size, and safe generated references', async t => {
  const directory = await mkdtemp(join(tmpdir(), 'rxb-product-images-'));
  process.env.RXB_LOCAL_IMAGE_DIR = directory;
  t.after(async () => { delete process.env.RXB_LOCAL_IMAGE_DIR; await rm(directory, { recursive: true, force: true }); });
  const images = new Map();
  const fakePrisma = { productImage: {
    create: async ({ data }) => { const image = { id: '16a44337-4508-4366-a2b2-19798aed8f8d', productId: null, ...data }; images.set(image.id, image); return image; },
    findUnique: async ({ where }) => images.get(where.id) ?? null,
    deleteMany: async ({ where }) => {
      const image = images.get(where.id);
      if (!image || image.productId !== null) return { count: 0 };
      images.delete(where.id);
      return { count: 1 };
    },
  } };
  const config = { getOrThrow: key => key === 'NODE_ENV' ? 'test' : 2048 };
  const service = new ImagesService(fakePrisma, config);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=', 'base64');
  const request = bytes => Object.assign(Readable.from([bytes]), { headers: { 'content-type': 'application/octet-stream' } });
  const uploaded = await service.upload(request(png));
  assert.equal(uploaded.imageUrl, `/api/public/images/${uploaded.id}`);
  const stored = await service.read(uploaded.id);
  assert.deepEqual(stored.bytes, png);
  const headers = new Map();
  let responseBody;
  await new PublicImagesController(service).get(uploaded.id, {
    setHeader: (name, value) => headers.set(name.toLowerCase(), value),
    send: value => { responseBody = value; },
  });
  assert.equal(headers.get('cross-origin-resource-policy'), 'cross-origin');
  assert.equal(headers.get('content-type'), 'image/png');
  assert.deepEqual(responseBody, png);
  await service.deleteUnattached(uploaded.id);
  assert.equal(images.has(uploaded.id), false);

  await assert.rejects(service.upload(request(Buffer.from('<svg>not allowed</svg>'))), BadRequestException);
  await assert.rejects(service.upload(request(Buffer.alloc(2049))), PayloadTooLargeException);
});

test('production images persist in Cloudinary and public API redirects to the durable asset', async t => {
  const { images, prisma } = createImagePrisma();
  const config = { getOrThrow: key => ({
    NODE_ENV: 'production',
    PRODUCT_IMAGE_MAX_BYTES: 2048,
    CLOUDINARY_CLOUD_NAME: 'rxb-test',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  })[key] };
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.fetch = async (url, init) => {
    calls.push({ url, init });
    const form = init.body;
    if (url.endsWith('/image/upload')) {
      const publicId = form.get('public_id');
      return Response.json({
        public_id: `rxb-products/${publicId}`,
        secure_url: `https://res.cloudinary.com/rxb-test/image/upload/v123/rxb-products/${publicId}.png`,
      });
    }
    return Response.json({ result: 'ok' });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const service = new ImagesService(prisma, config);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=', 'base64');
  const request = Object.assign(Readable.from([png]), { headers: { 'content-type': 'application/octet-stream' } });
  const uploaded = await service.upload(request);
  const image = images.get(uploaded.id);
  assert.match(image.cloudinaryPublicId, /^rxb-products\/[0-9a-f-]{36}$/);
  assert.match(image.cloudinarySecureUrl, /^https:\/\/res\.cloudinary\.com\/rxb-test\//);
  assert.equal(image.byteSize, png.byteLength);
  assert.equal(calls[0].url, 'https://api.cloudinary.com/v1_1/rxb-test/image/upload');

  const stored = await service.read(uploaded.id);
  assert.equal(stored.redirectUrl, image.cloudinarySecureUrl);
  const headers = new Map();
  let redirect;
  await new PublicImagesController(service).get(uploaded.id, {
    setHeader: (name, value) => headers.set(name.toLowerCase(), value),
    redirect: (status, url) => { redirect = { status, url }; },
  });
  assert.equal(redirect.status, 302);
  assert.equal(redirect.url, image.cloudinarySecureUrl);
  assert.equal(headers.get('cross-origin-resource-policy'), 'cross-origin');

  await service.deleteUnattached(uploaded.id);
  assert.equal(images.has(uploaded.id), false);
  assert.ok(calls.some(call => call.url.endsWith('/image/destroy')));
});

test('Cloudinary deletion retains its database reference after provider failure and can be retried', async t => {
  const { images, prisma, state } = createImagePrisma();
  const deleteResponses = [
    new Response('provider failure detail', { status: 503 }),
    Response.json({ result: 'ok' }),
  ];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/image/upload')) {
      const publicId = init.body.get('public_id');
      return Response.json({
        public_id: `rxb-products/${publicId}`,
        secure_url: `https://res.cloudinary.com/rxb-test/image/upload/v123/rxb-products/${publicId}.png`,
      });
    }
    return deleteResponses.shift();
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const config = { getOrThrow: key => ({
    NODE_ENV: 'production',
    PRODUCT_IMAGE_MAX_BYTES: 2048,
    CLOUDINARY_CLOUD_NAME: 'rxb-test',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  })[key] };
  const service = new ImagesService(prisma, config);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=', 'base64');
  const request = Object.assign(Readable.from([png]), { headers: { 'content-type': 'application/octet-stream' } });
  const uploaded = await service.upload(request);
  const storedBeforeDelete = images.get(uploaded.id);

  await assert.rejects(
    service.deleteUnattached(uploaded.id),
    error => error instanceof ServiceUnavailableException && /safely retried/.test(error.message),
  );
  assert.equal(images.get(uploaded.id).cloudinaryPublicId, storedBeforeDelete.cloudinaryPublicId);

  await service.deleteUnattached(uploaded.id);
  assert.equal(images.has(uploaded.id), false);
  assert.deepEqual(state.lockedIds, [uploaded.id, uploaded.id]);
  assert.ok(state.transactionOptions.every(options => options.timeout === 20_000));
});

test('Cloudinary deletion retry finalizes the database row when the asset was already removed', async t => {
  const { images, prisma, state } = createImagePrisma();
  state.failNextDelete = true;
  const deleteResults = ['ok', 'not found'];
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, init) => {
    if (url.endsWith('/image/upload')) {
      const publicId = init.body.get('public_id');
      return Response.json({
        public_id: `rxb-products/${publicId}`,
        secure_url: `https://res.cloudinary.com/rxb-test/image/upload/v123/rxb-products/${publicId}.png`,
      });
    }
    return Response.json({ result: deleteResults.shift() });
  };
  t.after(() => { globalThis.fetch = originalFetch; });

  const config = { getOrThrow: key => ({
    NODE_ENV: 'production',
    PRODUCT_IMAGE_MAX_BYTES: 2048,
    CLOUDINARY_CLOUD_NAME: 'rxb-test',
    CLOUDINARY_API_KEY: 'test-key',
    CLOUDINARY_API_SECRET: 'test-secret',
  })[key] };
  const service = new ImagesService(prisma, config);
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l6sAAAAASUVORK5CYII=', 'base64');
  const request = Object.assign(Readable.from([png]), { headers: { 'content-type': 'application/octet-stream' } });
  const uploaded = await service.upload(request);

  await assert.rejects(service.deleteUnattached(uploaded.id), /simulated database finalization failure/);
  assert.ok(images.has(uploaded.id));
  await service.deleteUnattached(uploaded.id);
  assert.equal(images.has(uploaded.id), false);
  assert.deepEqual(state.lockedIds, [uploaded.id, uploaded.id]);
});
