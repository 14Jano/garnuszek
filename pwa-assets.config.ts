import { defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config';

// Regenerate the PNG icons in public/ after editing public/favicon.svg:
//   npm run generate-pwa-assets
export default defineConfig({
  preset: minimal2023Preset,
  images: ['public/favicon.svg'],
});
