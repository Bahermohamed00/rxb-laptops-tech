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
  const production = new ImagesService(fakePrisma, { getOrThrow: key => key === 'NODE_ENV' ? 'production' : 2048 });
  await assert.rejects(production.upload(request(png)), ServiceUnavailableException);
});
