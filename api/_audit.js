import { createCipheriv, createHmac, randomBytes, randomUUID } from 'node:crypto';

export const AUDIT_ACTION = 'HERO_DASHBOARD_OPEN';
export const LOGIN_ACTION = 'HERO_LOGIN_SUCCESS';
export const AUDIT_ACTIONS = [AUDIT_ACTION, LOGIN_ACTION];

// Identity remains encrypted in the private activity store, never in Web Analytics.
export function createAuditRow(request, session, key, now = new Date(), action = AUDIT_ACTION) {
  if (!AUDIT_ACTIONS.includes(action)) throw new Error('Unsupported audit event');
  const encryptionKey = Buffer.from(key || '', 'base64');
  if (encryptionKey.length !== 32) throw new Error('Invalid audit encryption configuration');
  if (!session?.email || !Number.isFinite(session.exp)) throw new Error('A valid session is required');
  const id = randomUUID();
  const payload = {
    application: 'HERO', event: action === LOGIN_ACTION ? 'login_success' : 'dashboard_open',
    email: session.email, openedAt: now.toISOString(),
    host: String(request.headers.host || '').slice(0, 255).toLowerCase(),
    path: action === LOGIN_ACTION ? '/api/auth' : '/api/hero',
    accessMethod: ['direct', 'otp'].includes(session.mode) ? session.mode : 'legacy',
    emailVerified: session.mode === 'otp',
    sessionRef: createHmac('sha256', encryptionKey).update(`${session.email}|${session.exp}`).digest('hex'),
  };
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', encryptionKey, iv);
  cipher.setAAD(Buffer.from(`${action}:${id}`));
  const data = Buffer.concat([cipher.update(JSON.stringify(payload), 'utf8'), cipher.final()]);
  return { id, action_type: action, user_id: null, session_id: null, action_details: {
    application: 'HERO', version: 1,
    sealed: { iv: iv.toString('base64'), tag: cipher.getAuthTag().toString('base64'), data: data.toString('base64') },
  } };
}

export function auditStorage() {
  const base = (process.env.HERO_AUDIT_SUPABASE_URL || '').trim().replace(/\/$/, '');
  const key = (process.env.HERO_AUDIT_SERVICE_KEY || '').trim();
  if (!base || !key || !/^https:\/\//.test(base)) throw new Error('Audit storage is not configured');
  return { base, headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' } };
}

export async function persistAuditRow(row) {
  const { base, headers } = auditStorage();
  let status = 'network', code = '';
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(`${base}/rest/v1/user_activities?on_conflict=id`, {
        method: 'POST', headers: { ...headers, Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(row), signal: AbortSignal.timeout(2500),
      });
      if (response.ok) return true;
      status = response.status;
      const error = await response.json().catch(() => ({}));
      code = typeof error.code === 'string' && /^[\w-]{1,30}$/.test(error.code) ? error.code : '';
      if (response.status < 500 && response.status !== 429) break;
    } catch { status = 'network'; }
    if (attempt < 2) await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
  }
  // No body, key or email is written to logs. Repeated attempts share the same ID.
  console.error('[hero-audit] Persistence failed', { event: row.action_type, status, code });
  return false;
}

async function record(request, session, action) {
  try {
    const row = createAuditRow(request, session, process.env.HERO_AUDIT_ENCRYPTION_KEY, new Date(), action);
    const stored = await persistAuditRow(row);
    if (stored) console.info('[hero-audit] Event stored', { event: action, id: row.id });
    return stored;
  } catch {
    console.error('[hero-audit] Audit configuration unavailable', { event: action });
    return false;
  }
}
export const recordHeroOpen = (request, session) => record(request, session, AUDIT_ACTION);
export const recordHeroLogin = (request, session) => record(request, session, LOGIN_ACTION);
