// Service Worker Registration Script with safe-guard against infinite reloads
if ('serviceWorker' in navigator) {
  window.addEventListener('load', async function () {
    try {
      // If SW was disabled previously due to a manifest mismatch, don't register again
      const swDisabled = localStorage.getItem('sw:disabled') === '1';
      if (swDisabled) {
        console.warn('SW disabled by guard. Skipping registration.');
        return;
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // Guard: If Next.js manifest is missing in this deployment, unregister once and disable SW
      try {
        const res = await fetch('/_next/app-build-manifest.json', { cache: 'no-store' });
        if (!res.ok && res.status === 404) {
          console.warn(
            'SW Guard: app-build-manifest.json not found (404). Unregistering stale service worker and disabling SW.'
          );
          await registration.unregister();
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map((r) => r.unregister().catch(() => {})));
          // Set a flag so we do this only once and avoid infinite reload loops
          localStorage.setItem('sw:disabled', '1');
          // Reload once to ensure a clean state without the stale SW
          setTimeout(() => location.reload(), 250);
        }
      } catch (e) {
        console.debug('SW Guard check failed:', e && e.message ? e.message : e);
      }
    } catch (err) {
      console.error('ServiceWorker registration failed: ', err);
    }
  });
}
