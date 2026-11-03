import assert from 'node:assert/strict';
import test from 'node:test';

const { AccessoryCategoriesService } = await import('../.phase1-build/features/products/categories.service.js');
const { ConflictException, BadRequestException } = await import('@nestjs/common');

test('category creation normalizes names and creates dynamic slugs without seeding products', async () => {
  let data;
  const service = new AccessoryCategoriesService({ accessoryCategory: { create: async args => { data = args.data; return { id: 'category-id', ...data }; } } });
  const result = await service.create({ name: '  Headsets & Audio  ', description: 'Audio products', isActive: true });
  assert.equal(result.name, 'Headsets & Audio');
  assert.equal(data.normalizedName, 'headsets & audio');
  assert.equal(data.slug, 'headsets-audio');
  assert.equal(data.description, 'Audio products');
});

test('duplicate category names and invalid image URLs fail with field errors', async () => {
  const duplicate = new AccessoryCategoriesService({ accessoryCategory: { create: async () => { throw { code: 'P2002', meta: { target: ['normalizedName'] } }; } } });
  await assert.rejects(duplicate.create({ name: 'Mice' }), error => error instanceof ConflictException && Boolean(error.getResponse().fieldErrors.name));
  const service = new AccessoryCategoriesService({ accessoryCategory: { create: async () => assert.fail('invalid URLs must not reach persistence') } });
  await assert.rejects(service.create({ name: 'Bad URL', imageUrl: 'javascript:alert(1)' }), BadRequestException);
  await assert.rejects(service.create({ name: '   ' }), BadRequestException);
});

test('category archive deactivates the row without deleting product relationships', async () => {
  let args;
  const service = new AccessoryCategoriesService({ accessoryCategory: { update: async value => { args = value; return { id: value.where.id, isActive: false }; } } });
  const result = await service.archive('category-id');
  assert.deepEqual(args, { where: { id: 'category-id' }, data: { isActive: false } });
  assert.equal(result.isActive, false);
});