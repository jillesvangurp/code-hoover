# Code Hoover

[codehoover.jillesvangurp.com](https://codehoover.jillesvangurp.com/)

Code Hoover is a small React web application for scanning, creating, and saving QR codes and barcodes directly in the browser. It prefers the native [Barcode Detection API](https://developer.mozilla.org/en-US/docs/Web/API/Barcode_Detection_API) when available and falls back to [@zxing/browser](https://github.com/zxing-js/browser).

[![Screenshot](screenshot.webp)](https://codehoover.jillesvangurp.com/)

- Scan multiple QR codes and barcodes without closing the camera.
- Save, edit, delete, and reorder codes in local browser storage.
- Create URLs, text codes, WiFi credentials, and vCards.
- Import and export the saved stash as JSON.
- Sync an end-to-end encrypted wallet through Cloudflare KV.
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

This app is static after `npm run build`, with a small Cloudflare Pages Function under `functions/` for ciphertext storage and account authentication. The deploy command builds and uploads `dist/` plus the Function to a Pages project named `qr-wallet`:

```bash
npm run deploy:cloudflare
```

Run it from a shell where Wrangler is authenticated, or set Cloudflare API credentials in the environment. The Pages Function uses the `QR_WALLET_KV` namespace configured in `wrangler.jsonc`.

## Persisted data compatibility

The React implementation preserves the existing `localStorage` keys and legacy `codes.json` format. Existing saved codes and exported files can therefore be used without migration.

Account sync is opt-in and end-to-end encrypted. The browser derives separate authentication and encryption material from the account password, encrypts codes with AES-256-GCM using Web Crypto, and uploads only a versioned ciphertext envelope. The password and decryption key never leave the device. The server stores a one-way verifier for authentication and cannot merge, inspect, or decrypt wallet contents.

Encrypted wallet version 3 gives each saved code a stable record ID, revision, and modification timestamp. Deletions are synchronized as payload-free tombstones, so a stale device cannot bring a deleted code back. Concurrent changes are resolved deterministically by revision, then deletion status, then modification time; deletion wins an equal-revision edit/delete conflict. Every client downloads and merges the encrypted record set before uploading its next encrypted snapshot.

Accounts created before encrypted account sync are migrated after the next successful password sign-in: the browser proves the password using the account's existing one-way verifier, downloads the legacy wallet once, encrypts it locally, and replaces it with ciphertext before normal syncing resumes. The plaintext password is not sent during migration.
