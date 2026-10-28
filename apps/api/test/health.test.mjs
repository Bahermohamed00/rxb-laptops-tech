import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import test from 'node:test';
import { HealthController } from '../.phase1-build/health.controller.js';

test('GET /api/health reports only API process status without a database', async t => {
  const moduleRef = await Test.createTestingModule({ controllers: [HealthController] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  await app.listen(0, '127.0.0.1');
  t.after(async () => { await app.close(); });
  const response = await fetch(`${await app.getUrl()}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
});
