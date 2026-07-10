# FloRo Sign Controller

A progressive web app for controlling FloRo neon signs over **Web Bluetooth**. Connect from Chrome or Edge on desktop/Android, adjust brightness and speed, pick colors, and switch between 200 built-in animation modes.

## Requirements

- **HTTPS** — Web Bluetooth only works on secure origins (`https://` or `localhost`)
- **Browser** — Chrome or Edge (desktop or Android). Safari and Firefox do not support Web Bluetooth
- **Bluetooth** — Enabled on your device, sign powered on and in range

## Quick start

### Local development (golden path)

```bash
git clone https://github.com/ItsRRM97/floro-ble-controller.git
cd floro-ble-controller
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080), tap **Scan & Connect** on the main screen (or in Settings), and select your FloRo device in the browser picker.

No build step or npm install required.

### Mobile testing (optional)

Web Bluetooth on a phone needs HTTPS (localhost works on desktop only). To test on Android:

```bash
python3 -m http.server 8080 &
npx local-ssl-proxy --source 8443 --target 8080
```

Open `https://<your-lan-ip>:8443` in Chrome or Edge on the phone.

Other serve options (`npx serve`, etc.) work the same way as long as the origin is secure.

## Deploy

**Production URL:** [https://rawshn.com/sign-controller/](https://rawshn.com/sign-controller/)

This repo is a git submodule inside [rawshn-portfolio](https://github.com/ItsRRM97/rawshn-portfolio) at `public/sign-controller/`. Production is served only through the portfolio Vercel project (same pattern as embedded static assets, unlike `/coach` which rewrites to an external app).

### Deploy workflow

1. Commit and push changes to `main` on this repo
2. Run the deploy script (bumps the portfolio submodule and deploys production):

```bash
bash scripts/deploy.sh
```

Or manually:

1. In `rawshn-portfolio`, update the `public/sign-controller/` submodule pointer, commit, and push `main`
2. From `rawshn-portfolio`: `vercel deploy --prod`

The portfolio build serves these static files at `/sign-controller/` with the correct PWA scope and Bluetooth permissions header (`vercel.json` in the portfolio repo). No build step is required in this repo.

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
│   ├── errors.js       # User-facing BLE error messages
│   └── ui.js           # View transitions, sheets, PWA install, wake lock, haptics
├── icons/              # PWA icons (192, 512, apple-touch)
├── sw.js               # Service worker (offline caching)
├── manifest.webmanifest # PWA manifest
├── CHANGELOG.md        # Release notes (version + SW cache bumps)
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
- **Scene restore** — Saves tab, brightness, speed, color, and mode to localStorage. On connect and power-on, the UI opens Animation with the last saved animation pre-selected so the remote matches what the sign displays.
- **Offline PWA** — Installable app with cached assets via service worker
- **Smart install prompts** — Platform-aware banner (iOS steps, Android menu fallback when `beforeinstallprompt` is delayed), 7-day dismiss TTL, Settings > Install App anytime

## PWA install behavior

The install prompt is a floating bottom card (`#install-banner.install-prompt`), not a dock inside the remote control shell. It sits above the safe area with logo, title, platform-specific instructions, an always-tappable **Install** button, and a **Not now** dismiss button.

| Platform | Banner | Install button in banner |
|----------|--------|--------------------------|
| **Android (Chrome/Edge)** | Floating card after ~2.5s fallback (or when `beforeinstallprompt` fires) | Always visible; native install dialog when available, otherwise opens step-by-step modal (Chrome menu → Install app) |
| **iOS (Safari)** | Floating card on first visit | Always visible; opens Add to Home Screen steps modal |
| **Desktop** | Hidden until `beforeinstallprompt` or Settings > Install App | Native **Install** when available; otherwise modal with steps |

Dismiss **Not now** stores a timestamp in `localStorage` (`floro_install_dismissed_v4`) and hides the banner for **7 days**. Settings > **Install App** always works (native prompt or step-by-step modal). After install (standalone mode), the banner hides automatically.

## Assets

Add `logo.png` (512×512) and/or `floro.png` to the project root for the header. PWA install icons live in `icons/` (regenerate with `node scripts/generate-icons.mjs` after updating `logo.png`). The app falls back gracefully if images are missing.

**Add to Home Screen** on Android (Chrome/Edge) for standalone PWA access. iOS: Safari Share, then Add to Home Screen. If you dismiss the banner, it stays away for 7 days; use Settings > Install App anytime.

## License

MIT
