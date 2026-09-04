# BLE and protocol

**Parent index:** [`../SPEC.md`](../SPEC.md)  
**Code:** `js/ble.js`, `js/protocol.js`, `js/errors.js`

---

## Transport

| Property | Value |
|----------|-------|
| API | Web Bluetooth (Chrome / Edge, HTTPS or localhost). Not Safari, not Firefox. |
| Service | Nordic UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Write (TX) | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| Notify (RX) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Device filter | Name prefix `FloRo` |
| Writes | GATT write-with-response when the characteristic supports it |

Production host must send `Permissions-Policy: bluetooth=(self)` (portfolio `vercel.json` for `/sign-controller`).

## Commands the PWA sends

Source of truth for builders: `js/protocol.js`. Reverse-engineering notes: [`../docs/PROTOCOL.md`](../docs/PROTOCOL.md).

| Feature | Wire | Notes |
|---------|------|-------|
| Color | `C=R,B,G;\n` | Green/blue swapped vs APK RGB for FloRo LED wiring |
| Brightness | `B={0-8};\n` | 0 = off. Empirical (not an APK ASCII literal) |
| Speed | `S={0-100};\n` | UI 0–100% fast maps to `100 - ui%` on the wire (higher = slower) |
| Mode | `M{n}\n` | No `=` or `;`. Neon Attack `demo111` format, e.g. `M32\n` |

On connect and after color/animation changes, the app sends brightness, speed, and color, waits 250ms, then sends mode last. Writes go through a coalescing queue with up to 3 retries (`js/ble.js`).

## Reconnect

Chrome `navigator.bluetooth.getDevices()` returns the last permitted device. One-tap reconnect does not open the chooser if the device is already permitted.

## Confirmed in the APK, not in the current UI

These live in `docs/PROTOCOL.md` / `reverse-engineering/output/protocol-findings.txt` and are **not** shipped controls:

- Flash on/off byte sequences
- Beat / music-reactive bytes
- Sensitivity `INT={n};\r\n`

Do not add them to the remote unless a spec in `SPEC_IN_PROGRESS.md` is promoted.

## Errors

`js/errors.js` maps Web Bluetooth exceptions to a cause + next step. The main screen shows Scan & Connect when offline so Settings is not required to pair.
