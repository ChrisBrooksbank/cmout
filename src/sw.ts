/// <reference lib="webworker" />
import { clientsClaim } from 'workbox-core';
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope;

// Take control of all clients immediately when a new SW activates
clientsClaim();

// Precache and serve app shell assets (injected by vite-plugin-pwa at build time)
// In dev mode this list will be empty; the array is populated during `vite build`
precacheAndRoute(self.__WB_MANIFEST);
