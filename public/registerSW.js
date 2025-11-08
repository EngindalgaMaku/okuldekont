// Service Worker Registration Script
if ('serviceWorker' in navigator) {
  window.addEventListener('load', function() {
    navigator.serviceWorker.register('/sw.js').then(async function(registration) {
      console.log('ServiceWorker registration successful with scope: ', registration.scope);

      // Runtime guard: if Next.js app-build-manifest is missing on this deployment,
      // the old SW precache may cause bad-precaching-response errors. Detect and self-heal.
      try {
        const res = await fetch('/_next/app-build-manifest.json', { cache: 'no-store' });
        if (!res.ok && res.status === 404) {
          console.warn('SW Guard: app-build-manifest.json not found (404). Unregistering stale service worker to prevent precache errors.');
          await registration.unregister();
          // Also try to unregister any remaining registrations
          const regs = await navigator.serviceWorker.getRegistrations();
          await Promise.all(regs.map(r => r.unregister().catch(() => {})));
          // Reload once to ensure a clean state without the stale service worker
          setTimeout(() => location.reload(), 250);
        }
      } catch (e) {
        // Non-fatal; keep working even if this probe fails
        console.debug('SW Guard check failed:', e && e.message ? e.message : e);
      }
    }, function(err) {
      console.error('ServiceWorker registration failed: ', err);
    });
  });
}
