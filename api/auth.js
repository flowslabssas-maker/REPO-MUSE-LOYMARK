import { allowed, clearCookie, createSession, directAllowed, museOtp, normalizeEmail, readSession, secretReady, sessionCookie } from './_auth.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'no-store');
  if (!secretReady()) return response.status(503).json({ error: 'El acceso de MUSE aún no está configurado.' });

  const action = new URL(request.url, `https://${request.headers.host || 'localhost'}`).searchParams.get('action');
  if (request.method === 'GET' && action === 'me') {
    const session = readSession(request);
    return session ? response.status(200).json({ email: session.email }) : response.status(401).json({ error: 'Sesión no iniciada.' });
  }
  if (request.method !== 'POST') return response.status(405).json({ error: 'Método no permitido.' });
  const origin = request.headers.origin;
  if (origin && new URL(origin).host !== request.headers.host) return response.status(403).json({ error: 'Origen no permitido.' });
  if (action === 'logout') {
    response.setHeader('Set-Cookie', clearCookie());
    return response.status(200).json({ ok: true });
  }

  const email = normalizeEmail(request.body?.email);
  if (!allowed(email)) return response.status(403).json({ error: 'Correo no autorizado para HERO.' });
  try {
    if (action === 'enter' && directAllowed(email)) {
      response.setHeader('Set-Cookie', sessionCookie(createSession(email)));
      return response.status(200).json({ ok: true, mode: 'direct', email });
    }
    if (action === 'send' || action === 'enter') {
      const result = await museOtp('send', { email, name: email.split('@')[0], department: 'CLIENT', area: 'HERO', archetype: 'Hermes' });
      return result.result === 'success'
        ? response.status(200).json({ ok: true, mode: 'code' })
        : response.status(502).json({ error: 'No se pudo enviar el código.' });
    }
    if (action === 'verify') {
      const code = String(request.body?.code || '').trim();
      if (!/^\d{4,8}$/.test(code)) return response.status(400).json({ error: 'Código inválido.' });
      const result = await museOtp('verify', { email, code });
      if (result.result !== 'success') return response.status(401).json({ error: 'Código incorrecto o vencido.' });
      response.setHeader('Set-Cookie', sessionCookie(createSession(email)));
      return response.status(200).json({ ok: true, email });
    }
    return response.status(404).json({ error: 'Acción desconocida.' });
  } catch {
    return response.status(502).json({ error: 'No se pudo conectar con el acceso de MUSE. Intenta de nuevo.' });
  }
}
