/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// BASE_PATH is set by the deploy workflow (GitHub Pages serves under /chess-trainer/).
const base = process.env.BASE_PATH ?? '/'
// Shown in Settings, so Lu can see whether the phone runs the newest version
const version = new Date().toISOString().slice(0, 19).replace('T', ' ') + ' UTC'
// PREVIEW=1: a draft version served next to the real app under /chess-trainer/preview/
const preview = process.env.PREVIEW === '1'

export default defineConfig({
  base,
  define: { __APP_VERSION__: JSON.stringify(preview ? version + ' · PREVIEW' : version) },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Lu's voice clips (public/voice) are cached on first play, not downloaded all at install
      workbox: {
        // Speed (Lu, 13.11.: "die Map sofort da"): the painted pictures are stored on the phone at install,
        // so the start page, cities and map open without waiting for the network
        globPatterns: ['**/*.{js,css,html,svg,png,webmanifest}', 'king/**/*.jpg'],
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        globIgnores: ['voice/**', 'preview/**'],
        // The draft under /preview/ is its own app: never answer its pages with this app's index.html
        navigateFallbackDenylist: [/\/preview\//],
        runtimeCaching: [
          // the fonts (Nunito, Cinzel …): from the phone instead of Google on every start
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.googleapis.com',
            handler: 'StaleWhileRevalidate',
            options: { cacheName: 'font-css', expiration: { maxEntries: 10 } },
          },
          {
            urlPattern: ({ url }) => url.hostname === 'fonts.gstatic.com',
            handler: 'CacheFirst',
            options: { cacheName: 'font-files', expiration: { maxEntries: 40, maxAgeSeconds: 365 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          // the real world map (Journey): style, fonts and tiles from OpenFreeMap stay on the phone after the first look
          {
            urlPattern: ({ url }) => url.hostname === 'tiles.openfreemap.org',
            handler: 'CacheFirst',
            options: { cacheName: 'map-tiles', expiration: { maxEntries: 4000, maxAgeSeconds: 30 * 24 * 3600 }, cacheableResponse: { statuses: [0, 200] } },
          },
          {
            urlPattern: ({ url }) => url.pathname.includes('/voice/'),
            handler: 'CacheFirst',
            options: { cacheName: 'voice-clips', expiration: { maxEntries: 500 } },
          },
        ],
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: preview ? 'Hoppy Chess (Preview)' : 'Hoppy Chess',
        short_name: preview ? 'Hoppy Preview' : 'Hoppy',
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
