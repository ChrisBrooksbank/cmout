/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

// SyncEvent is part of the Background Sync API — not yet in the TS webworker lib
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Skip waiting so a newly installed SW activates immediately (don't wait for tabs to close)
self.skipWaiting();
// Take control of all clients immediately when a new SW activates
clientsClaim();

// Precache and serve app shell assets (injected by vite-plugin-pwa at build time)
// In dev mode this list will be empty; the array is populated during `vite build`
precacheAndRoute(self.__WB_MANIFEST);

// Cache events.json with stale-while-revalidate: serve cached data immediately,
// then fetch an update in the background so the next load gets fresh data.
registerRoute(
  ({ url }) => url.pathname === '/events.json',
  new StaleWhileRevalidate({
    cacheName: 'events-data',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Cache embeddings.json with the same strategy as events.json
registerRoute(
  ({ url }) => url.pathname === '/embeddings.json',
  new StaleWhileRevalidate({
    cacheName: 'events-data',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Cache ONNX model files from Hugging Face CDN so semantic search works offline
registerRoute(
  ({ url }) => url.hostname === 'cdn-lfs.huggingface.co' || url.hostname === 'huggingface.co',
  new StaleWhileRevalidate({
    cacheName: 'ml-models',
    plugins: [new CacheableResponsePlugin({ statuses: [0, 200] })],
  })
);

// Push notification handler: display a notification when a push message is received.
// The server sends JSON with { title, body, icon, url } fields.
self.addEventListener('push', event => {
  const data = event.data?.json() ?? {};
  const title: string = data.title ?? 'New event in Chelmsford';
  const options: NotificationOptions = {
    body: data.body ?? '',
    icon: data.icon ?? '/icons/icon-192.png',
    data: { url: data.url ?? '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click handler: when the user taps a notification, focus an existing
// app window on the event URL or open a new one if none is open.
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const url: string = event.notification.data?.url ?? '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(windowClients => {
      // Focus an existing window showing the same URL if possible
      for (const client of windowClients) {
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      // No matching window — open a new one
      if (self.clients.openWindow) {
        return self.clients.openWindow(url);
      }
    })
  );
});

// Background sync: re-fetch events.json when connectivity is restored.
// The client registers the 'sync-events' tag via registration.sync.register()
// when the 'online' event fires; the browser delivers the sync event here.
self.addEventListener('sync', event => {
  const syncEvent = event as SyncEvent;
  if (syncEvent.tag === 'sync-events') {
    syncEvent.waitUntil(
      fetch('/events.json')
        .then(response => {
          if (!response.ok) return;
          return caches.open('events-data').then(cache => cache.put('/events.json', response));
        })
        .catch(() => {
          // Network unavailable — browser will retry the sync automatically
        })
    );
  }
});
