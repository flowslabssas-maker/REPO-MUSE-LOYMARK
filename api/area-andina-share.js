import { readFile } from 'node:fs/promises';
import { join } from 'node:path';


export default async function handler(request, response) {
  response.setHeader('Cache-Control', 'private, no-store, max-age=0');
  response.setHeader('X-Content-Type-Options', 'nosniff');
  if (request.method !== 'GET') return response.status(405).send('Método no permitido');
  const {token} = JSON.parse(await readFile(join(process.cwd(), 'private', 'area-andina-share.json'), 'utf8'));
  if (request.query?.token !== token) return response.status(404).send('Enlace no disponible');
  response.setHeader('X-Robots-Tag', 'noindex, nofollow');
  response.setHeader('Referrer-Policy', 'no-referrer');
  const asset = request.query?.asset;
  if (asset !== undefined && (typeof asset !== 'string' || !/^[a-f0-9]{64}\.(png|jpg|webp|gif|svg)$/.test(asset))) return response.status(400).send('Imagen inválida');
  try {
    if (asset) {
      const types = { png: 'image/png', jpg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif', svg: 'image/svg+xml' };
      const bytes = await readFile(join(process.cwd(), 'private', 'area-andina-assets', asset));
      response.setHeader('Content-Type', types[asset.split('.').pop()]);
      return response.status(200).send(bytes);
    }
    const html = await readFile(join(process.cwd(), 'private', 'area-andina.html'), 'utf8');
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    const shared = html.replaceAll('/api/area-andina?asset=', '/api/area-andina-share?token=' + token + '&asset=');
    return response.status(200).send(shared.replace('</head>', '<link rel="stylesheet" href="/area-andina-theme.css"><script src="/area-andina-theme.js"></script><script defer src="/area-andina-share.js"></script></head>'));
  } catch {
    return response.status(asset ? 404 : 500).send(asset ? 'Imagen no encontrada' : 'No se pudo cargar Área Andina');
  }
}
