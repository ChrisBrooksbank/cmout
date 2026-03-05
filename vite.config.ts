import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tsconfigPaths from 'vite-tsconfig-paths';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tsconfigPaths(),
    VitePWA({
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      registerType: 'autoUpdate',
      manifest: false, // manifest.json is hand-authored in public/
      injectManifest: {
        // Exclude large WASM files (e.g. from @huggingface/transformers) from precache
        globIgnores: ['**/*.wasm'],
      },
    }),
  ],
  publicDir: 'public',
  build: {
    outDir: 'build',
  },
});
