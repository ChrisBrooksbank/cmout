import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';

describe('public/manifest.json', () => {
  async function loadManifest(): Promise<Record<string, unknown>> {
    const filePath = join(process.cwd(), 'public', 'manifest.json');
    const raw = await readFile(filePath, 'utf-8');
    return JSON.parse(raw) as Record<string, unknown>;
  }

  it('is valid JSON', async () => {
    await expect(loadManifest()).resolves.toBeDefined();
  });

  it('has required name fields', async () => {
    const manifest = await loadManifest();
    expect(manifest.name).toBe('CmOut — Chelmsford Events');
    expect(manifest.short_name).toBe('CmOut');
  });

  it('has standalone display mode', async () => {
    const manifest = await loadManifest();
    expect(manifest.display).toBe('standalone');
  });

  it('has correct theme and background colour', async () => {
    const manifest = await loadManifest();
    expect(manifest.theme_color).toBe('#1a1a2e');
    expect(manifest.background_color).toBe('#1a1a2e');
  });

  it('has start_url set to /', async () => {
    const manifest = await loadManifest();
    expect(manifest.start_url).toBe('/');
  });

  it('has at least two icons (192 and 512)', async () => {
    const manifest = await loadManifest();
    const icons = manifest.icons as Array<{ src: string; sizes: string; type: string }>;
    expect(Array.isArray(icons)).toBe(true);
    expect(icons.length).toBeGreaterThanOrEqual(2);
    const sizes = icons.map(i => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  it('all icons have src, sizes and type', async () => {
    const manifest = await loadManifest();
    const icons = manifest.icons as Array<{ src: string; sizes: string; type: string }>;
    for (const icon of icons) {
      expect(icon.src).toBeTruthy();
      expect(icon.sizes).toBeTruthy();
      expect(icon.type).toBeTruthy();
    }
  });

  it('has lang set to en-GB', async () => {
    const manifest = await loadManifest();
    expect(manifest.lang).toBe('en-GB');
  });
});
