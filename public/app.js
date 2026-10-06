const app = document.getElementById('app');
let currentEmail = '';
let stopStars = () => {};
let stopFigure = () => {};

const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
}[char]));

async function api(action, method = 'GET', body) {
  const response = await fetch(`/api/auth?action=${action}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'same-origin',
    cache: 'no-store',
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'No se pudo completar la solicitud.');
  return data;
}

function stars(canvas, formMode = false) {
  const context = canvas.getContext('2d');
  const particles = Array.from({ length: formMode ? 500 : 4100 }, () => ({
    x: Math.random() > .28 ? .5 + (Math.random() + Math.random() + Math.random() - 1.5) * .31 : Math.random(),
    y: Math.random() > .28 ? .5 + (Math.random() + Math.random() + Math.random() - 1.5) * .43 : Math.random(),
    radius: Math.random() > .988 ? 1.6 + Math.random() * 2 : .2 + Math.random() * .9,
    gold: Math.random() > .52, phase: Math.random() * 6.3, speed: .3 + Math.random() * 1.2,
  }));
  let width = 0, height = 0, frame = 0, active = true;
  const resize = () => {
    const scale = Math.min(devicePixelRatio || 1, 2);
    width = canvas.clientWidth; height = canvas.clientHeight;
    canvas.width = Math.round(width * scale); canvas.height = Math.round(height * scale);
    context.setTransform(scale, 0, 0, scale, 0, 0);
  };
  resize(); window.addEventListener('resize', resize);
  const draw = time => {
    if (!active) return;
    context.clearRect(0, 0, width, height);
    for (const star of particles) {
      const alpha = .09 + .44 * (.5 + .5 * Math.sin(time * .0007 * star.speed + star.phase));
      context.fillStyle = star.gold ? `rgba(230,192,102,${alpha})` : `rgba(245,246,249,${alpha})`;
      if (star.radius > 1.6) { context.shadowBlur = 7; context.shadowColor = star.gold ? '#d7ab55' : '#fff'; }
      else context.shadowBlur = 0;
      const x = ((star.x + time * .00000045 * star.speed) % 1 + 1) % 1;
      const y = star.y + Math.sin(time * .00018 * star.speed + star.phase) * .005;
      context.beginPath(); context.arc(x * width, y * height, star.radius, 0, Math.PI * 2); context.fill();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
}

function weave(canvas, source) {
  const context = canvas.getContext('2d');
  if (!context) return () => {};
  const sample = document.createElement('canvas');
  sample.width = sample.height = 180;
  const sampleContext = sample.getContext('2d', { willReadFrequently: true });
  const art = document.createElement('canvas');
  art.width = art.height = 512;
  const artContext = art.getContext('2d', { willReadFrequently: true });
  let points = [], links = [], frame = 0, active = true, lastDraw = 0;
  let pointer = { x: -100, y: -100 }, parallax = { x: 0, y: 0 };
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * ratio);
    canvas.height = Math.round(canvas.clientHeight * ratio);
    context.setTransform(canvas.width / 180, 0, 0, canvas.height / 180, 0, 0);
  };
  const prepare = () => {
    artContext.drawImage(source, 0, 0, 512, 512);
    const artPixels = artContext.getImageData(0, 0, 512, 512);
    for (let i = 0; i < artPixels.data.length; i += 4) {
      const light = artPixels.data[i];
      artPixels.data[i] = 245;
      artPixels.data[i + 1] = 206;
      artPixels.data[i + 2] = 124;
      artPixels.data[i + 3] = light > 25 ? Math.min(255, light * .7) : 0;
    }
    artContext.putImageData(artPixels, 0, 0);
    sampleContext.drawImage(source, 0, 0, 180, 180);
    const pixels = sampleContext.getImageData(0, 0, 180, 180).data;
    points = [];
    const buckets = new Map();
    for (let y = 0; y < 180; y++) for (let x = 0; x < 180; x++) {
      const offset = (y * 180 + x) * 4;
      if (pixels[offset] < 70 || Math.random() < .42) continue;
      const point = { x, y, phase: Math.random() * 6.28, bright: Math.random() > .976 };
      const index = points.push(point) - 1;
      const key = `${Math.floor(x / 6)},${Math.floor(y / 6)}`;
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(index);
    }
    links = [];
    for (let index = 0; index < points.length; index++) {
      const point = points[index];
      const bx = Math.floor(point.x / 6), by = Math.floor(point.y / 6);
      const near = [];
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        for (const candidate of buckets.get(`${bx + dx},${by + dy}`) || []) {
          if (candidate <= index) continue;
          const other = points[candidate];
          const distance = (point.x - other.x) ** 2 + (point.y - other.y) ** 2;
          if (distance > 2 && distance < 36) near.push({ candidate, distance });
        }
      }
      near.sort((a, b) => a.distance - b.distance);
      for (const item of near.slice(0, 2)) links.push([index, item.candidate]);
    }
  };
  const draw = time => {
    if (!active) return;
    frame = requestAnimationFrame(draw);
    if (time - lastDraw < 32) return;
    lastDraw = time;
    context.clearRect(0, 0, 180, 180);
    const motion = time * .001;
    const sweep = (time * .022 % 220) - 20;
    const rect = canvas.getBoundingClientRect();
    const targetX = pointer.x >= 0 ? (pointer.x / rect.width - .5) * 1.2 : 0;
    const targetY = pointer.y >= 0 ? (pointer.y / rect.height - .5) * 1.2 : 0;
    parallax.x += (targetX - parallax.x) * .04;
    parallax.y += (targetY - parallax.y) * .04;
    context.save();
    context.translate(parallax.x, parallax.y + Math.sin(motion * .65) * .4);
    context.globalAlpha = .72;
    context.drawImage(art, 0, 0, 180, 180);
    context.globalAlpha = 1;
    const moved = points.map(point => ({
      x: point.x + Math.sin(motion * .72 + point.phase) * .23,
      y: point.y + Math.cos(motion * .64 + point.phase) * .23,
      bright: point.bright,
    }));
    context.lineWidth = .2;
    context.strokeStyle = 'rgba(240,199,106,.53)';
    context.beginPath();
    for (const [a, b] of links) {
      context.moveTo(moved[a].x, moved[a].y);
      context.lineTo(moved[b].x, moved[b].y);
    }
    context.stroke();
    context.lineWidth = .34;
    context.strokeStyle = 'rgba(255,228,158,.7)';
    context.shadowBlur = 3;
    context.shadowColor = '#f5c76d';
    context.beginPath();
    for (const [a, b] of links) {
      const middle = (moved[a].y + moved[b].y) / 2;
      if (Math.abs(middle - sweep) > 7) continue;
      context.moveTo(moved[a].x, moved[a].y);
      context.lineTo(moved[b].x, moved[b].y);
    }
    context.stroke();
    context.shadowBlur = 0;
    for (const point of moved) {
      const illuminated = Math.abs(point.y - sweep) < 7;
      context.fillStyle = point.bright || illuminated ? 'rgba(255,242,204,.85)' : 'rgba(239,202,126,.55)';
      context.beginPath(); context.arc(point.x, point.y, point.bright || illuminated ? .42 : .17, 0, Math.PI * 2); context.fill();
    }
    context.restore();
  };
  resize(); window.addEventListener('resize', resize);
  const onPointerMove = event => {
    const rect = canvas.getBoundingClientRect();
    pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };
  const onPointerLeave = () => { pointer = { x: -100, y: -100 }; };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerleave', onPointerLeave);
  const ready = () => { if (!active) return; prepare(); frame = requestAnimationFrame(draw); };
  if (source.complete && source.naturalWidth) ready(); else source.addEventListener('load', ready, { once: true });
  return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); window.removeEventListener('pointermove', onPointerMove); window.removeEventListener('pointerleave', onPointerLeave); source.removeEventListener('load', ready); };
}

function background(formMode) {
  stopStars();
  stopFigure();
  app.className = '';
  app.innerHTML = `<section class="login ${formMode ? 'is-form' : ''}">
    <canvas class="login-stars" aria-hidden="true"></canvas>
    <div class="muse-aura" aria-hidden="true"></div>
    <img class="muse-figure-source" src="/assets/muse_lineart.png" alt="" aria-hidden="true">
    <canvas class="muse-figure" aria-hidden="true"></canvas>
    <img class="muse-entry-logo" src="/assets/muse-blanco.png" alt="MUSE">
    <div id="login-content"></div>
    <footer class="muse-footer"><span>MUSE V.2.5 // CORE ENGINE</span><strong>DESARROLLADO POR FLOWSLABS © 2026</strong></footer>
  </section>`;
  stopStars = stars(app.querySelector('.login-stars'), formMode);
  stopFigure = formMode ? () => {} : weave(app.querySelector('.muse-figure'), app.querySelector('.muse-figure-source'));
  return document.getElementById('login-content');
}

function intro() {
  background(false).innerHTML = '<button class="enter-button" type="button">INGRESAR</button>';
  app.querySelector('.enter-button').addEventListener('click', () => form());
}

function form(step = 'email', message = '') {
  const slot = background(true);
  slot.innerHTML = `<div class="login-card">
    <div class="form-kicker">${step === 'email' ? 'IDENTIFICACIÓN REQUERIDA' : 'PROTOCOLO DE SEGURIDAD'}</div>
    ${step === 'code' ? `<div class="email-hint">Introduce el código enviado a:<b>${escapeHtml(currentEmail)}</b></div>` : ''}
    <form id="login-form">
      <input id="entry" ${step === 'email' ? 'type="email" autocomplete="email" placeholder="CORREO INSTITUCIONAL"' : 'class="code" type="text" inputmode="numeric" autocomplete="one-time-code" maxlength="4" placeholder="0 0 0 0"'} required aria-label="${step === 'email' ? 'Correo institucional' : 'Código de acceso'}">
      <button class="primary" type="submit">${step === 'email' ? 'CONTINUAR' : 'VALIDAR ACCESO'}</button>
    </form>
    <div class="form-foot"><button class="secondary" id="back" type="button">${step === 'email' ? 'CANCELAR' : 'USAR OTRO CORREO'}</button></div>
    <div id="message" class="message" role="status">${escapeHtml(message)}</div>
  </div>`;
  const input = document.getElementById('entry');
  const button = slot.querySelector('.primary');
  input.focus();
  document.getElementById('back').addEventListener('click', () => step === 'email' ? intro() : form());
  document.getElementById('login-form').addEventListener('submit', async event => {
    event.preventDefault(); button.disabled = true;
    document.getElementById('message').textContent = 'VERIFICANDO...';
    try {
      if (step === 'email') {
        currentEmail = input.value.trim().toLowerCase();
        const result = await api('enter', 'POST', { email: currentEmail });
        if (result.mode === 'direct') dashboard(currentEmail);
        else form('code', 'CÓDIGO ENVIADO A TU CORREO');
      } else {
        await api('verify', 'POST', { email: currentEmail, code: input.value.trim() });
        dashboard(currentEmail);
      }
    } catch (error) {
      document.getElementById('message').textContent = error.message;
      button.disabled = false;
    }
  });
}

function dashboard(email) {
  stopStars(); stopFigure(); app.className = '';
  app.innerHTML = `<div class="shell"><header class="top"><div class="brand"><img src="/assets/muse-blanco.png" alt="MUSE"><span class="brand-divider"></span><strong>HERO</strong></div><div class="top-user"><span>${escapeHtml(email)}</span><button id="logout" class="signout">Cerrar sesión</button></div></header><div class="layout"><aside><img class="hero-logo" src="/assets/hero.png" alt="HERO"><div class="aside-title">NAVEGACIÓN</div><button class="nav">Dashboard HERO<small>Radar de mercado y motocicletas</small></button><div class="scope">MUSE · Social Media Intelligence<br>Entorno exclusivo de HERO</div></aside><main><div class="page-head"><div class="eyebrow">MUSE · INTELIGENCIA DE MERCADO</div><h1>Dashboard Estratégico · HERO</h1><p>Mercado, marcas, vehículos y conversación en un solo lugar.</p></div><div class="frame-wrap"><iframe title="Dashboard HERO Motos" src="/api/hero" loading="eager"></iframe></div></main></div></div>`;
  document.getElementById('logout').addEventListener('click', async () => { await api('logout', 'POST').catch(() => {}); currentEmail = ''; intro(); });
}

api('me').then(({ email }) => dashboard(email)).catch(() => intro());
