#!/usr/bin/env bash
# T8: ID preservation gate for mint UI restructure
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
HTML="$ROOT/index.html"
MISSING=0

IDS=(
  compat-banner connect-prompt btn-connect-main btn-reconnect-main
  status-chip status-chip-text btn-menu remote-dock power-btn
  install-banner install-banner-title install-banner-subtitle btn-install btn-dismiss-install
  solid-view animation-view color-strip color-hero-swatch color-hero-name color-hero-type color-recents-strip
  mode-seg-solid mode-seg-animation solid-controls color-panel
  slider-brightness val-brightness palette-toggle btn-save-color-preset color-presets-row
  anim-controls animation-panel slider-brightness-anim val-brightness-anim
  slider-speed val-speed anim-mode-picker-btn anim-mode-hero-num anim-mode-hero-name
  anim-mode-hero-meta anim-stepper-readout favorites-grid anim-dropdown mode-search mode-list
  settings-sheet btn-connect btn-reconnect btn-disconnect device-name connection-status
  console-body btn-settings-install btn-close-settings app-version
  palette-sheet custom-color-picker btn-close-palette
  mode-picker-sheet mode-search-sheet mode-list-sheet btn-close-mode-picker
  favorite-modal color-preset-modal install-modal
)

for id in "${IDS[@]}"; do
  if ! grep -q "id=\"${id}\"" "$HTML"; then
    echo "MISSING: #${id}"
    MISSING=$((MISSING + 1))
  fi
done

if [ "$MISSING" -gt 0 ]; then
  echo "FAIL: $MISSING required ID(s) missing from index.html"
  exit 1
fi

echo "OK: all ${#IDS[@]} required IDs present"
