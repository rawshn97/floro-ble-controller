# FloRo Sign Controller

A progressive web app for controlling FloRo neon signs over **Web Bluetooth**. Connect from Chrome or Edge on desktop/Android, adjust brightness and speed, pick colors, and switch between 200 built-in animation modes.

## Requirements

- **HTTPS** — Web Bluetooth only works on secure origins (`https://` or `localhost`)
- **Browser** — Chrome or Edge (desktop or Android). Safari and Firefox do not support Web Bluetooth
- **Bluetooth** — Enabled on your device, sign powered on and in range

## Quick start

### Local development

Serve the folder over HTTPS or localhost. Examples:

```bash
# Python (localhost only)
python3 -m http.server 8080

# npx serve
npx serve .

# npx with local HTTPS (recommended for mobile testing)
npx local-ssl-proxy --source 8443 --target 8080
```

Open `http://localhost:8080` (or your HTTPS URL), click **Scan & Connect Sign**, and select your FloRo device.

### Deploy to Vercel

**Canonical URL:** `https://rawshn.com/sign-controller/` via [rawshn-portfolio](https://github.com/ItsRRM97/rawshn-portfolio) (`public/sign-controller/` git submodule). Push to `main` on this repo, bump the submodule pointer in the portfolio repo, and redeploy portfolio.

**Direct mirror (optional):** from this repo root:

```bash
vercel --prod
```

The included `vercel.json` sets the Bluetooth permissions policy header. No build step is required — static files only.

### Deploy to GitHub Pages

Push the repo and enable Pages from the default branch root. Ensure the site URL uses HTTPS.

## BLE protocol

Commands are sent as ASCII strings over the Nordic UART Service (NUS):

| Command | Example | Description |
|---------|---------|-------------|
| Brightness | `B=8;\n` | Level 0 (off) through 8 |
| Speed | `S=50;\n` | Animation speed on the sign (higher = slower). The UI shows 0-100% where 100% is fastest; the app sends `S={100 - ui%}` |
| Color | `C=255,0,128;\n` | RGB values (green/blue channels swapped for physical LED wiring) |
| Mode | `M32\n` | Flow/animation mode 1–200. **No** `=` or `;` (Neon Attack `demo111` sends `M` + number + newline) |

Reverse-engineered from **Neon Attack** (`com.oytechnology.Neon_Attack` v5.0.3). The animation picker builds `M{mode}\n` (not `M={mode};`). Dashboard presets also use `SEN={n};\r\n`, `P0;\n` / `P1;\n`, and `M16\r\n` for special effects.

On connect and whenever you change color or animation, the app sends brightness, speed, and color, waits 250ms, then sends the mode command last. Writes use GATT **write with response** when supported.

**Service UUID:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`  
**Write characteristic:** `6e400002-b5a3-f393-e0a9-e50e24dcca9e`

## Project structure

```
├── index.html          # App shell
├── css/styles.css      # Styles
├── js/
│   ├── app.js          # UI wiring and app state
│   ├── ble.js          # BLE connection, command queue, reconnect
│   └── ui.js           # Console, modals, wake lock, haptics
├── icons/              # PWA icons (192, 512, apple-touch)
├── sw.js               # Service worker (offline caching)
├── manifest.json       # PWA manifest
├── scripts/
│   └── generate-icons.mjs
└── vercel.json         # Deploy config
```

## Features

- **Reliable writes** — Command queue with coalescing and automatic retry (up to 3 attempts)
- **Reconnect** — One-tap reconnect to the last paired sign (Chrome `getDevices()` API)
- **Wake lock** — Keeps the screen on while connected
- **Favorites** — Save animation modes to localStorage with custom names
- **Offline PWA** — Installable app with cached assets via service worker

## Assets

Add `logo.png` (512×512) and/or `floro.png` to the project root for the header. PWA install icons live in `icons/` (regenerate with `node scripts/generate-icons.mjs` after updating `logo.png`). The app falls back gracefully if images are missing.

**Add to Home Screen** on Android (Chrome/Edge) for standalone PWA access. iOS: Safari Share, then Add to Home Screen. Use Settings > Install App anytime after dismissing the banner.

## License

MIT
