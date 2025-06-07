import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const appJsPath = isDev
    ? '/build/kotlin-webpack/js/developmentExecutable/app.js'
    : '/build/kotlin-webpack/js/productionExecutable/app.js';

  const appCssPath = '/src/styles.css';

  return {
    root: '.',
    plugins: [
      tailwindcss()
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  };
});