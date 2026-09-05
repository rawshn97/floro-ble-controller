import { els, getColorPicker, log, persistSceneNow, state } from './app-context.js';
import { initClarity } from './clarity.js';
import {
  getMaxColorPresets,
  initColorUI,
  pickColor,
  renderColorPresets,
  saveColorPresets,
  updatePreviewChrome,
} from './color-ui.js';
import { initConnection, tryAutoReconnect } from './connection.js';
import {
  addCurrentToFavorites,
  initModeUI,
  renderFavorites,
  renderModeList,
  saveFavorites,
  setMode,
  stepMode,
  updateModeHero,
} from './mode-ui.js';
import { formatModeLabel, getModeName } from './mode-names.js';
import { setupPwaInstall } from './pwa-install.js';
import { initSceneSync, setPowerState } from './scene-sync.js';
import {
  APP_VERSION,
  rgbToHex,
  haptic,
  setupColorPresetModal,
  setupCompatBanner,
  setupFavoriteModal,
  setupModePickerSheet,
  setupPaletteToggle,
  setupSettingsSheet,
} from './ui.js';

if (els.appVersionEl) {
  els.appVersionEl.textContent = `v${APP_VERSION}`;
}

window.__floroModeNames = {
  formatModeLabel,
  getModeName,
  renderModeList,
  updateModeHero,
};

window.setPowerState = setPowerState;

window.selectSwatch = function (btn, r, g, b) {
  pickColor(rgbToHex(r, g, b));
};

window.selectNeonSwatch = function (hex) {
  pickColor(hex);
};

window.stepMode = stepMode;
window.addCurrentToFavorites = addCurrentToFavorites;

initColorUI();
initModeUI();
initSceneSync();
initConnection();

els.statusChip?.addEventListener('click', () => {
  window.openSettingsSheet?.();
});

document.querySelectorAll('.adjust-context-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.adjust-context-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    const target = btn.getAttribute('data-adjust');
    document.querySelectorAll('.control-row[data-control]').forEach((row) => {
      row.classList.toggle('control-row--active', row.getAttribute('data-control') === target);
    });
  });
});

setupPaletteToggle(els.paletteToggle, {
  sheet: document.getElementById('palette-sheet'),
  closeBtn: document.getElementById('btn-close-palette'),
});

setupPaletteToggle(els.btnOpenPalette, {
  sheet: document.getElementById('palette-sheet'),
  closeBtn: document.getElementById('btn-close-palette'),
});

setupSettingsSheet({
  sheet: document.getElementById('settings-sheet'),
  openBtn: document.getElementById('btn-menu'),
  closeBtn: document.getElementById('btn-close-settings'),
});

setupModePickerSheet({
  sheet: document.getElementById('mode-picker-sheet'),
  openBtn: document.getElementById('anim-mode-picker-btn'),
  closeBtn: document.getElementById('btn-close-mode-picker'),
  searchInput: els.modeSearchSheet,
  listEl: els.modeListSheet,
  onModeSelect: (mode) => setMode(mode),
});

initClarity();

setupPwaInstall({
  bannerEl: document.getElementById('install-banner'),
  bannerTitle: document.getElementById('install-banner-title'),
  bannerSubtitle: document.getElementById('install-banner-subtitle'),
  btnInstall: document.getElementById('btn-install'),
  btnDismiss: document.getElementById('btn-dismiss-install'),
  settingsBtn: document.getElementById('btn-settings-install'),
  modal: document.getElementById('install-modal'),
  modalTitle: document.getElementById('install-modal-title'),
  modalDesc: document.getElementById('install-modal-desc'),
  modalSteps: document.getElementById('install-modal-steps'),
  modalClose: document.getElementById('install-modal-close'),
  modalAction: document.getElementById('install-modal-action'),
  log,
});

setupFavoriteModal({
  modal: document.getElementById('favorite-modal'),
  input: document.getElementById('favorite-name-input'),
  btnConfirm: document.getElementById('favorite-modal-confirm'),
  btnCancel: document.getElementById('favorite-modal-cancel'),
  onConfirm: (mode, name) => {
    state.favorites.push({ mode, label: name });
    saveFavorites();
    renderFavorites();
    log(`Added Mode ${mode} to presets.`, 'success');
    haptic('light');
  },
});

setupColorPresetModal({
  modal: document.getElementById('color-preset-modal'),
  input: document.getElementById('color-preset-name-input'),
  btnConfirm: document.getElementById('color-preset-modal-confirm'),
  btnCancel: document.getElementById('color-preset-modal-cancel'),
  onConfirm: (name) => {
    const hex = getColorPicker().getHex();
    if (state.colorPresets.some((p) => p.hex.toLowerCase() === hex.toLowerCase())) {
      log('This color is already saved.', 'info');
      return;
    }
    const max = getMaxColorPresets();
    if (state.colorPresets.length >= max) {
      const removed = state.colorPresets.pop();
      log(`Removed "${removed.label}" to make room for new preset.`, 'info');
    }
    state.colorPresets.unshift({ hex, label: name });
    saveColorPresets();
    renderColorPresets();
    updatePreviewChrome();
    log(`Saved color preset "${name}".`, 'success');
    haptic('light');
  },
});

setupCompatBanner(els.compatBanner, log);

log('System ready.', 'info');
tryAutoReconnect();

window.addEventListener('pagehide', persistSceneNow);
window.addEventListener('beforeunload', persistSceneNow);
