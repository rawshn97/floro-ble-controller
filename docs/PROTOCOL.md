# FloRo Sign BLE Protocol

Reverse-engineered from the FloRo PWA controller and Neon Attack app (`com.oytechnology.Neon_Attack` v5.0.3).

## Transport

| Property | Value |
|----------|-------|
| Service | Nordic UART `6e400001-b5a3-f393-e0a9-e50e24dcca9e` |
| Write (TX) | `6e400002-b5a3-f393-e0a9-e50e24dcca9e` |
| Notify (RX) | `6e400003-b5a3-f393-e0a9-e50e24dcca9e` |
| Format | ASCII text, semicolon-terminated, newline optional |
| Device name | `FloRo` (prefix filter) |

## Confirmed commands

| Command | Example | Description |
|---------|---------|-------------|
| Brightness | `B=8;` | 0 = off, 1–8 = levels |
| Speed | `S=50;` | 0–100 percent |
| Color | `C=255,0,128;` | RGB with **G/B swapped** for FloRo wiring: `C=R,B,G;` |
| Mode | `M=32;` | Animation mode 1–200 |

## Candidate commands (verify with APK / raw console)

| Command | Example | Neon Attack feature |
|---------|---------|---------------------|
| Flash | `F=1;` / `F=0;` | Flash mode |
| Beat | `A=1;` / `A=0;` | Music / beat reactive |
| Sensitivity | `P=0;` / `P=1;` / `P=2;` | Beat sensitivity Low / Med / High |

Run `./reverse-engineering/analyze-apk.sh` on your Mac with the APK zip to confirm or correct these.

## Hardware notes

- Controller must remain accessible to the phone — fully wall-enclosed receivers may not pair reliably.
- Web Bluetooth requires HTTPS (or localhost) and Chrome/Edge on Android or desktop. iOS Safari does not support Web Bluetooth.
