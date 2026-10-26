import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'

function excludeRawGisSourcesFromBuild() {
  return {
    name: 'exclude-raw-gis-sources-from-build',
    apply: 'build' as const,
    closeBundle() {
      // MapLibre v6 resolves its module worker relative to the deployed JS
      // bundle. Vite does not emit that sibling file automatically, leaving
      // the basemap visible but preventing every GeoJSON overlay from being
      // parsed. Ship the worker at the exact URL MapLibre requests.
      const assetDirectory = path.resolve(__dirname, 'dist', 'assets')
      mkdirSync(assetDirectory, { recursive: true })
      copyFileSync(
        path.resolve(__dirname, 'node_modules', 'maplibre-gl', 'dist', 'maplibre-gl-worker.mjs'),
        path.resolve(assetDirectory, 'maplibre-gl-worker.mjs'),
      )

      // Conversion inputs are retained in public/data for the data scripts,
      // but the browser only consumes the generated files in data/hazards.
      for (const directory of ['NPAAAD', 'SAFDZ']) {
        rmSync(path.resolve(__dirname, 'dist', 'data', directory), {
          recursive: true,
          force: true,
        })
      }

      // These are processing inputs or an identical legacy copy, not browser
      // assets. Keep them in the repository without uploading them to Vercel.
      const unusedFiles = [
        'data/terrain/conditioned-dem.npy',
        'data/terrain/flow-accumulation.npy',
        'data/terrain/flow-direction.npy',
        'data/terrain/lasam-dem.npy',
        'data/terrain/slope.npy',
      ]
      for (const file of unusedFiles) {
        rmSync(path.resolve(__dirname, 'dist', file), { force: true })
      }
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), excludeRawGisSourcesFromBuild()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  optimizeDeps: {
    exclude: ['maplibre-gl'],
  },
  worker: {
    format: 'es',
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('maplibre-gl') || id.includes('terra-draw')) {
              return 'vendor-maplibre'
            }
            if (id.includes('jspdf') || id.includes('html-to-image') || id.includes('html2canvas') || id.includes('dompurify') || id.includes('purify')) {
              return 'vendor-pdf'
            }
            if (id.includes('@turf')) {
              return 'vendor-turf'
            }
            if (id.includes('react') || id.includes('react-dom') || id.includes('scheduler')) {
              return 'vendor-react'
            }
            if (id.includes('@radix-ui') || id.includes('lucide-react')) {
              return 'vendor-ui'
            }
          }
        },
      },
    },
    chunkSizeWarningLimit: 800,
  },
})

