import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('src/sw.ts', () => {
  async function loadSW(): Promise<string> {
    return readFile(join(process.cwd(), 'src', 'sw.ts'), 'utf-8');
  }

  it('exists', async () => {
    await expect(loadSW()).resolves.toBeTruthy();
  });

  it('references workbox-core clientsClaim', async () => {
    const src = await loadSW();
    expect(src).toContain('clientsClaim');
    expect(src).toContain('workbox-core');
  });

  it('references workbox-precaching precacheAndRoute', async () => {
    const src = await loadSW();
    expect(src).toContain('precacheAndRoute');
    expect(src).toContain('workbox-precaching');
  });

  it('uses self.__WB_MANIFEST injection point', async () => {
    const src = await loadSW();
    expect(src).toContain('self.__WB_MANIFEST');
  });

  it('declares ServiceWorkerGlobalScope for self', async () => {
    const src = await loadSW();
    expect(src).toContain('ServiceWorkerGlobalScope');
  });

  it('registers a route for events.json', async () => {
    const src = await loadSW();
    expect(src).toContain('registerRoute');
    expect(src).toContain('workbox-routing');
    expect(src).toContain('events.json');
  });

  it('uses StaleWhileRevalidate strategy', async () => {
    const src = await loadSW();
    expect(src).toContain('StaleWhileRevalidate');
    expect(src).toContain('workbox-strategies');
  });

  it('uses a named cache for event data', async () => {
    const src = await loadSW();
    expect(src).toContain('events-data');
  });

  it('uses CacheableResponsePlugin', async () => {
    const src = await loadSW();
    expect(src).toContain('CacheableResponsePlugin');
    expect(src).toContain('workbox-cacheable-response');
  });

  it('listens for the sync event', async () => {
    const src = await loadSW();
    expect(src).toContain("addEventListener('sync'");
  });

  it('handles sync-events tag', async () => {
    const src = await loadSW();
    expect(src).toContain('sync-events');
  });

  it('re-fetches events.json on sync', async () => {
    const src = await loadSW();
    expect(src).toContain("fetch('/events.json')");
  });

  it('puts fresh response into events-data cache on sync', async () => {
    const src = await loadSW();
    expect(src).toContain("caches.open('events-data')");
    expect(src).toContain('cache.put');
  });

  it('listens for the push event', async () => {
    const src = await loadSW();
    expect(src).toContain("addEventListener('push'");
  });

  it('calls showNotification with title and options', async () => {
    const src = await loadSW();
    expect(src).toContain('showNotification');
    expect(src).toContain('event.waitUntil');
  });

  it('falls back to default title when push data is missing', async () => {
    const src = await loadSW();
    expect(src).toContain('New event in Chelmsford');
  });

  it('includes icon in notification options', async () => {
    const src = await loadSW();
    expect(src).toContain('icon');
    expect(src).toContain('/icons/icon-192.png');
  });

  it('includes event url in notification data', async () => {
    const src = await loadSW();
    expect(src).toContain('data.url');
    expect(src).toContain('data: { url:');
  });

  it('listens for the notificationclick event', async () => {
    const src = await loadSW();
    expect(src).toContain("addEventListener('notificationclick'");
  });

  it('closes the notification on click', async () => {
    const src = await loadSW();
    expect(src).toContain('event.notification.close()');
  });

  it('reads the url from notification data on click', async () => {
    const src = await loadSW();
    expect(src).toContain('event.notification.data?.url');
  });

  it('uses clients.matchAll to find existing windows', async () => {
    const src = await loadSW();
    expect(src).toContain('.matchAll(');
    expect(src).toContain("type: 'window'");
  });

  it('focuses an existing client window when available', async () => {
    const src = await loadSW();
    expect(src).toContain('client.focus()');
  });

  it('opens a new window when no existing client matches', async () => {
    const src = await loadSW();
    expect(src).toContain('clients.openWindow');
    expect(src).toContain('openWindow(url)');
  });
});

describe('vite.config.ts', () => {
  async function loadConfig(): Promise<string> {
    return readFile(join(process.cwd(), 'vite.config.ts'), 'utf-8');
  }

  it('imports VitePWA from vite-plugin-pwa', async () => {
    const src = await loadConfig();
    expect(src).toContain('vite-plugin-pwa');
    expect(src).toContain('VitePWA');
  });

  it('uses injectManifest strategy', async () => {
    const src = await loadConfig();
    expect(src).toContain("strategies: 'injectManifest'");
  });

  it('points to src/sw.ts as the service worker source', async () => {
    const src = await loadConfig();
    expect(src).toContain("srcDir: 'src'");
    expect(src).toContain("filename: 'sw.ts'");
  });
});

describe('src/main.tsx', () => {
  async function loadMain(): Promise<string> {
    return readFile(join(process.cwd(), 'src', 'main.tsx'), 'utf-8');
  }

  it('imports registerSW from virtual:pwa-register', async () => {
    const src = await loadMain();
    expect(src).toContain('registerSW');
    expect(src).toContain('virtual:pwa-register');
  });

  it('calls registerSW', async () => {
    const src = await loadMain();
    expect(src).toContain('registerSW(');
  });

  it('listens for online event to register background sync', async () => {
    const src = await loadMain();
    expect(src).toContain("addEventListener('online'");
    expect(src).toContain('navigator.serviceWorker.ready');
    expect(src).toContain("register('sync-events')");
  });
});
