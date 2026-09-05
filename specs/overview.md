# Overview

**Parent index:** [`../SPEC.md`](../SPEC.md)

---

## Purpose

FloRo Sign Controller is a **static progressive web app** that talks to a FloRo neon sign over **Web Bluetooth**. It is a phone-first remote: pick a color or animation, set brightness and speed, save favorites, and reconnect to the last paired device.

It is **not** a native Android/iOS rewrite, and it does not need one to be installable. Chrome and Edge can install any site that meets [web app installability](https://web.dev/learn/pwa/installation) (HTTPS, a valid manifest, a controlling service worker). Health Hub proves the same origin pattern works on rawshn.com.

## Users

- **Operator (Rawshn):** control the physical sign from a phone or laptop in Chrome/Edge.
- **Agents:** edit static files, bump the portfolio submodule, deploy. No npm build.

## Tech stack

| Layer | Choice |
|-------|--------|
| App | Static HTML / CSS / ES modules. No bundler. |
| BLE | Web Bluetooth (`navigator.bluetooth`) |
| PWA | `manifest.webmanifest` + `sw.js` + `js/pwa-install.js` |
| Analytics | Microsoft Clarity (`js/clarity.js`, project `yakgofwgk3`) |
| Icons | `logo.png` → `node scripts/generate-icons.mjs` |
| Production | `rawshn-portfolio` Vercel project, files at `public/sign-controller/` |
| Local | `python3 -m http.server 8080` |

**Node:** only for icon generation and `scripts/check-pwa.mjs`. Runtime in the browser has zero npm dependencies.

## Commands

```bash
python3 -m http.server 8080          # local app: http://localhost:8080
node scripts/generate-icons.mjs      # regenerate icons/ from logo.png
node scripts/check-pwa.mjs           # manifest + install HTML contracts
bash scripts/check-ids.sh            # required DOM ids still present
bash scripts/deploy.sh               # push main, bump portfolio submodule, vercel --prod
```

## Project structure

```
index.html                 App shell, static manifest link, install banner
css/styles.css             All visual tokens
js/app.js                  UI wiring, modes, favorites, scene restore
js/ble.js                  Connection, GATT writes, reconnect
js/protocol.js             Wire-format helpers (B=/S=/C=/M)
js/pwa-install.js          beforeinstallprompt + banner + settings
js/ui.js                   Sheets, chips, wake lock, haptics
js/color-picker.js         HSL picker
js/colors.js               Neon swatches
js/mode-names.js           Names for modes 1–200
js/state.js                localStorage scene
js/errors.js               User-facing BLE errors
manifest.webmanifest       PWA identity (scope /sign-controller/)
sw.js                      Offline cache + fetch handler
icons/                     192 / 512 / apple-touch
docs/PROTOCOL.md           Neon Attack UART notes
reverse-engineering/       Local APK analysis (not shipped to users)
```

## Boundaries

- **Always:** keep asset URLs relative (`./`) so localhost and `/sign-controller/` both work. Bump `CACHE_NAME` in `sw.js` when static assets change. Run `node scripts/check-pwa.mjs` after PWA edits.
- **Ask first:** adding npm runtime dependencies, changing the canonical URL, exposing Flash/Beat/sensitivity in the UI.
- **Never:** merge stale `index.html` from June 2026 branches; deploy this repo as a standalone Vercel project; use `npx vercel`; commit APK/zip binaries.

## Success criteria (product)

- On Chrome/Edge Android or desktop, visiting https://rawshn.com/sign-controller/ can be installed as a standalone app (no browser chrome).
- Tapping **Install** (when the browser has offered a native prompt) opens that prompt. It does not open a fake “use the ⋮ menu” sheet.
- Web Bluetooth connect still works after install (Permissions-Policy bluetooth=`self` on the portfolio host).
- iOS Safari cannot auto-install; the banner explains Share → Add to Home Screen.

## Related

- BLE wire format: [ble.md](ble.md)
- Installable PWA: [pwa.md](pwa.md)
- Clarity analytics: [analytics.md](analytics.md)
- Visual system: [`../DESIGN.md`](../DESIGN.md)
