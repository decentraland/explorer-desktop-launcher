import path from 'path'
import { defineConfig } from 'vite'

const mode = process.env.MODE || 'development'

export default defineConfig({
  mode: mode,
  root: __dirname,
  envDir: __dirname,
  build: {
    ssr: true,
    sourcemap: true,
    target: 'node20',
    outDir: 'dist',
    minify: false,
    lib: {
      entry: path.resolve(__dirname, 'electron/index.ts'),
      formats: ['es']
    },
    rollupOptions: {
      output: [
        {
          entryFileNames: '[name].js'
        }
      ]
    }
  }
})
