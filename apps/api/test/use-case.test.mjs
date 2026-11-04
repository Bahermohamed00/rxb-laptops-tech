import assert from 'node:assert/strict';
import test from 'node:test';
import 'reflect-metadata';

const [{ plainToInstance }, { validate }, dto] = await Promise.all([
  import('class-transformer'), import('class-validator'), import('../.phase1-build/features/products/products.dto.js'),
]);

const useCaseErrors = async (Dto, value) => (await validate(plainToInstance(Dto, { useCase: value })))
  .filter(error => error.property === 'useCase');

test('product DTO accepts every supported laptop use case, including WORKSTATION, and rejects unknown values', async () => {
  for (const value of ['WORK', 'STUDY', 'GAMING', 'WORKSTATION']) {
    assert.equal((await useCaseErrors(dto.ProductDto, value)).length, 0, `${value} should be accepted`);
  }
  assert.equal((await useCaseErrors(dto.ProductDto, 'SERVER')).length, 1);
});

test('admin product search accepts WORKSTATION and UNCATEGORIZED use-case filters', async () => {
  const SearchDto = dto.ProductSearchDto;
  for (const value of ['WORKSTATION', 'UNCATEGORIZED', 'GAMING']) {
    assert.equal((await useCaseErrors(SearchDto, value)).length, 0, `${value} should be accepted`);
  }
  assert.equal((await useCaseErrors(SearchDto, 'SERVER')).length, 1);
});
