# Neon Attack APK — Local Reverse Engineering

Cloud agents **cannot** read files on your Mac Desktop. Run analysis **locally**, then push the text output back to the repo.

## Quick start (Mac)

```bash
cd /path/to/floro-ble-controller
chmod +x reverse-engineering/analyze-apk.sh

./reverse-engineering/analyze-apk.sh \
  "/Users/rawshn/Desktop/com.oytechnology.Neon_Attack-5.0.3-31.zip"
```

Optional (deeper decompile):

```bash
brew install jadx
```

## Output

Results are written to:

```
reverse-engineering/output/protocol-findings.txt
```

Commit and push that file — the cloud agent can then implement missing BLE commands in the PWA.

## Input file

- **Package:** `com.oytechnology.Neon_Attack`
- **Version:** 5.0.3 (build 31)
- **Your path:** `/Users/rawshn/Desktop/com.oytechnology.Neon_Attack-5.0.3-31.zip`

## What we're looking for

| Known (PWA) | To discover (APK) |
|-------------|-------------------|
| `B=0..8;` brightness | Flash mode command |
| `S=0..100;` speed | Beat / music mode |
| `C=R,B,G;` color (GBR swap) | Beat sensitivity |
| `M=1..200;` animation | NUS RX notifications |
| Nordic UART `6e400001` | Any other GATT services |
