import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readSession, secretReady } from './_auth.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  if (request.method !== 'GET') return response.status(405).send('Método no permitido');
  if (!secretReady()) return response.status(503).send('MUSE no está configurado');
  if (!readSession(request)) return response.status(401).send('Inicia sesión para ver HERO');
  try {
    const html = await readFile(join(process.cwd(), 'private', 'hero-motos.html'), 'utf8');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(html);
  } catch {
    return response.status(500).send('No se pudo cargar el dashboard HERO');
  }
}
