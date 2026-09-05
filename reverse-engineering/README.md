# Neon Attack APK: local reverse engineering

Cloud agents cannot read files on your Mac Desktop. Run analysis locally, then commit the text output.

## Quick start (Mac)

```bash
cd /path/to/floro-ble-controller
chmod +x reverse-engineering/analyze-apk.sh

./reverse-engineering/analyze-apk.sh \
  "/path/to/com.oytechnology.Neon_Attack-5.0.3-31.zip"
```

Optional (deeper decompile):

```bash
brew install jadx
```

## Input

- Package: `com.oytechnology.Neon_Attack`
- Version: 5.0.3 (build 31)

## Output

Results are written to `reverse-engineering/output/protocol-findings.txt`.

That file is populated from Blutter analysis of APKPure Neon Attack v5.0.3 (build 31). Re-run locally with your zip to refresh. Commit the findings file, not APK binaries.

## Discovered vs PWA

| PWA (empirical) | Neon Attack APK (Blutter) |
|-----------------|---------------------------|
| `B=0..8;` brightness | Obfuscated byte tiers (no `B=` literal) |
| `S=0..100;` speed | `[132, 122, …, 118, 20]` byte sequences |
| `C=R,B,G;` color | `C=R,G,B;\n` (PWA still applies G/B swap for hardware) |
| `M{n}\n` mode | `M{n}\n` or `[130,20]` for mode 0 |
| Flash / Beat | Confirmed byte sequences in findings; not exposed in the current UI |

Human-readable protocol: [`docs/PROTOCOL.md`](../docs/PROTOCOL.md).
