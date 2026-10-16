import { createCipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';

export const AUDIT_ACTION = 'HERO_DASHBOARD_OPEN';

// Personal information is encrypted before reaching the shared activity store.
// Neither analytics nor the legacy activity endpoints receive plaintext emails.
export function createAuditRow(request, session, key, now = new Date()) {
  const encryptionKey = Buffer.from(key || '', 'base64');
  if (encryptionKey.length !== 32) throw new Error('Invalid audit encryption configuration');
  const id = randomUUID();
  const payload = {
    application: 'HERO', event: 'dashboard_open',
    email: session.email,
    openedAt: now.toISOString(),
    host: String(request.headers.host || '').slice(0, 255).toLowerCase(),
    path: '/api/hero',
    accessMethod: ['direct', 'otp'].includes(session.mode) ? session.mode : 'legacy',
    emailVerified: session.mode === 'otp',
    sessionRef: createHmac('sha256', encryptionKey).update(`${session.email}|${session.exp}`).digest('hex'),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(Buffer.from(`${AUDIT_ACTION}:${id}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return {
    id, action_type: AUDIT_ACTION, user_id: null, session_id: null,
    action_details: {
      application: 'HERO', version: 1,
      sealed: { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') },
    },
  };
}

export async function recordHeroOpen(request, session) {
  try {
    const base = process.env.HERO_AUDIT_SUPABASE_URL;
    const serviceKey = process.env.HERO_AUDIT_SERVICE_KEY;
    if (!base || !serviceKey) throw new Error('Audit storage is not configured');
    const row = createAuditRow(request, session, process.env.HERO_AUDIT_ENCRYPTION_KEY);
    // Retry with the same row ID, so a lost acknowledgement cannot double count.
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const result = await fetch(`${base}/rest/v1/user_activities?on_conflict=id`, {
          method: 'POST',
          headers: {
            apikey: serviceKey, Authorization: `Bearer ${serviceKey}`,
            'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=minimal',
          },
          body: JSON.stringify(row), signal: AbortSignal.timeout(2500),
        });
        if (result.ok) return true;
        if (result.status < 500 && result.status !== 429) break;
      } catch { /* Retry once, preserving the event ID. */ }
    }
    throw new Error('Audit persistence failed');
  } catch {
    // Availability of the existing dashboard does not depend on analytics.
    // Keep operational errors observable without logging emails or credentials.
    console.error('[hero-audit] Could not persist dashboard opening');
    return false;
  }
}
