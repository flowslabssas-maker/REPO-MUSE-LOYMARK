(() => {
  const apply = theme => { document.documentElement.dataset.museTheme = theme === 'dark' ? 'dark' : 'light'; };
  try { apply(localStorage.getItem('museHeroTheme')); } catch { apply('light'); }
  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent) return;
    if (event.data?.type === 'muse-theme') apply(event.data.theme);
  });
})();
