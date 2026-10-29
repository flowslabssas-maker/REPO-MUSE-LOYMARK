import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { readSession, secretReady } from './_auth.js';

export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') return response.status(405).send('Método no permitido');
  if (!secretReady()) return response.status(503).send('MUSE no está configurado');
  if (!readSession(request)) return response.status(401).send('Inicia sesión para ver Xiaomi');
  const asset = request.query?.asset;
  if (asset !== undefined && (typeof asset !== 'string' || !/^[a-f0-9]{64}\.(png|jpg|webp|gif|svg)$/.test(asset))) return response.status(400).send('Imagen inválida');
  try {
    if (asset) {
      const types = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
      const bytes = await readFile(join(process.cwd(), 'private', 'xiaomi-assets', asset));
      response.setHeader('Content-Type', types[asset.split('.').pop()]);
      return response.status(200).send(bytes);
    }
    const html = await readFile(join(process.cwd(), 'private', 'xiaomi.html'), 'utf8');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    return response.status(200).send(html);
  } catch {
    return response.status(asset ? 404 : 500).send(asset ? 'Imagen no encontrada' : 'No se pudo cargar Xiaomi');
  }
}
