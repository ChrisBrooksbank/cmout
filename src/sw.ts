/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';
import { registerRoute } from 'workbox-routing';
import { StaleWhileRevalidate } from 'workbox-strategies';
import { CacheableResponsePlugin } from 'workbox-cacheable-response';

declare const self: ServiceWorkerGlobalScope;

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
