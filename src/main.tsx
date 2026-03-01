import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerSW } from 'virtual:pwa-register';

// Register service worker — auto-updates when a new version is available
registerSW({ immediate: true });

// Background sync: when connectivity is restored, queue a sync so the SW
// re-fetches events.json and updates the cache with the latest data.
window.addEventListener('online', () => {
  navigator.serviceWorker.ready
    .then(registration => {
      if ('sync' in registration) {
        (
          registration as ServiceWorkerRegistration & {
            sync: { register(tag: string): Promise<void> };
          }
        ).sync
          .register('sync-events')
          .catch(() => {
            // Background Sync API not supported — silently ignore
          });
      }
    })
    .catch(() => {});
});

const root = document.getElementById('root');
if (!root) throw new Error('Root element #root not found');

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
