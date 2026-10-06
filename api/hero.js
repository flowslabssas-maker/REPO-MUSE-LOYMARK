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
    const theme = request.query?.theme === 'dark' ? 'dark' : 'light';
    const themeSupport = `<style>
html[data-muse-theme="dark"]{color-scheme:dark;--bg:#0b1020;--surface:#141d2d;--card:#111827;--line:#2b374b;--line-2:#455168;--fg:#d9e2ef;--ink:#f8fafc;--muted:#a9b8cc;--faint:#8596ae;--soft:#2b1823;--amber-ink:#ff9bad;--good-soft:#103521;--bad-soft:#3a1b25;--shadow:0 1px 3px #0005,0 8px 24px #0003}
html[data-muse-theme="dark"] .t-pub{background:#29304c;color:#c7d2fe}
html[data-muse-theme="dark"] .t-user{background:#39243d;color:#f4c9f9}
html[data-muse-theme="dark"] .t-deck{background:#362723;color:#ffd4b4}
html[data-muse-theme="dark"] .vb{background:#192338}
html[data-muse-theme="dark"] body{overflow-x:hidden}
</style><script>
document.documentElement.dataset.museTheme=${JSON.stringify(theme)};
window.addEventListener('message',function(event){if(event.origin!==location.origin||event.source!==window.parent)return;if(event.data?.type==='muse-theme'&&(event.data.theme==='dark'||event.data.theme==='light'))document.documentElement.dataset.museTheme=event.data.theme});
</script>`;
    const themedHtml = html.replace('</head>', `${themeSupport}</head>`);
    response.setHeader('Content-Type', 'text/html; charset=utf-8');
    response.setHeader('X-Content-Type-Options', 'nosniff');
    return response.status(200).send(themedHtml);
  } catch {
    return response.status(500).send('No se pudo cargar el dashboard HERO');
  }
}
