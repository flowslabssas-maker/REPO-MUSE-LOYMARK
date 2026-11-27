import { test } from 'node:test';
import assert from 'node:assert/strict';
import auth from '../api/auth.js';
import { allowed, createSession, directAllowed } from '../api/_auth.js';
import hero from '../api/hero.js';
import xiaomi from '../api/xiaomi.js';
import areaAndina from '../api/area-andina.js';

process.env.MUSE_SESSION_SECRET = 'test-only-area-andina-login-secret-32-characters';
const response = () => ({
  headers: {},
  setHeader(key, value) { this.headers[key] = value; },
  status(code) { this.code = code; return this; },
  json(body) { this.body = body; return this; },
  send(body) { return this.json(body); },
});

test('OTP verification authorizes only Área Andina for both exact emails', async (t) => {
  const emails = ['svelandia15@areandina.edu.co', 'ngomez123@areandina.edu.co'];
  process.env.HERO_DIRECT_DOMAINS = 'hmclcolombia.com,areandina.edu.co';
  for (const email of emails) assert.equal(directAllowed(email), false);
  delete process.env.HERO_DIRECT_DOMAINS;
  assert.equal(allowed('other@areandina.edu.co'), false);
  let reply = { result: 'success' };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://muse-l81e.onrender.com/api/analysis/otp/verify');
    const body = JSON.parse(options.body);
    assert.ok(emails.includes(body.email));
    assert.equal(body.portal, 'loymark-area-andina');
    return Response.json(reply);
  });
  for (const email of emails) {
    const input = { method: 'POST', url: '/api/auth?action=verify', headers: { host: 'localhost' }, body: { email: email.toUpperCase(), code: '1234' } };
    reply = { result: 'success' };
    const unscoped = response();
    await auth(input, unscoped);
    assert.equal(unscoped.code, 401);
    assert.equal(unscoped.headers['Set-Cookie'], undefined);

    reply = { result: 'success', portal: 'loymark-area-andina' };
    const login = response();
    await auth(input, login);
    assert.equal(login.code, 200);
    const request = { method: 'GET', url: '/api/auth?action=me', headers: { cookie: login.headers['Set-Cookie'] }, query: {} };
    const me = response();
    await auth(request, me);
    assert.deepEqual(me.body.clients, ['area-andina']);
    for (const [handler, status] of [[areaAndina, 200], [hero, 403], [xiaomi, 403]]) {
      const result = response();
      await handler(request, result);
      assert.equal(result.code, status);
    }
    const direct = response();
    await auth({ ...request, headers: { cookie: 'muse_hero_session=' + createSession(email, 'direct') } }, direct);
    assert.equal(direct.code, 401);
  }
});
