#!/usr/bin/env bash
# Run ON YOUR MAC where the APK zip lives:
#   ./reverse-engineering/analyze-apk.sh "/path/to/com.oytechnology.Neon_Attack-5.0.3-31.zip"
set -euo pipefail

INPUT="${1:-com.oytechnology.Neon_Attack-5.0.3-31.zip}"
OUT_DIR="$(cd "$(dirname "$0")" && pwd)/output"
FINDINGS="$OUT_DIR/protocol-findings.txt"
WORK="$OUT_DIR/work"

mkdir -p "$WORK" "$OUT_DIR"
: > "$FINDINGS"

log() { echo "[analyze-apk] $*" | tee -a "$FINDINGS"; }

if [[ ! -f "$INPUT" ]]; then
  echo "ERROR: File not found: $INPUT" >&2
  echo "Usage: $0 [/path/to/com.oytechnology.Neon_Attack-5.0.3-31.zip]" >&2
  exit 1
fi

log "=== Neon Attack APK Protocol Extractor ==="
log "Input: $INPUT"
log "Output: $FINDINGS"
log ""

# Resolve APK (outer zip may contain .apk, or input may be .apk directly)
APK=""
case "$INPUT" in
  *.apk) APK="$INPUT" ;;
  *.zip)
    unzip -l "$INPUT" | head -20 >> "$FINDINGS"
    APK=$(unzip -Z1 "$INPUT" | rg -i '\.apk$' | head -1 || true)
    if [[ -n "$APK" ]]; then
      log "Extracting $APK from zip..."
      unzip -o -j "$INPUT" "$APK" -d "$WORK"
      APK="$WORK/$(basename "$APK")"
    else
      log "No .apk inside zip; treating zip as APK container..."
      cp "$INPUT" "$WORK/app.apk"
      APK="$WORK/app.apk"
    fi
    ;;
  *) echo "ERROR: Expected .apk or .zip" >&2; exit 1 ;;
esac

log "APK path: $APK ($(du -h "$APK" | cut -f1))"
log ""

# --- Method 1: strings on DEX (works without jadx) ---
log "=== strings scan (classes.dex) ==="
DEX_DIR="$WORK/dex"
mkdir -p "$DEX_DIR"
unzip -o -j "$APK" 'classes*.dex' -d "$DEX_DIR" 2>/dev/null || true

for dex in "$DEX_DIR"/classes*.dex; do
  [[ -f "$dex" ]] || continue
  log "--- $(basename "$dex") ---"
  strings "$dex" | rg -i '6e40000[0-9a-f-]{28}|B=|S=|C=|M=|Flash|Beat|Sensitivity|NUS|UART|BluetoothGatt|writeCharacteristic|FloRo|Neon' \
    | sort -u >> "$FINDINGS" || true
done
log ""

# --- Method 2: jadx decompile (if installed) ---
JADX=""
if command -v jadx >/dev/null 2>&1; then
  JADX="jadx"
elif [[ -x "/tmp/apk-re/jadx/bin/jadx" ]]; then
  JADX="/tmp/apk-re/jadx/bin/jadx"
fi

if [[ -n "$JADX" ]]; then
  SRC="$WORK/jadx-src"
  rm -rf "$SRC"
  log "=== jadx decompile ==="
  "$JADX" -d "$SRC" "$APK" 2>&1 | tail -5 | tee -a "$FINDINGS"
  log ""
  log "=== jadx source grep ==="
  rg -n -i '6e40000[0-9a-f-]{28}|"B=|"S=|"C=|"M=|Flash|Beat|Sensitivity|writeCharacteristic|setValue|NUS|UART' "$SRC" \
    --glob '*.java' 2>/dev/null | head -200 >> "$FINDINGS" || true
else
  log "jadx not found. Install for deeper analysis: brew install jadx"
fi
log ""

# --- Method 3: AndroidManifest + resources ---
log "=== manifest & resources ==="
unzip -p "$APK" AndroidManifest.xml 2>/dev/null | strings | head -50 >> "$FINDINGS" || true
RES_DIR="$WORK/res"
mkdir -p "$RES_DIR"
unzip -o "$APK" 'res/*' -d "$RES_DIR" 2>/dev/null || true
rg -r '' -i 'flash|beat|sensitivity|brightness|speed|mode|color|bluetooth' "$RES_DIR" 2>/dev/null | head -80 >> "$FINDINGS" || true
log ""

log "=== DONE ==="
log "Review: $FINDINGS"
log ""
log "Next: commit and push so the cloud agent can read results:"
log "  git add reverse-engineering/output/protocol-findings.txt"
log "  git commit -m 'Add Neon Attack protocol findings from local APK analysis'"
log "  git push"
