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
});
