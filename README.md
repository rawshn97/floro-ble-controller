Agents: see AGENTS.md

# FloRo Remote

[![CI](https://github.com/ItsRRM97/floro-ble-controller/actions/workflows/ci.yml/badge.svg)](https://github.com/ItsRRM97/floro-ble-controller/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-teal.svg)](LICENSE)
[![Web Bluetooth](https://img.shields.io/badge/Web%20Bluetooth-GATT%20NUS-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Bluetooth_API)
[![PWA](https://img.shields.io/badge/PWA-Installable-brightgreen.svg)](https://rawshn.com/floro-remote/)
[![Live App](https://img.shields.io/badge/Live-rawshn.com%2Ffloro--remote-orange.svg)](https://rawshn.com/floro-remote/)

A progressive web app for controlling FloRo neon signs over **Web Bluetooth**. Connect from Chrome or Edge on desktop or Android, adjust brightness and speed, pick colors, save presets, and switch between 200 built-in animation modes.

Zero build steps. Zero runtime npm dependencies. Pure modern web standards.

**Live application:** [https://rawshn.com/floro-remote/](https://rawshn.com/floro-remote/)

## Requirements

- **HTTPS**: Web Bluetooth requires a secure origin (`https://` or `localhost`)
- **Browser**: Chrome or Edge (desktop or Android). Safari and Firefox do not support Web Bluetooth
- **Bluetooth**: Enabled on your device, with the FloRo sign powered on and in range

## Quick start

### Local development (golden path)

Clone the repository and serve it with any local static HTTP server:

```bash
git clone https://github.com/ItsRRM97/floro-ble-controller.git
cd floro-ble-controller
python3 -m http.server 8080
```

Open [http://localhost:8080](http://localhost:8080) in Chrome or Edge, click **Scan & Connect**, and pair with your sign.

No build step or npm install required.

### Mobile testing

Web Bluetooth on mobile requires HTTPS (localhost works on desktop only). To test on Android:

```bash
python3 -m http.server 8080 &
npx local-ssl-proxy --source 8443 --target 8080
```

Open `https://<your-lan-ip>:8443` in Chrome or Edge on your phone.

## Features

- **Tactile remote interface**: Mobile-first design inspired by dedicated hardware remotes, with haptic feedback and dark theme ergonomics.
- **Reliable BLE write queue**: Sequential write queue with command coalescing, generation tracking, and automatic retry up to 3 attempts.
- **One-tap reconnect**: Seamlessly re-pair with the last used sign using Chromium `navigator.bluetooth.getDevices()`.
- **Screen wake lock**: Automatically keeps the screen awake while connected to the sign.
- **Favorites & presets**: Save custom named animation favorites and color presets locally in the browser.
- **Scene restore**: Preserves tab, brightness, speed, color, and mode in localStorage. On connect or power-on, the UI synchronizes state with the sign.
- **True native PWA install**: Only prompts for installation when Chromium emits `beforeinstallprompt`, opening as a standalone fullscreen app without browser chrome.

## BLE Protocol

Commands are sent as ASCII strings over the Nordic UART Service (NUS):

| Command | Wire Example | Description |
|---------|--------------|-------------|
| Brightness | `B=8;\n` | Level 0 (off) through 8 |
| Speed | `S=50;\n` | Sign animation speed (higher = slower). The UI maps 0-100% speed to `S={100 - ui%}` |
| Color | `C=255,0,128;\n` | RGB values (green/blue channels swapped for physical sign LED wiring) |
| Mode | `M32\n` | Animation mode 1 to 200. No `=` or `;` |

Reverse-engineered from the Neon Attack companion app (`com.oytechnology.Neon_Attack` v5.0.3).

- **Service UUID:** `6e400001-b5a3-f393-e0a9-e50e24dcca9e`
- **TX Characteristic:** `6e400002-b5a3-f393-e0a9-e50e24dcca9e`
- **RX Characteristic:** `6e400003-b5a3-f393-e0a9-e50e24dcca9e`

Machine-readable JSON schema: [`docs/ble-protocol.schema.json`](docs/ble-protocol.schema.json). Detailed notes: [`docs/PROTOCOL.md`](docs/PROTOCOL.md).

## Project structure

```
├── index.html                  # App shell and native install capture
├── css/styles.css              # Responsive styles and design tokens
├── js/
│   ├── app.js                  # Main entrypoint and UI orchestration
│   ├── app-context.js          # Shared DOM elements and reactive state
│   ├── connection.js           # Bluetooth lifecycle and auto-reconnect
│   ├── color-ui.js             # Color hero, swatches, and preset cards
│   ├── mode-ui.js              # 200 animation modes and favorites
│   ├── scene-sync.js           # Brightness, speed, and scene restore
│   ├── ble.js                  # GATT connection and retry write queue
│   ├── protocol.js             # Wire-format encoders and color helpers
│   ├── pwa-install.js          # Native PWA install prompt handler
│   ├── color-picker.js         # Custom HSL color picker widget
│   ├── mode-names.js           # Mode name catalog and fuzzy search
│   ├── errors.js               # Human-readable Bluetooth error messages
│   └── ui.js                   # Sheets, modals, wake lock, haptics
├── icons/                      # PWA icons (192, 512, apple-touch)
├── sw.js                       # Service worker with offline asset cache
├── manifest.webmanifest        # PWA identity and launch handler
├── SPEC.md                     # Specification index
├── specs/                      # Feature specifications
├── docs/                       # Protocol docs and JSON schema
├── scripts/                    # Test gates, asset generation, deploy
├── LICENSE                     # MIT License
├── CONTRIBUTING.md             # Contribution guidelines
├── SECURITY.md                 # Security policy
└── CODE_OF_CONDUCT.md          # Community code of conduct
```

## Testing & Quality Gates

Run all automated checks locally:

```bash
# Validate PWA manifest and service worker contracts
node scripts/check-pwa.mjs

# Validate BLE protocol encoder against JSON schema
node scripts/check-protocol.mjs

# Verify DOM ID preservation
bash scripts/check-ids.sh

# Verify icon dimensions
node scripts/generate-icons.mjs
```

## Deploy

Production is hosted at `https://rawshn.com/floro-remote/` via `rawshn-portfolio`.

Run the automated deploy script from the repository root:

```bash
bash scripts/deploy.sh
```

The script pushes `floro-ble-controller` to GitHub, synchronizes the snapshot to `rawshn-portfolio/public/floro-remote/`, and deploys via Vercel.

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) for local development instructions and coding standards.

## Security

For vulnerability reports, please consult [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) (c) 2026 Roshan Mishra
