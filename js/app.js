import { FloroBleController, isBleSupported } from './ble.js';
import { createColorPicker } from './color-picker.js';
import { hexToRgb } from './protocol.js';
import {
  APP_VERSION,
  createLogger,
  filterAnimationOptions,
  haptic,
  rgbToHex,
  setDisplayView,
  setupCompatBanner,
  setupFavoriteModal,
  setupPaletteToggle,
  setupPwaInstall,
  setupSettingsSheet,
  updateConnectionChip,
  updateNeonThemeColor,
  WakeLockManager,
} from './ui.js';

const defaultFavorites = [
  { mode: 32, label: 'Pattern 32' },
  { mode: 34, label: 'Pattern 34' },
  { mode: 35, label: 'Pattern 35' },
  { mode: 38, label: 'Pattern 38' },
  { mode: 50, label: 'Pattern 50' },
  { mode: 66, label: 'Pattern 66' },
  { mode: 102, label: 'Pattern 102' },
  { mode: 108, label: 'Pattern 108' },
];

const btnConnect = document.getElementById('btn-connect');
const btnReconnect = document.getElementById('btn-reconnect');
const btnDisconnect = document.getElementById('btn-disconnect');
const deviceNameEl = document.getElementById('device-name');
const connectionStatus = document.getElementById('connection-status');
const statusChip = document.getElementById('status-chip');
const statusChipText = document.getElementById('status-chip-text');

const powerStrip = document.getElementById('power-strip');
const solidControls = document.getElementById('solid-controls');
const colorPanel = document.getElementById('color-panel');
const animControls = document.getElementById('anim-controls');
const animationPanel = document.getElementById('animation-panel');
const powerBtn = document.getElementById('power-btn');

const modeSegSolid = document.getElementById('mode-seg-solid');
const modeSegAnimation = document.getElementById('mode-seg-animation');
const solidView = document.getElementById('solid-view');
const animationView = document.getElementById('animation-view');

const sliderBrightness = document.getElementById('slider-brightness');
const sliderBrightnessAnim = document.getElementById('slider-brightness-anim');
const valBrightness = document.getElementById('val-brightness');
const valBrightnessAnim = document.getElementById('val-brightness-anim');
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed = document.getElementById('val-speed');
const customColorPickerRoot = document.getElementById('custom-color-picker');
const animDropdown = document.getElementById('anim-dropdown');
const modeSearch = document.getElementById('mode-search');
const favoritesGrid = document.getElementById('favorites-grid');

const consoleBody = document.getElementById('console-body');
const compatBanner = document.getElementById('compat-banner');
const appVersionEl = document.getElementById('app-version');

const controlPanels = [solidControls, colorPanel, animControls, animationPanel];
const themePanels = [powerStrip, ...controlPanels];

let isPoweredOn = true;
let lastBrightnessVal = 8;
let lastSpeedVal = 50;
let activeColor = '#ff0000';
let activeModeVal = 1;
let lastAnimationMode = 32;
let displayView = 'solid';
let favorites = [];
let connectionState = 'offline';

const log = createLogger(consoleBody);
const wakeLock = new WakeLockManager(log);

if (appVersionEl) {
  appVersionEl.textContent = `v${APP_VERSION}`;
}

const colorPicker = createColorPicker({
  root: customColorPickerRoot,
  initialHex: activeColor,
  onColorChange: (hex) => {
    activeColor = updateNeonThemeColor(hex, themePanels);
    document.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('selected'));
  },
  onColorCommit: () => {
    haptic('light');
    applyColorSelection();
  },
});

const ble = new FloroBleController({
  onLog: log,
  onConnectionChange: (connected, name) => {
    if (connected) {
      deviceNameEl.textContent = name;
      connectionStatus.textContent = 'CONNECTED';
      connectionStatus.className = 'status-pill connected';
      btnConnect.classList.add('hidden');
      btnReconnect.classList.add('hidden');
      btnDisconnect.classList.remove('hidden');
      enablePanels(true);
      wakeLock.acquire();
      setConnectionState('connected', name);
    } else {
      resetUI();
    }
  },
  onDisconnect: () => {
    wakeLock.release();
  },
});

function setConnectionState(state, name = '') {
  connectionState = state;
  updateConnectionChip(statusChip, statusChipText, state, name, ble.lastDeviceInfo);
}

function enablePanels(enabled) {
  controlPanels.forEach((p) => p.classList.toggle('disabled-control', !enabled));
  setPowerStripEnabled(enabled);
}

function setPowerStripEnabled(enabled) {
  if (!powerStrip) return;
  powerStrip.classList.toggle('disabled-control', !enabled);
}

function resetUI() {
  deviceNameEl.textContent = 'Not connected';
  connectionStatus.textContent = 'OFFLINE';
  connectionStatus.className = 'status-pill';
  btnConnect.classList.remove('hidden');
  btnDisconnect.classList.add('hidden');
  enablePanels(false);
  updateReconnectButton();
  setConnectionState('offline');
}

function updateReconnectButton() {
  if (!isBleSupported() || ble.isConnected) {
    btnReconnect.classList.add('hidden');
    return;
  }

  const last = ble.lastDeviceInfo;
  if (ble.canReconnect() && last) {
    btnReconnect.textContent = `Reconnect to ${last.name}`;
    btnReconnect.classList.remove('hidden');
  } else {
    btnReconnect.classList.add('hidden');
  }
}

async function syncSceneToSign({ includeMode } = {}) {
  if (!ble.isConnected) return;

  const { r, g, b } = hexToRgb(colorPicker.getHex());
  await ble.sendScene({
    brightness: isPoweredOn ? lastBrightnessVal : 0,
    speed: lastSpeedVal,
    r,
    g,
    b,
    mode: activeModeVal,
    includeMode: includeMode ?? true,
  });
}

function syncColorToSign() {
  return syncSceneToSign({ includeMode: activeModeVal !== 1 });
}

function syncDisplayViewWithMode() {
  const target = activeModeVal === 1 ? 'solid' : 'animation';
  if (target !== displayView) {
    displayView = target;
    setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, target);
  }
}

function updateModeDropdown(mode) {
  if (modeSearch.value) {
    modeSearch.value = '';
    filterAnimationOptions(animDropdown, '', mode);
  } else {
    animDropdown.value = mode;
  }
}

function setMode(mode, { sendBle = true } = {}) {
  activeModeVal = mode;
  if (mode > 1) {
    lastAnimationMode = mode;
  }

  updateModeDropdown(mode);
  highlightActiveFavorite();
  syncDisplayViewWithMode();

  if (!sendBle) return;

  ble.bumpSceneGeneration();
  if (ble.isConnected && isPoweredOn) {
    ble.sendMode(mode);
  }
  haptic('light');
}

async function applyColorSelection() {
  const switchingFromAnimation = activeModeVal !== 1;

  if (switchingFromAnimation) {
    displayView = 'solid';
    setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid');
    setMode(1, { sendBle: false });
    ble.bumpSceneGeneration();
    await syncSceneToSign({ includeMode: true });
    return;
  }

  await syncColorToSign();
}

async function onConnected() {
  isPoweredOn = true;
  updatePowerUI(true);
  log(`Applying flow mode ${activeModeVal}…`, 'info');
  await syncSceneToSign();
}

async function connectDevice() {
  if (!isBleSupported()) {
    log('Web Bluetooth is not available.', 'error');
    return;
  }

  try {
    setConnectionState('connecting');
    btnConnect.disabled = true;
    btnReconnect.disabled = true;
    await ble.connectNew();
    await onConnected();
    haptic('light');
  } catch (error) {
    if (error.name !== 'NotFoundError') {
      log(`Connection error: ${error.message}`, 'error');
    } else {
      log('Scan cancelled.', 'info');
    }
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
  }
}

async function reconnectDevice() {
  if (!isBleSupported()) return;

  try {
    setConnectionState('connecting');
    btnConnect.disabled = true;
    btnReconnect.disabled = true;
    await ble.reconnectLast();
    await onConnected();
    haptic('light');
  } catch (error) {
    log(`Reconnect error: ${error.message}`, 'error');
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
  }
}

function disconnectDevice() {
  ble.disconnect();
  wakeLock.release();
  haptic('light');
}

window.setPowerState = function (on) {
  isPoweredOn = on;
  updatePowerUI(on);
  haptic(on ? 'light' : 'heavy');
  if (!ble.isConnected) return;
  if (on) {
    syncSceneToSign();
  } else {
    ble.sendBrightness(0);
  }
};

if (powerBtn) {
  powerBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!ble.isConnected) {
      haptic('heavy');
      log('Connect to your sign before using power.', 'info');
      return;
    }
    setPowerState(!isPoweredOn);
  });
}

function updatePowerUI(on) {
  if (powerBtn) {
    powerBtn.classList.toggle('is-on', on);
    powerBtn.setAttribute('aria-pressed', on ? 'true' : 'false');
    powerBtn.setAttribute('aria-label', on ? 'Power on' : 'Power off');
  }

  syncControlPanelsEnabled();

  if (on) {
    syncBrightnessSliders(lastBrightnessVal);
  } else {
    valBrightness.textContent = 'OFF';
    valBrightnessAnim.textContent = 'OFF';
  }
}

function syncControlPanelsEnabled() {
  const enabled = ble.isConnected && isPoweredOn;
  controlPanels.forEach((p) => p.classList.toggle('disabled-control', !enabled));
}

function syncBrightnessSliders(val) {
  sliderBrightness.value = val;
  sliderBrightnessAnim.value = val;
  const label = isPoweredOn ? `${val} / 8` : 'OFF';
  valBrightness.textContent = label;
  valBrightnessAnim.textContent = label;
}

function stepBrightness(delta) {
  if (!ble.isConnected || !isPoweredOn) return;
  const next = Math.min(8, Math.max(1, lastBrightnessVal + delta));
  if (next === lastBrightnessVal) return;
  haptic('light');
  onBrightnessInput(next, { immediate: true });
}

function stepSpeed(delta) {
  if (!ble.isConnected || !isPoweredOn) return;
  const next = Math.min(100, Math.max(0, lastSpeedVal + delta));
  if (next === lastSpeedVal) return;
  haptic('light');
  onSpeedInput(next, { immediate: true });
}

function bindStepperButtons() {
  document.querySelectorAll('[data-step-brightness]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stepBrightness(Number(btn.dataset.stepBrightness));
    });
  });
  document.querySelectorAll('[data-step-speed]').forEach((btn) => {
    btn.addEventListener('click', () => {
      stepSpeed(Number(btn.dataset.stepSpeed));
    });
  });
}

function onBrightnessInput(val, { immediate = false } = {}) {
  lastBrightnessVal = val;
  syncBrightnessSliders(val);
  if (bTimeout) clearTimeout(bTimeout);
  const send = () => {
    if (isPoweredOn) ble.sendBrightness(val);
  };
  if (immediate) {
    send();
  } else {
    bTimeout = setTimeout(send, 120);
  }
}

let bTimeout = null;
sliderBrightness.addEventListener('input', (e) => onBrightnessInput(parseInt(e.target.value, 10)));
sliderBrightnessAnim.addEventListener('input', (e) => onBrightnessInput(parseInt(e.target.value, 10)));

function onSpeedInput(val, { immediate = false } = {}) {
  lastSpeedVal = val;
  sliderSpeed.value = val;
  valSpeed.textContent = `${val}%`;
  if (sTimeout) clearTimeout(sTimeout);
  const send = () => {
    if (ble.isConnected && isPoweredOn) ble.sendSpeed(val);
  };
  if (immediate) {
    send();
  } else {
    sTimeout = setTimeout(send, 120);
  }
}

let sTimeout = null;
sliderSpeed.addEventListener('input', (e) => onSpeedInput(parseInt(e.target.value, 10)));

window.selectSwatch = function (btn, r, g, b) {
  document.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('selected'));
  btn.classList.add('selected');
  colorPicker.setHex(rgbToHex(r, g, b), { commit: false });
  haptic('light');
  applyColorSelection();
};

animDropdown.addEventListener('change', (e) => {
  setMode(parseInt(e.target.value, 10));
});

window.stepMode = function stepMode(delta) {
  let mode = parseInt(animDropdown.value, 10) + delta;
  if (mode < 1) mode = 200;
  if (mode > 200) mode = 1;
  setMode(mode);
};

modeSearch.addEventListener('input', (e) => {
  filterAnimationOptions(animDropdown, e.target.value, activeModeVal);
});

function loadFavorites() {
  const stored = localStorage.getItem('floro_favorites');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        favorites = parsed;
      } else {
        throw new Error('Invalid favorites data');
      }
    } catch {
      favorites = [...defaultFavorites];
      saveFavorites();
      log('Preset data was corrupted — restored defaults.', 'info');
    }
  } else {
    favorites = [...defaultFavorites];
    saveFavorites();
  }
  renderFavorites();
}

function saveFavorites() {
  localStorage.setItem('floro_favorites', JSON.stringify(favorites));
}

function renderFavorites() {
  favoritesGrid.innerHTML = '';
  favorites.forEach((fav) => {
    const chip = document.createElement('div');
    chip.className = `fav-chip ${fav.mode === activeModeVal ? 'active' : ''}`;
    chip.setAttribute('data-mode', fav.mode);

    const labelSpan = document.createElement('span');
    labelSpan.textContent = fav.label;
    labelSpan.addEventListener('click', () => setMode(fav.mode));
    chip.appendChild(labelSpan);

    const removeBtn = document.createElement('span');
    removeBtn.className = 'fav-chip-remove';
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      removeFavorite(fav.mode);
    });
    chip.appendChild(removeBtn);

    favoritesGrid.appendChild(chip);
  });
}

function highlightActiveFavorite() {
  document.querySelectorAll('.fav-chip').forEach((chip) => {
    const mode = parseInt(chip.getAttribute('data-mode'), 10);
    chip.classList.toggle('active', mode === activeModeVal);
  });
}

window.addCurrentToFavorites = function () {
  const mode = activeModeVal;
  if (favorites.some((f) => f.mode === mode)) {
    log('Mode is already in your favorites.', 'info');
    return;
  }
  window.openFavoriteModal(mode);
};

function removeFavorite(mode) {
  favorites = favorites.filter((f) => f.mode !== mode);
  saveFavorites();
  renderFavorites();
  log(`Removed Mode ${mode} from presets.`, 'info');
}

btnConnect.addEventListener('click', connectDevice);
btnReconnect.addEventListener('click', reconnectDevice);
btnDisconnect.addEventListener('click', disconnectDevice);

modeSegSolid.addEventListener('click', () => {
  if (displayView === 'solid') return;
  displayView = 'solid';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid');
  if (activeModeVal !== 1) setMode(1);
});

modeSegAnimation.addEventListener('click', () => {
  if (displayView === 'animation') return;
  displayView = 'animation';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'animation');
  if (activeModeVal === 1) setMode(lastAnimationMode);
});

statusChip.addEventListener('click', () => {
  window.openSettingsSheet?.();
});

filterAnimationOptions(animDropdown, '', lastAnimationMode);
animDropdown.value = lastAnimationMode;
displayView = 'solid';
setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid', { animate: false });
lastSpeedVal = parseInt(sliderSpeed.value, 10);
loadFavorites();
updateReconnectButton();
setupCompatBanner(compatBanner, log);
setupPaletteToggle(
  document.getElementById('palette-toggle'),
  document.getElementById('palette-body')
);

setupSettingsSheet({
  sheet: document.getElementById('settings-sheet'),
  openBtn: document.getElementById('btn-menu'),
  closeBtn: document.getElementById('btn-close-settings'),
});

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
    favorites.push({ mode, label: name });
    saveFavorites();
    renderFavorites();
    log(`Added Mode ${mode} to presets.`, 'success');
    haptic('light');
  },
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').then(
      (reg) => console.log('ServiceWorker registered:', reg.scope),
      (err) => console.warn('ServiceWorker registration failed:', err)
    );
  });
}

async function tryAutoReconnect() {
  if (!isBleSupported() || !ble.canReconnect() || !ble.lastDeviceInfo) return;

  log(`Auto-connecting to ${ble.lastDeviceInfo.name}…`, 'info');
  setConnectionState('connecting');

  try {
    btnConnect.disabled = true;
    btnReconnect.disabled = true;
    await ble.reconnectLast();
    await onConnected();
  } catch (error) {
    log(`Auto-connect failed: ${error.message}`, 'error');
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
  }
}

bindStepperButtons();
setPowerStripEnabled(false);
syncControlPanelsEnabled();
updatePowerUI(isPoweredOn);

log('System ready.', 'info');
tryAutoReconnect();
