(() => {
  if (window.__museImageLightboxReady) return;
  window.__museImageLightboxReady = true;

  const selector = [
    'img[data-lightbox]',
    '.thumb:not(.vac)',
    '.pthumb',
    '.print',
    '.thm',
    '.case-th img',
    '.igc img',
    '.case .thumbs img',
    '.pc .im > img',
    'img.mini',
  ].join(',');

  const style = document.createElement('style');
  style.textContent = `
    ${selector}{cursor:zoom-in}
    #muse-image-lightbox{position:fixed;inset:0;z-index:2147483647;display:grid;place-items:center;padding:28px;background:rgba(4,12,24,.9);backdrop-filter:blur(8px)}
    #muse-image-lightbox[hidden]{display:none}
    #muse-image-lightbox img{display:block;max-width:min(94vw,1500px);max-height:88vh;width:auto;height:auto;object-fit:contain;border-radius:12px;background:#fff;box-shadow:0 28px 90px rgba(0,0,0,.55)}
    #muse-image-lightbox button{position:absolute;top:18px;right:18px;width:42px;height:42px;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(7,91,155,.95);color:#fff;font:700 24px/1 system-ui;cursor:pointer;display:grid;place-items:center;box-shadow:0 10px 30px rgba(0,0,0,.35)}
    #muse-image-lightbox .muse-lightbox-help{position:absolute;bottom:14px;left:50%;transform:translateX(-50%);color:rgba(255,255,255,.78);font:600 11px/1.3 system-ui;letter-spacing:.04em;text-align:center}
    @media(max-width:640px){#muse-image-lightbox{padding:16px}#muse-image-lightbox img{max-width:96vw;max-height:84vh}}
  `;
  document.head.appendChild(style);

  const lightbox = document.createElement('div');
  lightbox.id = 'muse-image-lightbox';
  lightbox.hidden = true;
  lightbox.setAttribute('role', 'dialog');
  lightbox.setAttribute('aria-modal', 'true');
  lightbox.setAttribute('aria-label', 'Vista ampliada de imagen');
  lightbox.innerHTML = '<button type="button" aria-label="Cerrar imagen">×</button><img alt=""><div class="muse-lightbox-help">Clic fuera de la imagen o Escape para cerrar</div>';
  document.body.appendChild(lightbox);

  const largeImage = lightbox.querySelector('img');
  let previousFocus = null;
  const close = () => {
    lightbox.hidden = true;
    document.documentElement.style.overflow = '';
    previousFocus?.focus?.();
  };
  const open = image => {
    previousFocus = image;
    largeImage.src = image.currentSrc || image.src;
    largeImage.alt = image.alt || 'Imagen ampliada';
    lightbox.hidden = false;
    document.documentElement.style.overflow = 'hidden';
    lightbox.querySelector('button').focus();
  };

  document.addEventListener('click', event => {
    const image = event.target.closest?.(selector);
    if (!image || lightbox.contains(image)) return;
    event.preventDefault();
    event.stopPropagation();
    open(image);
  }, true);
  lightbox.addEventListener('click', event => {
    if (event.target === lightbox || event.target.closest('button')) close();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !lightbox.hidden) close();
  });
})();
