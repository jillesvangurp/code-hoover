# Code Hoover

Code Hoover is a small web application that lets you scan QR codes and barcodes directly in the browser. It is written in Kotlin/JS using the fritz2 framework, prefers the native [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) when available, and falls back to the excellent [@zxing/browser](https://github.com/zxing-js/browser) package for decoding.

[![Screenshot](screenshot.webp)](URL)

- Browser based and light weight.
- No ads, no nonsense.
- Quickly scan multiple qr or bar codes - the camera view stays open and tries to scan everything you point it at.
- Get a list of all the codes you scan
- Opens straight to your stash of codes so you're never starting from an empty page
- Copy the raw text to the clipboard or open links in a new tab
- Localized in multiple languages!
- Darkmode/lightmode support
- Sports a cute hoover favicon to tidy up your tabs

Is this useful? Maybe not for everyone. But I often want to know what the raw content of a QR or bar code is and that's what this is for.

Did I spend a lot of time on this app? It's all vibe coded using codex and some manual work.

## Running code-hoover

This project uses a slightly unusual way of using kotlin-js. Instead of using the built in webpack, we are using vite. Vite is just easier to configure with modern js tooling and it comes with decent tailwind + daisyui support.

### Vite dependencies

```bash
npm install
```
These are devDependencies only; needed for building and running vite.

### Development Server

Running a development server is slightly more complex than usual because we need to run both gradle and vite in two
separate processes. The easiest is to use two separate terminals and then in the first one run this

```bash
# rebuilds jsBrowserDevelopmentWebpack on source changes, kotlinjs --continues is very flaky, this works
npm run watch
```
This adds a watch on your source folder and triggers `gradle jsBrowserDevelopmentWebpack` which is needed to bundle up the javascript. If there are any compile errors, that might break things of course, keep an eye on the errors.

In the second terminal window, run

```bash
bun run dev
```
This runs vite. Vite monitors the output of the gradle build and reloads your app whenever that changes and the process in the other terminal causes the gradle build to trigger.

### Production build

```bash
# build the kotlin code base
./gradlew jsBrowserProductionWebpack
# vite build
npm run build
```

You will find the site under dist ready for deployment to your favorite hosting provider.