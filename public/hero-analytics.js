(() => {
  // Count the portal and the authenticated dashboard as separate page views.
  // Identity is handled by the private access log, never by Web Analytics.
  if (window.__heroAnalyticsLoaded) return;
  window.__heroAnalyticsLoaded = true;
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };
  window.va('beforeSend', event => {
    const url = new URL(event.url, location.origin);
    url.search = '';
    url.hash = '';
    return { ...event, url: url.toString() };
  });
  const script = document.createElement('script');
  script.defer = true;
  script.src = '/_vercel/insights/script.js';
  document.head.appendChild(script);
})();
