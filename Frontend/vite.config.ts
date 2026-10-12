import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

/**
 * MapLibre v6 parses tiles in an ES-module worker that imports a sibling file.
 * Serve both prebuilt files unchanged at /maplibre/ (dev) and emit them there (build);
 * RealMap points MapLibre at /maplibre/maplibre-gl-worker.mjs.
 */
function maplibreWorker(): Plugin {
  const dist = join(dirname(createRequire(import.meta.url).resolve('maplibre-gl/package.json')), 'dist')
  const files = ['maplibre-gl-worker.mjs', 'maplibre-gl-shared.mjs']
  return {
    name: 'maplibre-worker',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.match(/^\/maplibre\/([\w.-]+)$/)?.[1]
        if (!name || !files.includes(name)) return next()
        res.setHeader('Content-Type', 'text/javascript')
        res.end(readFileSync(join(dist, name)))
      })
    },
    generateBundle() {
      for (const name of files) {
        this.emitFile({ type: 'asset', fileName: `maplibre/${name}`, source: readFileSync(join(dist, name)) })
      }
    },
  }
}

/**
 * Installable app (PWA) for every platform: Android/ChromeOS/Windows/macOS install from the
 * browser's prompt (see InstallPrompt), iPhone/iPad from Share → Add to Home Screen.
 * The service worker keeps the app shell offline; big chunks are cached the first time they load.
 */
const pwa = VitePWA({
  registerType: 'autoUpdate',
  // Registered from src/lib/pwa.ts, which also checks for new versions while the app stays open.
  injectRegister: false,
  includeAssets: ['favicon-48.png', 'apple-touch-icon.png'],
  manifest: {
    id: '/',
    name: 'VNExplore · Hanoi Story Quest',
    short_name: 'VNExplore',
    description: 'Kể một câu, nhận lộ trình khám phá Hà Nội: địa điểm, câu chuyện, con dấu và đi cùng bạn bè.',
    lang: 'vi',
    dir: 'ltr',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    display_override: ['standalone', 'minimal-ui'],
    orientation: 'portrait',
    background_color: '#FFF6DC',
    theme_color: '#FFF6DC',
    categories: ['travel', 'navigation', 'education'],
    icons: [
      { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/maskable-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  },
  workbox: {
    globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
    globIgnores: ['**/places-open-*.js'],
    // places-open (thousands of open-data places, ~3 MB) is cached at runtime instead.
    maximumFileSizeToCacheInBytes: 1_500_000,
    navigateFallback: '/index.html',
    navigateFallbackDenylist: [/^\/api/, /^\/maplibre\//],
    cleanupOutdatedCaches: true,
    runtimeCaching: [
      {
        // Hashed build files too big to precache: immutable, so cache-first is safe.
        urlPattern: ({ url, sameOrigin }) => sameOrigin && /\/assets\/.+\.js$/.test(url.pathname),
        handler: 'CacheFirst',
        options: { cacheName: 'vx-chunks', expiration: { maxEntries: 20 } },
      },
      {
        urlPattern: ({ url, sameOrigin }) => sameOrigin && url.pathname.startsWith('/maplibre/'),
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'vx-maplibre' },
      },
      {
        urlPattern: ({ url }) => url.origin === 'https://fonts.googleapis.com' || url.origin === 'https://fonts.gstatic.com',
        handler: 'CacheFirst',
        options: { cacheName: 'vx-fonts', expiration: { maxEntries: 20, maxAgeSeconds: 60 * 60 * 24 * 365 } },
      },
      {
        // Map tiles and styles: show what we have, refresh in the background.
        urlPattern: ({ url }) => url.origin === 'https://tiles.openfreemap.org',
        handler: 'StaleWhileRevalidate',
        options: { cacheName: 'vx-tiles', expiration: { maxEntries: 400, maxAgeSeconds: 60 * 60 * 24 * 14 } },
      },
    ],
  },
})

export default defineConfig({
  plugins: [react(), tailwindcss(), maplibreWorker(), pwa],
  // MapLibre (~1 MB) is its own lazy chunk, loaded only when a map is on screen.
  build: { chunkSizeWarningLimit: 1200 },
  server: {
    // Open the dev server on a phone through a Cloudflare quick tunnel (HTTPS → GPS works).
    allowedHosts: ['.trycloudflare.com'],
    // The local backend through the same origin, so it also works from the phone (where
    // "localhost" is the phone) and over HTTPS. .env.local: VITE_API_URL=/api-dev
    proxy: {
      '/api-dev': { target: 'http://localhost:8080', changeOrigin: true, rewrite: (path) => path.replace(/^\/api-dev/, '') },
    },
  },
})
