import { defineConfig } from 'vite'
import { readdirSync } from 'fs'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'
import daisyui from 'daisyui'

const kotlinEntry = resolve(__dirname, '/build/kotlin-webpack/js/developmentExecutable/app.js')

export default defineConfig({
  root: '.', // or wherever your `index.html` lives
  server: {
    port: 5173,
  },
  clearScreen: false,
  plugins: [
    tailwindcss({
      plugins: [daisyui]
    }),
  ],
//  publicDir: kotlinOutputDir,
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: ['index.html',kotlinEntry],
    }
  }
})
