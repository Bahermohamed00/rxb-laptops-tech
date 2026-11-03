import assert from 'node:assert/strict';
import 'reflect-metadata';
import { Test } from '@nestjs/testing';
import test from 'node:test';
import { HealthController } from '../.phase1-build/health.controller.js';
import { PrismaService } from '../.phase1-build/prisma/prisma.service.js';

test('GET /api/health reports only API process status without a database', async t => {
  let databaseReady = true;
  const moduleRef = await Test.createTestingModule({
    controllers: [HealthController],
    providers: [{ provide: PrismaService, useValue: { $queryRaw: async () => {
      if (!databaseReady) throw new Error('private database connection detail');
      return [{ result: 1 }];
    } } }],
  }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api');
  await app.init();
  await app.listen(0, '127.0.0.1');
  t.after(async () => { await app.close(); });
  const response = await fetch(`${await app.getUrl()}/api/health`);
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { status: 'ok' });
  const readiness = await fetch(`${await app.getUrl()}/api/ready`);
  assert.equal(readiness.status, 200);
  assert.deepEqual(await readiness.json(), { status: 'ready' });
  databaseReady = false;
  const unavailable = await fetch(`${await app.getUrl()}/api/ready`);
  assert.equal(unavailable.status, 503);
  const responseBody = await unavailable.text();
  assert.match(responseBody, /Database is not ready/);
  assert.doesNotMatch(responseBody, /private database connection detail/);
});
