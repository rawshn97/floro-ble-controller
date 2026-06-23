import { FloroBleController, isBleSupported } from './ble.js';
import { createColorPicker } from './color-picker.js';
import { hexToRgb } from './protocol.js';
import {
  createLogger,
  filterAnimationOptions,
  haptic,
  rgbToHex,
  setupCompatBanner,
  setupFavoriteModal,
  setupPwaInstall,
  toggleConsole,
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

const powerPanel = document.getElementById('power-panel');
const controlsPanel = document.getElementById('controls-panel');
const displayModeBar = document.getElementById('display-mode-bar');
const colorPanel = document.getElementById('color-panel');
const animationPanel = document.getElementById('animation-panel');
const powerStatusText = document.getElementById('power-status-text');

const modeSegSolid = document.getElementById('mode-seg-solid');
const modeSegAnimation = document.getElementById('mode-seg-animation');
const modeStatusEl = document.getElementById('mode-status');
const modeStatusText = document.getElementById('mode-status-text');

const sliderBrightness = document.getElementById('slider-brightness');
const valBrightness = document.getElementById('val-brightness');
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed = document.getElementById('val-speed');
const customColorPickerRoot = document.getElementById('custom-color-picker');
const animDropdown = document.getElementById('anim-dropdown');
const modeSearch = document.getElementById('mode-search');
const favoritesGrid = document.getElementById('favorites-grid');

const consoleBody = document.getElementById('console-body');
const consoleArrow = document.getElementById('console-arrow');
const compatBanner = document.getElementById('compat-banner');

const panels = [powerPanel, controlsPanel, displayModeBar, colorPanel, animationPanel];

let isPoweredOn = true;
let lastBrightnessVal = 8;
let lastSpeedVal = 50;
let activeColor = '#ff0000';
let activeModeVal = 32;
let lastAnimationMode = 32;
let favorites = [];

const log = createLogger(consoleBody);
const wakeLock = new WakeLockManager(log);

const colorPicker = createColorPicker({
  root: customColorPickerRoot,
  initialHex: activeColor,
  onColorChange: (hex) => {
    activeColor = updateNeonThemeColor(hex, panels);
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
      deviceNameEl.style.color = 'var(--text)';
      connectionStatus.textContent = 'CONNECTED';
      connectionStatus.className = 'status-badge connected';
      btnConnect.classList.add('hidden');
      btnReconnect.classList.add('hidden');
      btnDisconnect.classList.remove('hidden');
      enablePanels(true);
      wakeLock.acquire();
      updateReconnectButton();
    } else {
      resetUI();
    }
  },
  onDisconnect: () => {
    wakeLock.release();
  },
});

function enablePanels(enabled) {
  panels.forEach((p) => p.classList.toggle('disabled-control', !enabled));
}

function resetUI() {
  deviceNameEl.textContent = 'Disconnected';
  deviceNameEl.style.color = 'var(--text-muted)';
  connectionStatus.textContent = 'OFFLINE';
  connectionStatus.className = 'status-badge';
  btnConnect.classList.remove('hidden');
  btnDisconnect.classList.add('hidden');
  enablePanels(false);
  updateReconnectButton();
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
    // Solid color (mode 1): color changes only need C=; M1 is sent once via setMode.
    includeMode: includeMode ?? true,
  });
}

function syncColorToSign() {
  return syncSceneToSign({ includeMode: activeModeVal !== 1 });
}

function updateModeStatusUI() {
  const isSolid = activeModeVal === 1;

  modeSegSolid.classList.toggle('active', isSolid);
  modeSegSolid.setAttribute('aria-selected', isSolid ? 'true' : 'false');
  modeSegAnimation.classList.toggle('active', !isSolid);
  modeSegAnimation.setAttribute('aria-selected', !isSolid ? 'true' : 'false');

  modeStatusEl.classList.toggle('mode-status-solid', isSolid);
  modeStatusEl.classList.toggle('mode-status-animation', !isSolid);
  modeStatusText.textContent = isSolid
    ? 'Solid color active'
    : `Animation active — Mode ${activeModeVal}`;
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
  updateModeStatusUI();

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
  if (on) {
    syncSceneToSign();
  } else {
    ble.sendBrightness(0);
  }
};

function updatePowerUI(on) {
  if (on) {
    powerStatusText.textContent = 'POWER ON';
    powerStatusText.className = 'power-status-indicator';
    controlsPanel.classList.remove('disabled-control');
    displayModeBar.classList.remove('disabled-control');
    colorPanel.classList.remove('disabled-control');
    animationPanel.classList.remove('disabled-control');
    sliderBrightness.value = lastBrightnessVal;
    valBrightness.textContent = `${lastBrightnessVal} / 8`;
  } else {
    powerStatusText.textContent = 'POWER OFF';
    powerStatusText.className = 'power-status-indicator off';
    controlsPanel.classList.add('disabled-control');
    displayModeBar.classList.add('disabled-control');
    colorPanel.classList.add('disabled-control');
    animationPanel.classList.add('disabled-control');
    valBrightness.textContent = 'OFF';
  }
}

let bTimeout = null;
sliderBrightness.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  lastBrightnessVal = val;
  valBrightness.textContent = `${val} / 8`;
  if (bTimeout) clearTimeout(bTimeout);
  bTimeout = setTimeout(() => {
    if (isPoweredOn) ble.sendBrightness(val);
  }, 120);
});

let sTimeout = null;
sliderSpeed.addEventListener('input', (e) => {
  const val = parseInt(e.target.value, 10);
  lastSpeedVal = val;
  valSpeed.textContent = `${val}%`;
  if (sTimeout) clearTimeout(sTimeout);
  sTimeout = setTimeout(() => {
    if (ble.isConnected && isPoweredOn) ble.sendSpeed(val);
  }, 120);
});

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

window.stepMode = function (delta) {
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
    favorites = JSON.parse(stored);
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

window.toggleConsole = () => toggleConsole(consoleBody, consoleArrow);

btnConnect.addEventListener('click', connectDevice);
btnReconnect.addEventListener('click', reconnectDevice);
btnDisconnect.addEventListener('click', disconnectDevice);

modeSegSolid.addEventListener('click', () => {
  if (activeModeVal === 1) return;
  setMode(1);
});

modeSegAnimation.addEventListener('click', () => {
  if (activeModeVal > 1) return;
  setMode(lastAnimationMode);
});

filterAnimationOptions(animDropdown, '', activeModeVal);
animDropdown.value = activeModeVal;
updateModeStatusUI();
lastSpeedVal = parseInt(sliderSpeed.value, 10);
loadFavorites();
updateReconnectButton();
setupCompatBanner(compatBanner, log);

setupPwaInstall({
  bannerEl: document.getElementById('install-banner'),
  bannerTitle: document.getElementById('install-banner-title'),
  bannerSubtitle: document.getElementById('install-banner-subtitle'),
  iosStepsEl: document.getElementById('install-ios-steps'),
  btnInstall: document.getElementById('btn-install'),
  btnDismiss: document.getElementById('btn-dismiss-install'),
  headerBtn: document.getElementById('btn-header-install'),
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

log('System ready. Click Connect to find FloRo.', 'info');
