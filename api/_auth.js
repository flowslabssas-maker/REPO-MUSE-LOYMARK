import { createHmac, timingSafeEqual } from 'node:crypto';

const COOKIE = 'muse_hero_session';
const MAX_AGE = 8 * 60 * 60;
const BACKEND = 'https://muse-l81e.onrender.com';

export function allowed(email) {
  const list = (process.env.HERO_ALLOWED_EMAILS || 'ivon.lopez@mergeto.co,maria.garcia@mergeto.co,diegodimon1902@gmail.com')
    .split(',').map(value => value.trim().toLowerCase()).filter(Boolean);
  return list.includes(String(email || '').trim().toLowerCase());
}

export function secretReady() {
  return typeof process.env.MUSE_SESSION_SECRET === 'string' && process.env.MUSE_SESSION_SECRET.length >= 32;
}

function sign(value) {
  return createHmac('sha256', process.env.MUSE_SESSION_SECRET).update(value).digest('base64url');
}

export function createSession(email) {
  if (!secretReady()) throw new Error('MUSE_SESSION_SECRET is not configured');
  const payload = Buffer.from(JSON.stringify({ email, exp: Date.now() + MAX_AGE * 1000 })).toString('base64url');
  return `${payload}.${sign(payload)}`;
}

export function readSession(request) {
  if (!secretReady()) return null;
  const cookies = String(request.headers.cookie || '').split(';').map(value => value.trim());
  const token = cookies.find(value => value.startsWith(`${COOKIE}=`))?.slice(COOKIE.length + 1);
  if (!token) return null;
  const [payload, signature, extra] = token.split('.');
  if (!payload || !signature || extra) return null;
  const expected = Buffer.from(sign(payload));
  const received = Buffer.from(signature);
  if (expected.length !== received.length || !timingSafeEqual(expected, received)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    return data.exp > Date.now() && allowed(data.email) ? data : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${MAX_AGE}`;
}

export function clearCookie() {
  return `${COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export async function museOtp(path, body) {
  const response = await fetch(`${BACKEND}/api/analysis/otp/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(45000),
  });
  if (!response.ok) throw new Error(`MUSE OTP returned ${response.status}`);
  return response.json();
}
