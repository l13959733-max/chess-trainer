/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH is set by the deploy workflow (GitHub Pages serves under /chess-trainer/).
const base = process.env.BASE_PATH ?? '/'
// Shown in Settings, so Lu can see whether the phone runs the newest version
const version = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lu's voice clips (public/voice) are cached on first play, not downloaded all at install
      workbox: {
        globIgnores: ['voice/**'],
        runtimeCaching: [
          {
            urlPattern: ({ url }) => url.pathname.includes('/voice/'),
            handler: 'CacheFirst',
            options: { cacheName: 'voice-clips', expiration: { maxEntries: 500 } },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Chess Trainer',
        short_name: 'Chess',
        description: 'Learn openings and learn from your own mistakes, with every mistake explained.',
        lang: 'en',
        start_url: base,
        scope: base,
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [
          { src: 'pwa-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'pwa-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    environment: 'node',
  },
})
