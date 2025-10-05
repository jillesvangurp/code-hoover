import { defineConfig } from 'vite'
import { resolve } from 'path'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig(({ mode }) => {
  const isDev = mode === 'development';

  const appJsPath = isDev
    ? '/build/kotlin-webpack/js/developmentExecutable/app.js'
    : '/build/kotlin-webpack/js/productionExecutable/app.js';

  const appCssPath = '/src/styles.css';

  const devBundleGlob = resolve(
    process.cwd(),
    'build/kotlin-webpack/js/developmentExecutable/**/*.js'
  );
  const devBundleDir = resolve(
    process.cwd(),
    'build/kotlin-webpack/js/developmentExecutable'
  );
  const appCssAbsolutePath = resolve(process.cwd(), appCssPath.replace(/^\//, ''));

  const gradleBundleWatcher = {
    name: 'gradle-development-bundle-watcher',
    apply: 'serve',
    configureServer(server) {
      const shouldHandle = (filePath) => filePath && filePath.startsWith(devBundleDir);

      const triggerReload = (filePath) => {
        if (!shouldHandle(filePath)) {
          return;
        }

        const cssModule =
          server.moduleGraph.getModuleById(appCssAbsolutePath) ??
          server.moduleGraph.getModuleById(appCssPath);

        if (cssModule) {
          server.moduleGraph.invalidateModule(cssModule);
        }

        server.ws.send({ type: 'full-reload' });
      };

      server.watcher.add(devBundleGlob);
      server.watcher.on('change', triggerReload);
      server.watcher.on('add', triggerReload);
    }
  };

  return {
    root: '.',
    plugins: [
      tailwindcss(),
      ...(isDev ? [gradleBundleWatcher] : [])
    ],
    build: {
      outDir: 'dist',
      rollupOptions: {
        input: resolve(__dirname, 'index.html')
      }
    }
  };
});