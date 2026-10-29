/**
 * Service Worker registration utility with automatic update detection
 */

export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((registration) => {
        // Immediately check for updates
        registration.update().catch(() => {});

        // Check for updates on load
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (!installingWorker) return;

          installingWorker.addEventListener('statechange', () => {
            if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
              console.log('🐰 Rabbit Ride update available! Reloading for latest version.');
              window.location.reload();
            }
          });
        });
      })
      .catch((error) => {
        console.warn('Service Worker registration skipped or failed:', error);
      });
  });
}
