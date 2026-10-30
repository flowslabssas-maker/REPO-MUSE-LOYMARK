import test from 'node:test';
import assert from 'node:assert/strict';
import { allowed, clientsForEmail, directAllowed, createSession } from '../api/_auth.js';
import hero from '../api/hero.js';
import xiaomi from '../api/xiaomi.js';
process.env.MUSE_SESSION_SECRET='test-only-xiaomi-domain-secret-longer-than-32';
const response=()=>({setHeader(){},status(n){this.code=n;return this},send(v){this.body=v;return this}});
test('exact Xiaomi domain is OTP-only and isolated from HERO',async()=>{
  for(const email of ['person@xiaomi.com','PERSON@XIAOMI.COM']) {
    assert(allowed(email)); assert.deepEqual(clientsForEmail(email),['xiaomi']); assert.equal(directAllowed(email),false);
    const req={method:'GET',headers:{cookie:'muse_hero_session='+createSession(email,'otp')},query:{}};
    const h=response();await hero(req,h);assert.equal(h.code,403);
    const x=response();await xiaomi(req,x);assert.equal(x.code,200);
  }
  for(const email of ['person@xiaomi.com.evil.test','person@sub.xiaomi.com','person@@xiaomi.com']) assert.equal(allowed(email),false);
  assert.deepEqual(clientsForEmail('person@hmclcolombia.com'),['hero']);
  assert.deepEqual(clientsForEmail('diegodimon1902@gmail.com'),['hero','xiaomi']);
});
