import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Hollowdeep',
        short_name: 'Hollowdeep',
        description: 'Solo 2D dungeon crawler',
        start_url: './',
        scope: './',
        display: 'standalone',
        orientation: 'any',
        background_color: '#111111',
        theme_color: '#111111',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: { globPatterns: ['**/*.{js,css,html,png,svg,mp3}'], maximumFileSizeToCacheInBytes: 6 * 1024 * 1024 },
    }),
  ],
});
