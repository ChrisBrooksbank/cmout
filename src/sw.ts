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
