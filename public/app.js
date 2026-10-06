const app = document.getElementById('app');
let currentEmail = '';
let stopStars = () => {};

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

function stars(canvas) {
  const context = canvas.getContext('2d');
  const particles = Array.from({ length: 2200 }, () => ({
    x: Math.random(), y: Math.random(), radius: Math.random() > .94 ? 2 + Math.random() * 3 : .35 + Math.random() * 1.5,
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
      const alpha = .18 + .6 * (.5 + .5 * Math.sin(time * .001 * star.speed + star.phase));
      context.fillStyle = star.gold ? `rgba(255,208,35,${alpha})` : `rgba(255,255,255,${alpha})`;
      if (star.radius > 2) { context.shadowBlur = 9; context.shadowColor = star.gold ? '#f5bd11' : '#fff'; }
      else context.shadowBlur = 0;
      context.beginPath(); context.arc(star.x * width, star.y * height, star.radius, 0, Math.PI * 2); context.fill();
    }
    frame = requestAnimationFrame(draw);
  };
  frame = requestAnimationFrame(draw);
  return () => { active = false; cancelAnimationFrame(frame); window.removeEventListener('resize', resize); };
}

function background(formMode) {
  stopStars();
  app.className = '';
  app.innerHTML = `<section class="login ${formMode ? 'is-form' : ''}">
    <canvas class="login-stars" aria-hidden="true"></canvas>
    <img class="muse-figure" src="/assets/muse_lineart.png" alt="" aria-hidden="true">
    <img class="muse-entry-logo" src="/assets/muse-blanco.png" alt="MUSE">
    <div id="login-content"></div>
    <footer class="muse-footer"><span>MUSE V.2.5 // CORE ENGINE</span><strong>DESARROLLADO POR FLOWSLABS © 2026</strong></footer>
  </section>`;
  stopStars = stars(app.querySelector('canvas'));
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
  stopStars(); app.className = '';
  app.innerHTML = `<div class="shell"><header class="top"><div class="brand"><img src="/assets/muse-blanco.png" alt="MUSE"><span class="brand-divider"></span><strong>HERO</strong></div><div class="top-user"><span>${escapeHtml(email)}</span><button id="logout" class="signout">Cerrar sesión</button></div></header><div class="layout"><aside><img class="hero-logo" src="/assets/hero.png" alt="HERO"><div class="aside-title">NAVEGACIÓN</div><button class="nav">Dashboard HERO<small>Radar de mercado y motocicletas</small></button><div class="scope">MUSE · Social Media Intelligence<br>Entorno exclusivo de HERO</div></aside><main><div class="page-head"><div class="eyebrow">MUSE · INTELIGENCIA DE MERCADO</div><h1>Dashboard Estratégico · HERO</h1><p>Mercado, marcas, vehículos y conversación en un solo lugar.</p></div><div class="frame-wrap"><iframe title="Dashboard HERO Motos" src="/api/hero" loading="eager"></iframe></div></main></div></div>`;
  document.getElementById('logout').addEventListener('click', async () => { await api('logout', 'POST').catch(() => {}); currentEmail = ''; intro(); });
}

api('me').then(({ email }) => dashboard(email)).catch(() => intro());
