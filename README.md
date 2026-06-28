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
├── index.html          # App shell (early beforeinstallprompt capture, base href for subpaths)
├── css/styles.css      # Styles
├── js/
│   ├── app.js          # UI wiring, mode logic, auto-reconnect
│   ├── ble.js          # BLE connection, command queue, reconnect
│   ├── color-picker.js # Custom HSL color picker widget
│   ├── protocol.js     # Hex/RGB helpers and wire-format constants
│   └── ui.js           # View transitions, sheets, PWA install, wake lock, haptics
├── icons/              # PWA icons (192, 512, apple-touch)
├── sw.js               # Service worker (offline caching)
├── manifest.json       # PWA manifest
├── scripts/
│   └── generate-icons.mjs
├── DESIGN.md           # Design system and IA reference
└── vercel.json         # Deploy config (Bluetooth permissions policy)
```

## Features

- **Reliable writes** — Command queue with coalescing and automatic retry (up to 3 attempts)
- **Reconnect** — One-tap reconnect to the last paired sign (Chrome `getDevices()` API)
- **Wake lock** — Keeps the screen on while connected
- **Favorites** — Save animation modes to localStorage with custom names
- **Offline PWA** — Installable app with cached assets via service worker
- **Smart install prompts** — Platform-aware banner (iOS steps, Android menu fallback when `beforeinstallprompt` is delayed), 7-day dismiss TTL, Settings > Install App anytime

## PWA install behavior

The install dock is anchored to the bottom of the app shell (not a floating overlay). On mobile, an **Install** button stays visible until the app is installed, even after tapping **Not now** (which collapses to a compact bar).

| Platform | Dock | Install button |
|----------|------|----------------|
| **Android (Chrome/Edge)** | Bottom dock when not installed | Always visible; opens native prompt when available, otherwise step-by-step modal (⋮ menu path) |
| **iOS (Safari)** | Bottom dock when not installed | **How to install** opens Share → Add to Home Screen steps |
| **Desktop** | Hidden after dismiss (7-day TTL) | Use browser install icon or Settings > Install App |

Dismiss **Not now** stores a timestamp in `localStorage` (`floro_install_dismissed_v3`). On mobile the dock collapses but **Install** remains; on desktop the dock hides for **7 days**. Settings > **Install App** always works. After install (standalone mode), the dock hides automatically.

## Assets

Add `logo.png` (512×512) and/or `floro.png` to the project root for the header. PWA install icons live in `icons/` (regenerate with `node scripts/generate-icons.mjs` after updating `logo.png`). The app falls back gracefully if images are missing.

**Add to Home Screen** on Android (Chrome/Edge) for standalone PWA access. iOS: Safari Share, then Add to Home Screen. If you dismiss the banner, it stays away for 7 days; use Settings > Install App anytime.

## License

MIT
