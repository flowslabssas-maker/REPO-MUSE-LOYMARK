import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import handler from '../api/xiaomi.js';
import { createSession } from '../api/_auth.js';
process.env.MUSE_SESSION_SECRET='test-only-xiaomi-secret-with-more-than-32-characters';
process.env.HERO_DIRECT_EMAILS='qa@example.test';
const response=()=>({headers:{},setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},send(v){this.body=v;return this}});
const request=(query={},auth=true)=>({method:'GET',query,headers:{cookie:auth?'muse_hero_session='+createSession('qa@example.test','direct'):''}});
test('Xiaomi HTML and images require an existing valid session',async()=>{
  for(const query of [{},{asset:'a'.repeat(64)+'.png'}]){const r=response();await handler(request(query,false),r);assert.equal(r.code,401)}
});
test('Xiaomi retains source images losslessly and rejects traversal',async()=>{
  const r=response();await handler(request(),r);assert.equal(r.code,200);assert.match(r.body,/Social Listening Xiaomi/);assert(Buffer.byteLength(r.body)<4_500_000);
  const names=await readdir('private/xiaomi-assets');assert(names.length>1000);
  const img=response();await handler(request({asset:names[0]}),img);assert.equal(img.code,200);assert.deepEqual(img.body,await readFile('private/xiaomi-assets/'+names[0]));
  const bad=response();await handler(request({asset:'../../.env'}),bad);assert.equal(bad.code,400);
});
