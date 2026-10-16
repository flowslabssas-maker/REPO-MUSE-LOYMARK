import { writeFile } from 'node:fs/promises';
import { createDecipheriv } from 'node:crypto';

// Run locally with server credentials. Never publish this exporter or its output.
const base = process.env.HERO_AUDIT_SUPABASE_URL;
const serviceKey = process.env.HERO_AUDIT_SERVICE_KEY;
const key = Buffer.from(process.env.HERO_AUDIT_ENCRYPTION_KEY || '', 'base64');
const output = process.argv[2];
if (!base || !serviceKey || key.length !== 32 || !output) {
  throw new Error('Set HERO_AUDIT_* server variables and provide a private output CSV path');
}
const entries = [];
let invalid = 0;
for (let offset = 0;; offset += 1000) {
  const url = `${base}/rest/v1/user_activities?select=id,action_type,action_details,created_at&action_type=eq.HERO_DASHBOARD_OPEN&order=created_at.asc,id.asc&offset=${offset}&limit=1000`;
  const response = await fetch(url, {headers:{apikey:serviceKey,Authorization:`Bearer ${serviceKey}`}});
  if(!response.ok) throw new Error(`Audit query failed: ${response.status}`);
  const rows = await response.json();
  for (const row of rows) {
    try {
      const sealed = row.action_details.sealed;
      const decipher = createDecipheriv('aes-256-gcm',key,Buffer.from(sealed.iv,'base64'));
      decipher.setAAD(Buffer.from(`HERO_DASHBOARD_OPEN:${row.id}`));
      decipher.setAuthTag(Buffer.from(sealed.tag,'base64'));
      const clear = Buffer.concat([decipher.update(Buffer.from(sealed.data,'base64')),decipher.final()]);
      entries.push(JSON.parse(clear.toString('utf8')));
    } catch { invalid++; }
  }
  if(rows.length < 1000) break;
}
const cell = value => `"${String(value ?? '').replace(/^[=+@-]/, "'$&").replace(/"/g,'""')}"`;
const lines = [['Correo','Fecha UTC','Fecha Colombia','Dominio','Tipo de acceso','Correo verificado','Sesión'], ...entries.map(e=>[
  e.email,e.openedAt,new Date(e.openedAt).toLocaleString('es-CO',{timeZone:'America/Bogota',hour12:false}),e.host,e.accessMethod,e.emailVerified ? 'Sí':'No',e.sessionRef
])];
await writeFile(output, '\ufeff' + lines.map(row=>row.map(cell).join(',')).join('\r\n'),'utf8');
console.log(JSON.stringify({exported:entries.length,unreadable:invalid,output}));
