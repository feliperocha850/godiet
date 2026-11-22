import { defineConfig } from 'vitest/config';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'GODIET',
        short_name: 'GODIET',
        lang: 'pt-BR',
        start_url: './',
        display: 'standalone',
        background_color: '#f1f7f1',
        theme_color: '#1f5a3a',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  test: { environment: 'node', include: ['tests/**/*.test.ts'] }
});
