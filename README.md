# Code Hoover

Code Hoover is a small web application that lets you scan QR codes and barcodes directly in the browser. It is written in Kotlin/JS using the fritz2 framework and relies on the excellent [ZXing JavaScript library](https://github.com/zxing-js/library) for the heavy lifting when decoding codes.

## Building with Gradle

The Kotlin/JS build still produces a Webpack bundle. For a fast development loop run:

```bash
./gradlew jsBrowserDevelopmentWebpack --continuous
```

The `.run/webpack.run.xml` file contains an IntelliJ run configuration with this command so you can start it straight from the IDE.

For a production bundle use:

```bash
./gradlew jsBrowserProductionWebpack
```

## Running with Vite

Vite serves the output that Gradle produces. Install the node dependencies once:

```bash
npm install
```

Then start the dev server:

```bash
npm run dev
```

For a production build run:

```bash
npm run build
```

Unlike the normal Vite setup where it performs the bundling with esbuild, here Gradle already creates an `app.js` file. The Vite configuration in `vite.config.mjs` simply uses that file and adds Tailwind processing.

