# FloRo Remote BLE Protocol

Reverse-engineered from **Neon Attack** (`com.oytechnology.Neon_Attack` v5.0.3, build 31) via Blutter decompilation of `libapp.so`, cross-checked with the FloRo PWA.

Machine-readable schema: [`ble-protocol.schema.json`](ble-protocol.schema.json). Full byte tables: [`reverse-engineering/output/protocol-findings.txt`](../reverse-engineering/output/protocol-findings.txt)

## Transport

| Property | Value |
|----------|-------|
| Service | Nordic UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Write (TX) | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| Notify (RX) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Payload | UTF-8 bytes (ASCII commands) |
| Device name | `FloRo` (prefix filter) |

## Confirmed in Neon Attack APK

| Feature | Official format | Example |
|---------|-----------------|---------|
| Color | `C=R,G,B;\n` | `C=255,0,128;\n` |
| Mode | `M{n}\n` (no `=` or `;`) | `M32\n` |
| Mode 0 | raw bytes | `[130, 20]` |
| Flash off/on | raw bytes | `[158, 20]` / `[140, 20]` |
| Beat off/on | raw bytes | `[136, 96, 26, 20]` / `[136, 98, 26, 20]` |
| Sensitivity | `INT={n};\r\n` | `INT=14;\r\n` (app uses 2–22 even steps) |

Color presets in the app (16 values) all use `\n` after the semicolon.

## PWA-compatible ASCII (empirical, not in APK literals)

These formats are **not** present as strings in the decompiled app but are widely used by the FloRo PWA and reported to work on hardware:

| Command | Example | Notes |
|---------|---------|-------|
| Brightness | `B=8;` | 0 = off, 1–8 = levels |
| Speed | `S=50;` | 0–100 % |
| Mode (alt.) | `M=32;` | Official app uses `M32\n` instead |

The PWA sends these with an appended `\n` in the command queue.

## Hardware notes

- **G/B swap:** FloRo signs may expect `C=R,B,G;` (green and blue channels swapped vs the APK source). The PWA applies this swap; verify on your sign.
- **Terminator:** APK color uses `;\n`. Semicolon-only may also work.
- **Web Bluetooth:** Requires HTTPS (or localhost). Chrome/Edge on Android/desktop; not Safari on iOS.
- **Enclosure:** BLE range drops sharply inside metal or thick enclosures.

## Sensitivity mapping (PWA)

| UI | APK `INT=` value |
|----|------------------|
| Low | 8 |
| Med | 14 |
| High | 22 |
