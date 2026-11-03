import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';

const { deleteCloudinaryImage, isCloudinarySecureUrl, uploadCloudinaryImage } = await import('../.phase1-build/features/images/cloudinary-storage.js');

const credentials = { cloudName: 'rxb-test', apiKey: 'test-key', apiSecret: 'test-secret' };

test('Cloudinary uploads signed image bytes and validates the returned public URL', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    const form = init.body;
    return Response.json({
      public_id: `rxb-products/${form.get('public_id')}`,
      secure_url: `https://res.cloudinary.com/rxb-test/image/upload/v123/rxb-products/${form.get('public_id')}.png`,
    });
  };
  const result = await uploadCloudinaryImage(credentials, Buffer.from('mock image'), 'image/png', '123e4567-e89b-12d3-a456-426614174000', fetcher);

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://api.cloudinary.com/v1_1/rxb-test/image/upload');
  const form = calls[0].init.body;
  assert.equal(form.get('api_key'), credentials.apiKey);
  assert.equal(form.get('folder'), 'rxb-products');
  assert.equal(form.get('overwrite'), 'false');
  assert.equal(form.get('file').type, 'image/png');
  const signedParams = 'folder=rxb-products&overwrite=false&public_id=123e4567-e89b-12d3-a456-426614174000&timestamp=' + form.get('timestamp');
  assert.equal(form.get('signature'), createHash('sha1').update(`${signedParams}${credentials.apiSecret}`).digest('hex'));
  assert.deepEqual(result, {
    publicId: 'rxb-products/123e4567-e89b-12d3-a456-426614174000',
    secureUrl: 'https://res.cloudinary.com/rxb-test/image/upload/v123/rxb-products/123e4567-e89b-12d3-a456-426614174000.png',
  });
});

test('Cloudinary deletes signed assets and accepts an already-removed image', async () => {
  const responses = ['ok', 'not found'];
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push({ url, init });
    return Response.json({ result: responses.shift() });
  };
  const publicId = 'rxb-products/123e4567-e89b-12d3-a456-426614174000';
  await deleteCloudinaryImage(credentials, publicId, fetcher);
  await deleteCloudinaryImage(credentials, publicId, fetcher);

  assert.equal(calls.length, 2);
  assert.ok(calls.every(call => call.url.endsWith('/image/destroy')));
  assert.ok(calls.every(call => call.init.body.get('public_id') === publicId));
});

test('Cloudinary failures stay generic and URLs cannot redirect outside the configured account', async () => {
  await assert.rejects(
    uploadCloudinaryImage(credentials, Buffer.from('mock image'), 'image/png', '123e4567-e89b-12d3-a456-426614174000',
      async () => new Response('provider detail with secret', { status: 500 })),
    error => error.message === 'Cloudinary upload failed.' && error.status === 500 && !error.message.includes(credentials.apiSecret),
  );
  assert.equal(isCloudinarySecureUrl('https://attacker.example/image.png', credentials.cloudName), false);
  assert.equal(isCloudinarySecureUrl('https://res.cloudinary.com/other/image/upload/id.png', credentials.cloudName), false);
});
