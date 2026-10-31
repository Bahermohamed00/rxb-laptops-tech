import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as argon2 from 'argon2';
import test from 'node:test';

process.env.NODE_ENV = 'test';
process.env.PORT = '5185';
process.env.DATABASE_URL = 'postgresql://test_user:test_password@127.0.0.1:5432/rxb_test?schema=public';
process.env.CORS_ORIGINS = 'http://127.0.0.1:5184';
process.env.API_RATE_LIMIT = '500';
process.env.API_RATE_TTL_MS = '60000';
process.env.AUTH_LOGIN_LIMIT = '6';
process.env.AUTH_LOGIN_TTL_MS = '900000';
process.env.ADMIN_SESSION_TTL_MS = '300000';
process.env.TRUST_PROXY_HOPS = '0';

const [{ Test }, { AppModule }, { PrismaService }, { configureApiApp }, { validateEnvironment }, { RolesGuard }, { ForbiddenException }, { AdminRole }, { AuthService }] = await Promise.all([
  import('@nestjs/testing'),
  import('../.phase1-build/app.module.js'),
  import('../.phase1-build/prisma/prisma.service.js'),
  import('../.phase1-build/app-config.js'),
  import('../.phase1-build/config/environment.js'),
  import('../.phase1-build/auth/guards/roles.guard.js'),
  import('@nestjs/common'),
  import('../.phase1-build/generated/prisma-client/client.js'),
  import('../.phase1-build/auth/auth.service.js'),
]);

test('health, admin sessions, authorization, CORS, environment, and login limits', async t => {
  const passwordHash = await argon2.hash('test-admin-password', { type: argon2.argon2id, memoryCost: 19_456, timeCost: 2, parallelism: 1 });
  const admin = { id: 'd5d0f7c0-8136-4e7b-a932-a11653ec389a', email: 'admin@example.test', passwordHash, role: AdminRole.SUPER_ADMIN, status: 'ACTIVE', lastLoginAt: null };
  const sessions = new Map();
  const fakePrisma = {
    adminUser: {
      findUnique: async ({ where }) => where.email === admin.email ? admin : null,
      update: async ({ data }) => Object.assign(admin, data),
      count: async () => 1,
    },
    adminSession: {
      create: async ({ data }) => {
        const session = { id: `session-${sessions.size + 1}`, revokedAt: null, createdAt: new Date(), ...data };
        sessions.set(session.id, session);
        return session;
      },
      findUnique: async ({ where, include }) => {
        const session = where.tokenHash
          ? [...sessions.values()].find(item => item.tokenHash === where.tokenHash)
          : sessions.get(where.id);
        if (!session) return null;
        if (include?.user) return { ...session, user: admin };
        return session;
      },
      update: async ({ where, data }) => Object.assign(sessions.get(where.id), data),
    },
  };

  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService).useValue(fakePrisma)
    .compile();
  const app = moduleRef.createNestApplication();
  configureApiApp(app, validateEnvironment(process.env));
  await app.init();
  await app.listen(0, '127.0.0.1');
  const baseUrl = await app.getUrl();
  const origin = 'http://127.0.0.1:5184';
  const request = (path, init = {}) => fetch(`${baseUrl}/api${path}`, { ...init, headers: { Origin: origin, ...init.headers } });

  t.after(async () => { await app.close(); });

  await t.test('health endpoint reports process only, without a database query', async () => {
    const response = await request('/health');
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  });

  await t.test('protected session route rejects anonymous requests', async () => {
    const response = await request('/auth/session');
    assert.equal(response.status, 401);
  });

  await t.test('login rejects disallowed origins and unexpected body fields', async () => {
    const originRejected = await fetch(`${baseUrl}/api/auth/login`, { method: 'POST', headers: { Origin: 'https://evil.example', 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-admin-password' }) });
    assert.equal(originRejected.status, 403);
    const bodyRejected = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-admin-password', unexpected: true }) });
    assert.equal(bodyRejected.status, 400);
  });

  await t.test('login rejects bad credentials and returns a hardened cookie on success', async () => {
    const rejected = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'incorrect' }) });
    assert.equal(rejected.status, 401);
    assert.match((await rejected.json()).message, /Invalid email or password/);

    const response = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: ` ${admin.email.toUpperCase()} `, password: 'test-admin-password' }) });
    assert.equal(response.status, 200);
    const body = await response.json();
    assert.equal(body.user.email, admin.email);
    assert.equal(body.user.role, 'SUPER_ADMIN');
    assert.ok(body.csrfToken);
    assert.equal('passwordHash' in body.user, false);
    assert.equal(response.headers.get('cache-control'), 'no-store');
    const cookie = response.headers.getSetCookie()[0];
    assert.match(cookie, /^rxb_admin_session=/);
    assert.match(cookie, /HttpOnly/i);
    assert.match(cookie, /SameSite=Lax/i);
    assert.match(cookie, /Path=\/api;/i);
    assert.doesNotMatch(cookie, /Secure/i, 'test mode is not production');
    const token = cookie.split(';')[0].split('=').slice(1).join('=');
    assert.equal([...sessions.values()].at(-1).tokenHash, createHash('sha256').update(token).digest('hex'));
    return { cookie: cookie.split(';')[0], csrfToken: body.csrfToken, sessionId: [...sessions.keys()].at(-1) };
  });

  let validSession;
  await t.test('session route validates server state and returns only safe identity fields', async () => {
    const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-admin-password' }) });
    const body = await login.json();
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    validSession = { cookie, csrfToken: body.csrfToken, sessionId: [...sessions.keys()].at(-1) };
    const response = await request('/auth/session', { headers: { Cookie: cookie } });
    assert.equal(response.status, 200);
    const session = await response.json();
    assert.deepEqual(session.user, { id: admin.id, email: admin.email, role: 'SUPER_ADMIN', status: 'ACTIVE' });
    assert.equal(session.csrfToken, body.csrfToken);
    assert.equal(typeof session.expiresAt, 'string');
    assert.match(response.headers.getSetCookie()[0], /HttpOnly/i);
    assert.equal(response.headers.get('cache-control'), 'no-store');
  });

  await t.test('logout requires CSRF, revokes the session, and clears the cookie', async () => {
    const csrfRejected = await request('/auth/logout', { method: 'POST', headers: { Cookie: validSession.cookie, 'Content-Type': 'application/json' }, body: '{}' });
    assert.equal(csrfRejected.status, 403);
    const response = await request('/auth/logout', { method: 'POST', headers: { Cookie: validSession.cookie, 'Content-Type': 'application/json', 'X-CSRF-Token': validSession.csrfToken }, body: '{}' });
    assert.equal(response.status, 204);
    assert.match(response.headers.getSetCookie()[0], /Expires=Thu, 01 Jan 1970/i);
    assert.ok(sessions.get(validSession.sessionId).revokedAt);
    const afterLogout = await request('/auth/session', { headers: { Cookie: validSession.cookie } });
    assert.equal(afterLogout.status, 401);
  });

  await t.test('expired sessions are rejected server-side', async () => {
    const login = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-admin-password' }) });
    const cookie = login.headers.getSetCookie()[0].split(';')[0];
    const sessionId = [...sessions.keys()].at(-1);
    sessions.get(sessionId).expiresAt = new Date(Date.now() - 1000);
    const response = await request('/auth/session', { headers: { Cookie: cookie } });
    assert.equal(response.status, 401);
  });

  await t.test('CORS is limited to configured origins and supports credentials', async () => {
    const preflight = await fetch(`${baseUrl}/api/auth/login`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type,x-csrf-token' } });
    assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
    assert.equal(preflight.headers.get('access-control-allow-credentials'), 'true');
    const rejected = await fetch(`${baseUrl}/api/auth/login`, { method: 'OPTIONS', headers: { Origin: 'https://evil.example', 'Access-Control-Request-Method': 'POST' } });
    assert.equal(rejected.headers.get('access-control-allow-origin'), null);
  });

  await t.test('environment config rejects wildcard CORS and invalid rate values', () => {
    assert.throws(() => validateEnvironment({ ...process.env, CORS_ORIGINS: '*' }), /CORS_ORIGINS/);
    assert.throws(() => validateEnvironment({ ...process.env, API_RATE_LIMIT: 'not-a-number' }), /API_RATE_LIMIT/);
    assert.equal(validateEnvironment({ ...process.env, AUTH_LOGIN_LIMIT: undefined }).AUTH_LOGIN_LIMIT, 5);
    assert.throws(() => validateEnvironment({ ...process.env, NODE_ENV: 'production', CORS_ORIGINS: 'http://127.0.0.1:5184' }), /HTTPS/);
  });

  await t.test('production session cookies require Secure', () => {
    const auth = new AuthService(fakePrisma, { getOrThrow: key => key === 'NODE_ENV' ? 'production' : 28_800_000 });
    assert.equal(auth.cookieOptions().secure, true);
    assert.equal(auth.cookieOptions().httpOnly, true);
    assert.equal(auth.cookieOptions().sameSite, 'lax');
  });

  await t.test('role guard denies a user without the required role', () => {
    const guard = new RolesGuard({ getAllAndOverride: () => [AdminRole.SUPER_ADMIN] });
    const context = { getHandler: () => ({}), getClass: () => ({}), switchToHttp: () => ({ getRequest: () => ({ admin: { role: 'ADMIN' } }) }) };
    assert.throws(() => guard.canActivate(context), ForbiddenException);
    assert.equal(guard.canActivate({ ...context, switchToHttp: () => ({ getRequest: () => ({ admin: { role: 'SUPER_ADMIN' } }) }) }), true);
  });

  await t.test('login attempt limit returns 429 with retry information', async () => {
    for (let attempt = 0; attempt < 1; attempt += 1) {
      const response = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: `unknown${attempt}@example.test`, password: 'not-a-valid-admin-password' }) });
      assert.equal(response.status, 401);
    }
    const blocked = await request('/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: admin.email, password: 'test-admin-password' }) });
    assert.equal(blocked.status, 429);
    assert.ok(Number(blocked.headers.get('retry-after')) > 0);
  });
});
