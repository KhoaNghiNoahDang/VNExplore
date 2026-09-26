import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { dirname, join } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

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

export default defineConfig({
  plugins: [react(), tailwindcss(), maplibreWorker()],
  // MapLibre (~1 MB) is its own lazy chunk, loaded only when a map is on screen.
  build: { chunkSizeWarningLimit: 1200 },
})
