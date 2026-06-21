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

## Output

Results are written to:

```
reverse-engineering/output/protocol-findings.txt
```

This file is **populated** from Blutter analysis of APKPure Neon Attack v5.0.3 (build 31). Re-run locally with your zip to refresh.

## Discovered vs PWA

| PWA (empirical) | Neon Attack APK (Blutter) |
|-----------------|---------------------------|
| `B=0..8;` brightness | Obfuscated byte tiers (no `B=` literal) |
| `S=0..100;` speed | `[132,122,…,118,20]` byte sequences |
| `C=R,B,G;` color | `C=R,G,B;\n` (PWA may still need G/B swap) |
| `M=1..200;` mode | `M{n}\n` or `[130,20]` for mode 0 |
| `F=` / `A=` / `P=` (guessed) | Flash/Beat bytes; `INT={n};\r\n` sensitivity |
