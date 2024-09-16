import path from 'path'
import { defineConfig } from 'vite'
import { preload } from 'unplugin-auto-expose'

const mode = process.env.MODE || 'development'

export default defineConfig({
  publicDir: false,
  mode: mode,
  build: {
    ssr: true,
    sourcemap: true,
    target: 'chrome126',
    outDir: 'dist/electron/preload',
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'electron/preload.ts'),
      formats: ['cjs']
    },
    rollupOptions: {
      output: {
        entryFileNames: 'preload.cjs'
      }
    }
  },
  plugins: [preload.vite()]
})
