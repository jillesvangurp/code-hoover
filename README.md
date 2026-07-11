# Code Hoover

[codehoover.jillesvangurp.com](https://codehoover.jillesvangurp.com/)

Code Hoover is a small React web application for scanning, creating, and saving QR codes and barcodes directly in the browser. It prefers the native [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) when available and falls back to [@zxing/browser](https://github.com/zxing-js/browser).

[![Screenshot](screenshot.webp)](https://codehoover.jillesvangurp.com/)

- Scan multiple QR codes and barcodes without closing the camera.
- Save, edit, delete, and reorder codes in local browser storage.
- Create URLs, text codes, WiFi credentials, and vCards.
- Import and export the saved stash as JSON.
- Store an encrypted copy of a wallet online with Cloudflare KV.
- Copy raw values or open detected links.
- Use the app in English, German, Dutch, French, or Japanese.
- Follow the system light/dark preference and switch themes manually.
- Enable or disable scan and delete sounds.

## Development

The app uses React, TypeScript, Vite, Tailwind CSS 4, and daisyUI. Node.js 22.12 or newer is required.

```bash
npm install
npm run dev
```

Useful commands:

```bash
npm test       # run the Vitest suite
npm run lint   # run ESLint
npm run build  # type-check and create dist/
npm run check  # lint, test, and build
```

All application dependencies are managed through `package.json` and `package-lock.json`.

## Cloudflare Pages

This app is static after `npm run build`, with a small Cloudflare Pages Function under `functions/` for encrypted wallet storage. The deploy command builds and uploads `dist/` plus the Function to a Pages project named `qr-wallet`:

```bash
npm run deploy:cloudflare
```

Run it from a shell where Wrangler is authenticated, or set Cloudflare API credentials in the environment. The Pages Function uses the `QR_WALLET_KV` namespace configured in `wrangler.jsonc`.

## Persisted data compatibility

The React implementation preserves the existing `localStorage` keys and legacy `codes.json` format. Existing saved codes and exported files can therefore be used without migration.

Cloud storage is opt-in. The browser generates a sync key, encrypts the saved codes with Web Crypto, and uploads only the encrypted payload to Cloudflare KV. Keep the sync key if you want to restore the same wallet on another browser.
