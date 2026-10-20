import test from 'node:test';
import assert from 'node:assert/strict';
import { createDecipheriv } from 'node:crypto';
import { createServer } from 'node:http';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawn } from 'node:child_process';
import { createAuditRow, persistAuditRow, AUDIT_ACTION, LOGIN_ACTION } from '../api/_audit.js';
import auth from '../api/auth.js';
import hero from '../api/hero.js';
import { createSession, sessionCookie } from '../api/_auth.js';

const key = Buffer.alloc(32, 7).toString('base64');
Object.assign(process.env, { MUSE_SESSION_SECRET: 'test-only-secret-not-used-in-production-12345', HERO_DIRECT_DOMAINS: 'example.test', HERO_DIRECT_EMAILS: 'direct@example.test', HERO_ALLOWED_EMAILS: 'otp@example.org', HERO_AUDIT_ENCRYPTION_KEY: key, HERO_AUDIT_SERVICE_KEY: 'test-only-service-key', HERO_AUDIT_SUPABASE_URL: 'https://audit.example.test' });
const session = { email: 'direct@example.test', mode: 'direct', exp: Date.now() + 60000 };
const request = (action, body = {}, method = 'POST', cookie = '') => ({ method, url: `/api/auth?action=${action}`, body, headers: { host: 'hero.example.test', origin: 'https://hero.example.test', cookie } });
const response = () => ({ headers: {}, code: 0, setHeader(k,v) { this.headers[k] = v; }, status(n) { this.code=n; return this; }, json(v) { this.body=v; return this; }, send(v) { this.body=v; return this; } });
function decrypt(row) { const s=row.action_details.sealed; const d=createDecipheriv('aes-256-gcm',Buffer.from(key,'base64'),Buffer.from(s.iv,'base64')); d.setAAD(Buffer.from(`${row.action_type}:${row.id}`)); d.setAuthTag(Buffer.from(s.tag,'base64')); return JSON.parse(Buffer.concat([d.update(Buffer.from(s.data,'base64')),d.final()]).toString()); }
const originalFetch = global.fetch;

test('encrypted login and open events preserve session correlation without cleartext identity', () => {
  const open=createAuditRow(request('me'),session,key);
  const login=createAuditRow(request('enter'),session,key,new Date(),LOGIN_ACTION);
  assert.equal(decrypt(open).event,'dashboard_open'); assert.equal(decrypt(login).event,'login_success');
  assert.equal(decrypt(open).sessionRef,decrypt(login).sessionRef); assert.notEqual(open.id,login.id);
  assert.equal(decrypt(login).emailVerified,false); assert(!JSON.stringify(login).includes(session.email));
  assert.throws(()=>decrypt({...login,action_type:AUDIT_ACTION}));
});

test('retry uses same ID, retries transient failures only and never logs identity', async () => {
  const row=createAuditRow(request('enter'),session,key); const calls=[]; const logs=[]; const oldError=console.error;
  console.error=(...args)=>logs.push(args);
  try {
    global.fetch=async (url,opts)=>{ calls.push({url,opts}); return new Response('',{status:calls.length===1?503:201}); };
    assert.equal(await persistAuditRow(row),true); assert.equal(calls.length,2);
    assert.equal(calls[0].opts.body,calls[1].opts.body); assert.match(calls[0].opts.headers.Prefer,/ignore-duplicates/);
    global.fetch=async()=>new Response(JSON.stringify({code:'42501',message:session.email}),{status:403});
    assert.equal(await persistAuditRow(row),false); assert(!JSON.stringify(logs).includes(session.email));
  } finally { global.fetch=originalFetch; console.error=oldError; }
});

test('successful direct login waits for persistence; restores and failed requests do not create logins', async () => {
  const rows=[]; let release; const gate=new Promise(resolve=>release=resolve);
  global.fetch=async (_url,opts)=>{ rows.push(JSON.parse(opts.body)); await gate; return new Response('',{status:201}); };
  try {
    const res=response(); const promise=auth(request('enter',{email:session.email}),res);
    await new Promise(resolve=>setTimeout(resolve,10)); assert.equal(res.code,0); release(); await promise;
    assert.equal(res.code,200); assert.equal(res.headers['X-Hero-Audit-Status'],'recorded');
    assert.equal(rows[0].action_type,LOGIN_ACTION); assert.equal(decrypt(rows[0]).email,session.email);
    const restored=response(); await auth(request('me',{},'GET',res.headers['Set-Cookie']),restored); assert.equal(restored.code,200);
    const denied=response(); await auth(request('enter',{email:'unauthorized@example.org'}),denied); assert.equal(denied.code,403);
    const wrong=response(); await auth(request('verify',{email:'otp@example.org',code:'bad'}),wrong); assert.equal(wrong.code,400);
    assert.equal(rows.length,1);
  } finally { global.fetch=originalFetch; }
});

test('OTP send/failure is not access; only successful verification records verified login', async () => {
  const rows=[]; let otpSuccess=false;
  global.fetch=async (url,opts)=>{
    if(url.includes('/otp/')) return Response.json({result:url.endsWith('/send')||otpSuccess?'success':'failed'});
    rows.push(JSON.parse(opts.body)); return new Response('',{status:201});
  };
  try {
    const send=response(); await auth(request('send',{email:'otp@example.org'}),send); assert.equal(send.code,200); assert.equal(rows.length,0);
    const fail=response(); await auth(request('verify',{email:'otp@example.org',code:'123456'}),fail); assert.equal(fail.code,401); assert.equal(rows.length,0);
    otpSuccess=true; const ok=response(); await auth(request('verify',{email:'otp@example.org',code:'123456'}),ok); assert.equal(ok.code,200);
    assert.equal(rows.length,1); assert.equal(decrypt(rows[0]).emailVerified,true);
  } finally { global.fetch=originalFetch; }
});

test('dashboard records authorized opens only, keeps access available if private storage fails', async () => {
  const rows=[]; let fail=false;
  global.fetch=async (_url,opts)=>{ rows.push(JSON.parse(opts.body)); return new Response('',{status:fail?403:201}); };
  try {
    const denied=response(); await hero(request('','', 'GET'),denied); assert.equal(denied.code,401); assert.equal(rows.length,0);
    const req=request('',{},'GET',sessionCookie(createSession(session.email,'direct')));
    const ok=response(); await hero(req,ok); assert.equal(ok.code,200); assert.equal(rows[0].action_type,AUDIT_ACTION); assert.equal(ok.headers['X-Hero-Audit-Status'],'recorded');
    fail=true; const degraded=response(); await hero(req,degraded); assert.equal(degraded.code,200); assert.equal(degraded.headers['X-Hero-Audit-Status'],'unavailable');
  } finally { global.fetch=originalFetch; }
});

test('private CSV exports both old dashboard and new login actions, skips unreadable rows', async () => {
  const rows=[createAuditRow(request(''),session,key),createAuditRow(request(''),{...session,mode:'otp'},key,new Date(),LOGIN_ACTION),{id:'bad',action_type:AUDIT_ACTION,action_details:{}}];
  const server=createServer((req,res)=>{ assert(req.url.includes('HERO_LOGIN_SUCCESS')); res.setHeader('Content-Type','application/json'); res.end(JSON.stringify(rows)); });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve)); const dir=await mkdtemp(join(tmpdir(),'hero-audit-test-')); const file=join(dir,'private.csv');
  try {
    const result=await new Promise((resolve,reject)=>{ const child=spawn(process.execPath,['scripts/export-hero-access.mjs',file],{env:{...process.env,HERO_AUDIT_SUPABASE_URL:`http://127.0.0.1:${server.address().port}`}}); let out='',err=''; child.stdout.on('data',s=>out+=s); child.stderr.on('data',s=>err+=s); child.on('error',reject); child.on('close',code=>resolve({code,out,err})); });
    assert.equal(result.code,0,result.err); const counts=JSON.parse(result.out); assert.equal(counts.logins,1); assert.equal(counts.opens,1); assert.equal(counts.unreadable,1); assert(!result.out.includes(session.email));
    const csv=await readFile(file,'utf8'); assert(csv.includes('Ingreso exitoso')); assert(csv.includes('Apertura de dashboard')); assert(csv.includes(session.email));
  } finally { server.close(); await rm(dir,{recursive:true,force:true}); }
});
