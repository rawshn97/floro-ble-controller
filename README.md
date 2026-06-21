# FloRo Sign Controller

A progressive web app for controlling FloRo Bluetooth LED signs over Web Bluetooth.

## Features

- Connect to FloRo signs via Nordic UART Service (NUS)
- Power on/off, brightness (1–8), and animation speed controls
- Color picker and preset swatches (with green/blue channel swap for physical wiring)
- 200 animation modes with favorites stored in localStorage
- Offline-capable PWA with install prompt

## Requirements

- Node.js 18+ (for local development server)
- A Chromium-based browser with Web Bluetooth support (Chrome, Edge, Opera)
- A FloRo sign advertising as `FloRo` over Bluetooth

Web Bluetooth works on `localhost` during development. For production, serve the app over HTTPS.

## Setup

```bash
git clone https://github.com/itsrrm97/floro-ble-controller.git
cd floro-ble-controller
npm install
```

## Development

Start the local static server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome or Edge, click **Connect**, and select your FloRo sign.

## Project Structure

```
.
├── index.html      # App UI and BLE control logic
├── manifest.json   # PWA manifest
├── sw.js           # Service worker for offline caching
├── logo.png        # App icon
└── floro.png       # Fallback logo asset
```

## BLE Protocol

Commands are sent as ASCII strings over the NUS write characteristic (`6e400002-b5a3-f393-e0a9-e50e24dcca9e`):

| Command | Example | Description |
|---------|---------|-------------|
| Brightness | `B=5;` | Set brightness (0–8) |
| Speed | `S=50;` | Set animation speed (0–100%) |
| Color | `C=255,0,128;` | Set RGB color |
| Mode | `M=42;` | Set animation mode (1–200) |

## Deploy

This is a static site. Deploy the project root to any static host (Vercel, Netlify, GitHub Pages, etc.). Ensure HTTPS is enabled for Web Bluetooth outside of localhost.
