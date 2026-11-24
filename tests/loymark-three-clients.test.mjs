import test from 'node:test';
import assert from 'node:assert/strict';
import {createHmac} from 'node:crypto';
import {allowed, clientsForEmail, canAccessClient, createSession, directAllowed} from '../api/_auth.js';
import auth from '../api/auth.js';
import hero from '../api/hero.js';
import xiaomi from '../api/xiaomi.js';
import areaAndina from '../api/area-andina.js';
process.env.MUSE_SESSION_SECRET='test-only-loymark-three-clients-secret-32-characters';
const emails=['jairo.fandino@loymark.com','maria.garcia@mergeto.co','santiago.valencia@loymark.com','santiago.barrera@loymark.com'];
const clients=['hero','xiaomi','area-andina'];
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(v){this.body=v;return this},send(v){this.body=v;return this}});
const req=token=>({method:'GET',url:'/api/auth?action=me',headers:{host:'localhost',cookie:token?'muse_hero_session='+token:''},query:{}});

test('four named accounts see and can open all three clients, including existing sessions',async()=>{
 for(const email of emails){
  assert(allowed(email));assert.deepEqual(clientsForEmail(email.toUpperCase()),clients);
  const request=req(createSession(email,'otp'));const me=response();await auth(request,me);
  assert.equal(me.code,200);assert.deepEqual(me.body.clients,clients);assert.equal(me.headers['Cache-Control'],'no-store');
  for(const route of [hero,xiaomi,areaAndina]){const r=response();await route(request,r);assert.equal(r.code,200,email);}
 }
 assert.equal(directAllowed('santiago.barrera@loymark.com'),false);
});

test('anonymous, tampered and expired sessions cannot open any protected dashboard',async()=>{
 const token=createSession(emails[0],'otp');
 const payload=Buffer.from(JSON.stringify({email:emails[0],mode:'otp',exp:Date.now()-1000})).toString('base64url');
 const expired=payload+'.'+createHmac('sha256',process.env.MUSE_SESSION_SECRET).update(payload).digest('base64url');
 for(const value of ['',token+'x',expired]){
  const request=req(value),me=response();await auth(request,me);assert.equal(me.code,401);
  for(const route of [hero,xiaomi,areaAndina]){const r=response();await route(request,r);assert.equal(r.code,401);}
 }
});

test('other accounts retain their previous isolation',async()=>{
 assert.equal(allowed('unknown@loymark.com'),false);
 assert.deepEqual(clientsForEmail('person@xiaomi.com'),['xiaomi']);
 assert.deepEqual(clientsForEmail('person@hmclcolombia.com'),['hero']);
 assert.deepEqual(clientsForEmail('daniela.hernandez@loymark.com'),['hero','xiaomi']);
 for(const email of ['person@xiaomi.com','person@hmclcolombia.com','daniela.hernandez@loymark.com']){
  assert.equal(canAccessClient({email},'area-andina'),false);
  const r=response();await areaAndina(req(createSession(email,'otp')),r);assert.equal(r.code,403);
 }
});
