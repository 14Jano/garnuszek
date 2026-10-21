import { readFileSync } from 'node:fs';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import { defineConfig } from 'vitest/config';

// GitHub Pages serves a project site from /<repo-name>/, so the deploy workflow
// passes the base path in. Locally the app lives at the root.
const base = process.env.VITE_BASE_PATH ?? '/';

// Shown on the settings screen, so the version cannot drift from package.json.
const { version } = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8'));

export default defineConfig({
  base,
  define: {
    __APP_VERSION__: JSON.stringify(version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Garnuszek – planer posiłków dla rodziny',
        short_name: 'Garnuszek',
        description:
          'Darmowy planer posiłków dla całej rodziny. Bez konta, a dane zostają na Twoim urządzeniu.',
        lang: 'pl',
        display: 'standalone',
        background_color: '#fbf7f0',
        theme_color: '#276b43',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
    }),
  ],
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
  },
});
