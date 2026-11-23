(() => {
  const bar = document.createElement('div');
  bar.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:10px 16px;background:var(--card);color:var(--ink);border-bottom:1px solid var(--line);font:600 14px system-ui';
  const label = document.createElement('span'); label.textContent = 'MUSE Loymark | Área Andina';
  const button = document.createElement('button');button.type = 'button';button.style.cssText='padding:8px 12px;border:1px solid var(--line-2);border-radius:7px;background:var(--card);color:var(--ink);cursor:pointer';
  const update = () => { button.textContent = document.documentElement.dataset.museTheme === 'dark' ? 'Modo claro' : 'Modo oscuro'; };
  button.onclick = () => {const theme=document.documentElement.dataset.museTheme === 'dark' ? 'light' : 'dark';document.documentElement.dataset.museTheme=theme;try{localStorage.setItem('museHeroTheme',theme)}catch{}update();};
  update();bar.append(label,button);document.body.prepend(bar);
})();
