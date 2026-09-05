# FloRo Remote: agent bootstrap

Static PWA (HTML/CSS/JS, no npm build step) for controlling FloRo neon signs over Web Bluetooth. See `README.md` for setup, `SPEC.md` for the project spec, and `DESIGN.md` for UI notes.

## Layout map

| Path | Role |
|------|------|
| `index.html` | App shell, static manifest link, early install capture |
| `manifest.webmanifest` | PWA identity (`start_url` / `scope` relative `./`) |
| `sw.js` | Service worker, offline cache (`CACHE_NAME`) |
| `css/styles.css` | All visual tokens and layout |
| `js/` | ES modules (see table below) |
| `scripts/` | Checks, icons, deploy |
| `specs/` | Shipped per-feature specs (overview, BLE, PWA, analytics) |
| `docs/` | UART notes (`PROTOCOL.md`) and `ble-protocol.schema.json` |

### `js/` modules

| File | Role |
|------|------|
| `app.js` | Boot and UI wiring |
| `app-context.js` | Shared app context |
| `connection.js` | Connect / reconnect / disconnect |
| `color-ui.js` | Color picker, recents, presets |
| `mode-ui.js` | Animation modes and favorites |
| `scene-sync.js` | Scene restore to the sign |
| `ble.js` | GATT writes, command queue |
| `protocol.js` | Wire-format helpers (`B=` / `S=` / `C=` / `M`) |
| `pwa-install.js` | Native install prompt |
| `ui.js` | Sheets, chips, wake lock, haptics |
| `clarity.js` | Microsoft Clarity events |

### `scripts/`

| File | Role |
|------|------|
| `check-pwa.mjs` | Manifest + install HTML contracts |
| `check-protocol.mjs` | BLE protocol schema vs `js/protocol.js` |
| `check-ids.sh` | Required DOM ids still present |
| `generate-icons.mjs` | Rebuild `icons/` from `logo.png` |
| `deploy.sh` | Push `main`, bump portfolio submodule, `vercel --prod` |

## Verification commands

| Task | Command |
|------|---------|
| Local serve | `python3 -m http.server 8080` then open http://localhost:8080 |
| CI checks | `node scripts/check-pwa.mjs && node scripts/check-protocol.mjs && bash scripts/check-ids.sh && node scripts/generate-icons.mjs` |
| Deploy | `bash scripts/deploy.sh` |

## Hard constraints

- Always use relative URLs (`./`) in HTML, `manifest.webmanifest`, and `sw.js` so localhost and production both resolve.
- Canonical production URL is https://rawshn.com/floro-remote/
- Production deploy runs through the `rawshn-portfolio` Vercel project (not a standalone Vercel project for this repo).
- No npm build step. Runtime in the browser has zero npm dependencies.
- Web Bluetooth requires Chrome/Edge over HTTPS or localhost and a physical FloRo device.

## Cursor Cloud

Connecting to a sign needs the Web Bluetooth API (Chrome/Edge, `https://` or `localhost`, plus a physical FloRo device). The headless cloud browser reports "Web Bluetooth is not available", so the connect flow cannot be exercised end-to-end here. Tabs, sliders, color picker, and the activity log still render and are enough to verify changes that do not need a live BLE link.

PWA install (`beforeinstallprompt`) also does not fire in Cursor's embedded browser. Verify install on Chrome or Edge against https://rawshn.com/floro-remote/.

## Deploy

After changes on `main`:

```bash
bash scripts/deploy.sh
```

That script pushes this repo, bumps the `public/floro-remote/` submodule in `rawshn-portfolio`, and runs `vercel deploy --prod` from the portfolio root. Bump `CACHE_NAME` in `sw.js` whenever cached static assets change so installed PWAs pick up the update.
