# Contributing to FloRo Remote

Thank you for your interest in contributing to FloRo Remote!

FloRo Remote is a zero-build-step Progressive Web App built with vanilla ES modules, CSS, and HTML, communicating with FloRo neon signs via the Web Bluetooth API (Nordic UART Service).

## Core Principles

1. **Zero build step runtime**: The browser runs the source code directly without npm, Webpack, Vite, or Babel. Do not introduce build tools or runtime node_modules into the web app.
2. **Relative URLs (`./`)**: All paths in `index.html`, `manifest.webmanifest`, and `sw.js` must remain relative (`./`) so the application works seamlessly on `localhost` and behind path prefixes like `/floro-remote/`.
3. **Hardware safety**: Command sequences adhere to the Nordic UART protocol documented in `docs/ble-protocol.schema.json`. Color writes preserve green/blue channel swapping for physical sign LED wiring.
4. **Accessible and responsive**: Mobile-first touch targets (minimum 48dp height) with tactile feedback and dark theme ergonomics.

## Local Development

Start a local HTTP server from the repository root:

```bash
python3 -m http.server 8080
```

Open `http://localhost:8080` in Chrome or Edge on desktop.

Note: Web Bluetooth requires a secure origin (`localhost` or `https://`). Connecting to a physical sign requires Chrome or Edge and a powered-on FloRo sign in Bluetooth range.

## Verification Gates

Before submitting a pull request, run all verification scripts locally:

```bash
# Check PWA manifest and service worker contracts
node scripts/check-pwa.mjs

# Check BLE protocol schema alignment
node scripts/check-protocol.mjs

# Verify DOM ID preservation
bash scripts/check-ids.sh

# Verify icon asset generation
node scripts/generate-icons.mjs
```

All four checks run in GitHub Actions CI and must pass.

## Project Structure

- `index.html`: Main shell, static manifest link, early install handler
- `css/styles.css`: Visual tokens and responsive layout
- `js/`: Vanilla ES modules
  - `app.js`: Main bootstrap and sheet orchestration
  - `app-context.js`: Shared DOM element references, reactive state snapshotting, logger
  - `connection.js`: Web Bluetooth lifecycle, reconnect logic, UI states
  - `color-ui.js`: Color hero, neon grid swatches, recents strip, color presets
  - `mode-ui.js`: 200 animation modes list, favorites, stepper navigation
  - `scene-sync.js`: Brightness and speed controls, power management, scene restore
  - `ble.js`: Bluetooth GATT connection, write queue, auto-retry
  - `protocol.js`: Wire format encoders and RGB converters
  - `pwa-install.js`: Native PWA install prompt handler
  - `color-picker.js`: Custom HSL color picker widget
  - `mode-names.js`: Mode names catalog and search
  - `errors.js`: Human-readable Bluetooth error messages
  - `clarity.js`: Microsoft Clarity event telemetry
- `docs/`: Protocol documentation and `ble-protocol.schema.json`
- `specs/`: Feature specifications (`overview.md`, `ble.md`, `pwa.md`, `analytics.md`)

## Pull Request Guidelines

1. Create a descriptive branch name (e.g. `feature/brightness-presets` or `fix/reconnect-timeout`).
2. Keep commits atomic with clear commit messages following Conventional Commits format (`feat:`, `fix:`, `docs:`, `refactor:`).
3. If changing static assets or scripts, bump the service worker cache version (`CACHE_NAME` in `sw.js`) and document in `CHANGELOG.md`.
4. Ensure all CI checks pass.
