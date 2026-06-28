import { FloroBleController, isBleSupported } from './ble.js';
import { createColorPicker } from './color-picker.js';
import {
  formatModeLabel,
  getModeName,
  listModes,
  MODE_COUNT,
} from './mode-names.js';
import { hexToRgb } from './protocol.js';
import {
  flushSceneSave,
  loadSceneState,
  scheduleSceneSave,
} from './state.js';
import {
  APP_VERSION,
  createLogger,
  filterAnimationOptions,
  haptic,
  rgbToHex,
  setDisplayView,
  setupColorPresetModal,
  setupCompatBanner,
  setupFavoriteModal,
  setupModePickerSheet,
  setupPaletteToggle,
  setupPwaInstall,
  setupSettingsSheet,
  updateConnectionChip,
  updateNeonThemeColor,
  WakeLockManager,
} from './ui.js';

const FAVORITES_KEY = 'floro_favorites';
const COLOR_PRESETS_KEY = 'floro_color_presets';

const defaultFavorites = [
  { mode: 32, label: getModeName(32) },
  { mode: 34, label: getModeName(34) },
  { mode: 35, label: getModeName(35) },
  { mode: 38, label: getModeName(38) },
];

const savedScene = loadSceneState();

const btnConnect = document.getElementById('btn-connect');
const btnReconnect = document.getElementById('btn-reconnect');
const btnDisconnect = document.getElementById('btn-disconnect');
const deviceNameEl = document.getElementById('device-name');
const connectionStatus = document.getElementById('connection-status');
const statusChip = document.getElementById('status-chip');
const statusChipText = document.getElementById('status-chip-text');

const remoteDock = document.getElementById('remote-dock');
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
const solidPreviewSwatch = document.getElementById('solid-preview-swatch');
const animPreviewName = document.getElementById('anim-preview-name');

const sliderBrightness = document.getElementById('slider-brightness');
const sliderBrightnessAnim = document.getElementById('slider-brightness-anim');
const valBrightness = document.getElementById('val-brightness');
const valBrightnessAnim = document.getElementById('val-brightness-anim');
const sliderSpeed = document.getElementById('slider-speed');
const valSpeed = document.getElementById('val-speed');
const customColorPickerRoot = document.getElementById('custom-color-picker');
const animDropdown = document.getElementById('anim-dropdown');
const modeSearch = document.getElementById('mode-search');
const modeSearchSheet = document.getElementById('mode-search-sheet');
const modeList = document.getElementById('mode-list');
const modeListSheet = document.getElementById('mode-list-sheet');
const favoritesGrid = document.getElementById('favorites-grid');
const colorPresetsRow = document.getElementById('color-presets-row');
const animModeHeroNum = document.getElementById('anim-mode-hero-num');
const animModeHeroName = document.getElementById('anim-mode-hero-name');
const animModeHeroMeta = document.getElementById('anim-mode-hero-meta');
const animStepperReadout = document.getElementById('anim-stepper-readout');

const modeHeroEls = {
  num: animModeHeroNum,
  name: animModeHeroName,
  meta: animModeHeroMeta,
  readout: animStepperReadout,
};

const consoleBody = document.getElementById('console-body');
const compatBanner = document.getElementById('compat-banner');
const appVersionEl = document.getElementById('app-version');

const controlPanels = [solidControls, colorPanel, animControls, animationPanel];
const themePanels = [remoteDock, powerStrip, ...controlPanels];

let isPoweredOn = savedScene.isPoweredOn;
let lastBrightnessVal = savedScene.brightness;
let lastSpeedVal = savedScene.speed;
let activeColor = savedScene.color;
let activeModeVal = savedScene.activeMode;
let lastAnimationMode = savedScene.lastAnimationMode;
let displayView = savedScene.displayView;
let favorites = [];
let colorPresets = [];
let connectionState = 'offline';
let suppressModeDropdownChange = false;
let sceneRestoreInFlight = null;

const log = createLogger(consoleBody);
const wakeLock = new WakeLockManager(log);

function getBleMode() {
  return displayView === 'solid' ? 1 : activeModeVal;
}

function getSceneSnapshot() {
  return {
    displayView,
    isPoweredOn,
    brightness: lastBrightnessVal,
    speed: lastSpeedVal,
    color: activeColor,
    activeMode: displayView === 'solid' ? 1 : activeModeVal,
    lastAnimationMode,
  };
}

function persistScene() {
  scheduleSceneSave(getSceneSnapshot);
}

function persistSceneNow() {
  flushSceneSave(getSceneSnapshot);
}

if (appVersionEl) {
  appVersionEl.textContent = `v${APP_VERSION}`;
}

function updatePreviewChrome() {
  if (solidPreviewSwatch) {
    solidPreviewSwatch.style.background = activeColor;
  }
  if (animPreviewName) {
    animPreviewName.textContent = getModeName(activeModeVal);
  }
}

function syncRemotePanels() {
  const isSolid = displayView === 'solid';
  solidControls?.classList.toggle('hidden', !isSolid);
  animControls?.classList.toggle('hidden', isSolid);
}

const colorPicker = createColorPicker({
  root: customColorPickerRoot,
  initialHex: activeColor,
  onColorChange: (hex) => {
    activeColor = updateNeonThemeColor(hex, themePanels);
    updatePreviewChrome();
    document.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('selected'));
    persistScene();
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
      persistSceneNow();
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
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', !enabled));
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
  setPowerStripEnabled(false);
  syncControlPanelsEnabled();
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

async function syncSceneToSign({ includeMode, mode: modeOverride } = {}) {
  if (!ble.isConnected) return;

  const { r, g, b } = hexToRgb(colorPicker.getHex());
  const mode = modeOverride ?? getBleMode();
  await ble.sendScene({
    brightness: isPoweredOn ? lastBrightnessVal : 0,
    speed: lastSpeedVal,
    r,
    g,
    b,
    mode,
    includeMode: includeMode ?? true,
  });
}

function syncColorToSign() {
  return syncSceneToSign({ includeMode: getBleMode() !== 1 });
}

function syncDisplayViewWithMode() {
  const target = activeModeVal === 1 ? 'solid' : 'animation';
  if (target !== displayView) {
    displayView = target;
    setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, target);
    syncRemotePanels();
  }
}

function renderModeList(listEl, { query = '', activeMode = 1 } = {}) {
  if (!listEl) return;

  const modes = listModes({ query, limit: MODE_COUNT });
  listEl.innerHTML = '';

  if (modes.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'mode-list-empty';
    empty.textContent = 'No modes match your search.';
    listEl.appendChild(empty);
    return;
  }

  modes.forEach(({ mode, name, label }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `mode-list-item${mode === activeMode ? ' is-active' : ''}`;
    btn.setAttribute('role', 'option');
    btn.setAttribute('aria-selected', mode === activeMode ? 'true' : 'false');
    btn.dataset.mode = String(mode);

    const num = document.createElement('span');
    num.className = 'mode-list-num';
    num.textContent = String(mode).padStart(3, '0');

    const copy = document.createElement('span');
    copy.className = 'mode-list-copy';

    const title = document.createElement('span');
    title.className = 'mode-list-name';
    title.textContent = name;

    const subtitle = document.createElement('span');
    subtitle.className = 'mode-list-sub';
    subtitle.textContent = mode === 1 ? 'Solid color on sign' : label;

    copy.appendChild(title);
    copy.appendChild(subtitle);

    btn.appendChild(num);
    btn.appendChild(copy);
    btn.addEventListener('click', () => setMode(mode));
    listEl.appendChild(btn);
  });

  const activeItem = listEl.querySelector('.mode-list-item.is-active');
  activeItem?.scrollIntoView({ block: 'nearest' });
}

function updateModeHero(heroEls, mode) {
  const num = Number(mode);
  if (heroEls.num) heroEls.num.textContent = String(num);
  if (heroEls.name) heroEls.name.textContent = getModeName(num);
  if (heroEls.meta) heroEls.meta.textContent = `Mode ${num} of ${MODE_COUNT}`;
  if (heroEls.readout) heroEls.readout.textContent = formatModeLabel(num);
  updatePreviewChrome();
}

window.__floroModeNames = {
  formatModeLabel,
  getModeName,
  renderModeList,
  updateModeHero,
};

function refreshAnimationPicker(mode = activeModeVal) {
  const query = modeSearchSheet?.value || modeSearch?.value || '';
  const pickerMode = displayView === 'solid' ? 1 : mode;
  suppressModeDropdownChange = true;
  try {
    filterAnimationOptions(animDropdown, query, pickerMode, modeListSheet || modeList, modeHeroEls);
    if (modeListSheet) {
      renderModeList(modeListSheet, { query, activeMode: pickerMode });
    }
  } finally {
    suppressModeDropdownChange = false;
  }
}

function setAnimDropdownValue(mode) {
  suppressModeDropdownChange = true;
  animDropdown.value = String(mode);
  suppressModeDropdownChange = false;
}

function updateModeDropdown(mode) {
  setAnimDropdownValue(mode);
  renderModeList(modeList, { activeMode: mode });
  renderModeList(modeListSheet, { activeMode: mode, query: modeSearchSheet?.value || '' });
  updateModeHero(modeHeroEls, mode);
}

function setMode(mode, { sendBle = true } = {}) {
  if (sceneRestoreInFlight) {
    sendBle = false;
  }

  activeModeVal = mode;
  if (mode > 1) {
    lastAnimationMode = mode;
  }

  updateModeDropdown(mode);
  highlightActiveFavorite();
  syncDisplayViewWithMode();
  persistScene();

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
    syncRemotePanels();
    setMode(1, { sendBle: false });
    ble.bumpSceneGeneration();
    persistScene();
    await syncSceneToSign({ includeMode: true });
    return;
  }

  persistScene();
  await syncColorToSign();
}

async function restoreSceneToSign() {
  if (sceneRestoreInFlight) return sceneRestoreInFlight;

  sceneRestoreInFlight = (async () => {
    ble.bumpSceneGeneration();

    if (displayView === 'solid' && activeModeVal !== 1) {
      activeModeVal = 1;
    }

    syncDisplayViewWithMode();
    syncRemotePanels();
    updateModeDropdown(getBleMode());
    colorPicker.setHex(activeColor, { commit: false });
    updateNeonThemeColor(activeColor, themePanels);
    syncBrightnessSliders(lastBrightnessVal);
    sliderSpeed.value = lastSpeedVal;
    valSpeed.textContent = `${lastSpeedVal}%`;
    updatePreviewChrome();
    const modeForSign = getBleMode();
    await syncSceneToSign({ includeMode: true, mode: modeForSign });
  })();

  try {
    await sceneRestoreInFlight;
  } finally {
    sceneRestoreInFlight = null;
  }
}

async function onConnected() {
  updatePowerUI(isPoweredOn);
  log(`Restoring saved pattern (mode ${activeModeVal})…`, 'info');
  if (isPoweredOn) {
    await restoreSceneToSign();
  } else {
    await ble.sendBrightness(0);
  }
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
  persistSceneNow();
  ble.disconnect();
  wakeLock.release();
  haptic('light');
}

window.setPowerState = async function (on) {
  isPoweredOn = on;
  updatePowerUI(on);
  if (on) {
    persistScene();
  } else {
    persistSceneNow();
  }
  haptic(on ? 'light' : 'heavy');
  if (!ble.isConnected) return;
  if (on) {
    await restoreSceneToSign();
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
    const connected = ble.isConnected;
    const visualOn = connected && on;
    powerBtn.classList.toggle('is-on', visualOn);
    powerBtn.classList.toggle('is-unavailable', !connected);
    powerBtn.setAttribute('aria-pressed', visualOn ? 'true' : 'false');
    if (!connected) {
      powerBtn.setAttribute('aria-label', 'Power');
    } else {
      powerBtn.setAttribute('aria-label', on ? 'Power on' : 'Power off');
    }
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
  const locked = ble.isConnected && !isPoweredOn;
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', locked));
}

function syncBrightnessSliders(val) {
  sliderBrightness.value = val;
  sliderBrightnessAnim.value = val;
  const label = isPoweredOn ? `${val} / 8` : 'OFF';
  valBrightness.textContent = label;
  valBrightnessAnim.textContent = label;
}

function stepBrightness(delta) {
  const next = Math.min(8, Math.max(1, lastBrightnessVal + delta));
  if (next === lastBrightnessVal) return;
  haptic('light');
  onBrightnessInput(next, { immediate: true });
}

function stepSpeed(delta) {
  const next = Math.min(100, Math.max(0, lastSpeedVal + delta));
  if (next === lastSpeedVal) return;
  haptic('light');
  onSpeedInput(next, { immediate: true });
}

function bindStepperButtons() {
  document.addEventListener('click', (e) => {
    const brightnessBtn = e.target.closest('[data-step-brightness]');
    if (brightnessBtn) {
      e.preventDefault();
      stepBrightness(Number(brightnessBtn.getAttribute('data-step-brightness')));
      return;
    }
    const speedBtn = e.target.closest('[data-step-speed]');
    if (speedBtn) {
      e.preventDefault();
      stepSpeed(Number(speedBtn.getAttribute('data-step-speed')));
    }
  });
}

function onBrightnessInput(val, { immediate = false } = {}) {
  lastBrightnessVal = val;
  syncBrightnessSliders(val);
  persistScene();
  if (bTimeout) clearTimeout(bTimeout);
  const send = () => {
    if (ble.isConnected && isPoweredOn) ble.sendBrightness(val);
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
  persistScene();
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
  if (suppressModeDropdownChange) return;
  setMode(parseInt(e.target.value, 10));
});

window.stepMode = function stepMode(delta) {
  let mode = parseInt(animDropdown.value, 10) + delta;
  if (mode < 1) mode = MODE_COUNT;
  if (mode > MODE_COUNT) mode = 1;
  setMode(mode);
};

function loadFavorites() {
  const stored = localStorage.getItem(FAVORITES_KEY);
  if (stored === null) {
    favorites = [...defaultFavorites];
    saveFavorites();
  } else {
    try {
      const parsed = JSON.parse(stored);
      favorites = Array.isArray(parsed) ? parsed : [...defaultFavorites];
    } catch {
      favorites = [];
      saveFavorites();
      log('Preset data was corrupted. Cleared favorites.', 'info');
    }
  }
  renderFavorites();
}

function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(favorites));
}

function renderFavorites() {
  favoritesGrid.innerHTML = '';
  favorites.forEach((fav) => {
    const chip = document.createElement('div');
    chip.className = `fav-chip ${fav.mode === activeModeVal ? 'active' : ''}`;
    chip.setAttribute('data-mode', fav.mode);

    const numSpan = document.createElement('span');
    numSpan.className = 'fav-chip-num';
    numSpan.textContent = String(fav.mode);

    const labelSpan = document.createElement('span');
    labelSpan.className = 'fav-chip-label';
    labelSpan.textContent = fav.label;
    labelSpan.addEventListener('click', () => setMode(fav.mode));

    chip.appendChild(numSpan);
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

function loadColorPresets() {
  try {
    const raw = localStorage.getItem(COLOR_PRESETS_KEY);
    colorPresets = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(colorPresets)) colorPresets = [];
  } catch {
    colorPresets = [];
  }
  renderColorPresets();
}

function saveColorPresets() {
  localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(colorPresets));
}

function renderColorPresets() {
  if (!colorPresetsRow) return;
  colorPresetsRow.innerHTML = '';
  if (colorPresets.length === 0) {
    colorPresetsRow.classList.add('hidden');
    return;
  }
  colorPresetsRow.classList.remove('hidden');

  colorPresets.forEach((preset, index) => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'color-preset-chip';
    chip.setAttribute('aria-label', preset.label);

    const swatch = document.createElement('span');
    swatch.className = 'color-preset-swatch';
    swatch.style.background = preset.hex;

    const label = document.createElement('span');
    label.className = 'color-preset-label';
    label.textContent = preset.label;

    chip.appendChild(swatch);
    chip.appendChild(label);

    chip.addEventListener('click', () => {
      document.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('selected'));
      colorPicker.setHex(preset.hex, { commit: false });
      activeColor = updateNeonThemeColor(preset.hex, themePanels);
      updatePreviewChrome();
      persistScene();
      applyColorSelection();
      haptic('light');
    });

    const removeBtn = document.createElement('span');
    removeBtn.className = 'color-preset-remove';
    removeBtn.textContent = '×';
    removeBtn.setAttribute('role', 'button');
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPresets.splice(index, 1);
      saveColorPresets();
      renderColorPresets();
    });
    chip.appendChild(removeBtn);

    colorPresetsRow.appendChild(chip);
  });
}

function applySavedSceneToUI() {
  colorPicker.setHex(activeColor, { commit: false });
  updateNeonThemeColor(activeColor, themePanels);
  syncBrightnessSliders(lastBrightnessVal);
  sliderSpeed.value = lastSpeedVal;
  valSpeed.textContent = `${lastSpeedVal}%`;
  const uiMode = displayView === 'solid' ? 1 : activeModeVal;
  setAnimDropdownValue(uiMode);
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, displayView, { animate: false });
  syncRemotePanels();
  updateModeDropdown(uiMode);
  updatePreviewChrome();
}

btnConnect.addEventListener('click', connectDevice);
btnReconnect.addEventListener('click', reconnectDevice);
btnDisconnect.addEventListener('click', disconnectDevice);

modeSegSolid.addEventListener('click', () => {
  if (displayView === 'solid' && activeModeVal === 1) return;
  displayView = 'solid';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid');
  syncRemotePanels();
  if (activeModeVal !== 1) setMode(1);
  else persistScene();
});

modeSegAnimation.addEventListener('click', () => {
  if (displayView === 'animation') return;
  displayView = 'animation';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'animation');
  syncRemotePanels();
  persistScene();
  if (activeModeVal === 1) setMode(lastAnimationMode);
});

statusChip.addEventListener('click', () => {
  window.openSettingsSheet?.();
});

applySavedSceneToUI();
for (let i = 1; i <= MODE_COUNT; i++) {
  const opt = document.createElement('option');
  opt.value = i;
  opt.textContent = formatModeLabel(i);
  animDropdown.appendChild(opt);
}
refreshAnimationPicker(activeModeVal);
loadFavorites();
loadColorPresets();
updateReconnectButton();
setupCompatBanner(compatBanner, log);

setupPaletteToggle(document.getElementById('palette-toggle'), {
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
  searchInput: modeSearchSheet,
  listEl: modeListSheet,
  onModeSelect: (mode) => setMode(mode),
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

setupColorPresetModal({
  modal: document.getElementById('color-preset-modal'),
  input: document.getElementById('color-preset-name-input'),
  btnConfirm: document.getElementById('color-preset-modal-confirm'),
  btnCancel: document.getElementById('color-preset-modal-cancel'),
  onConfirm: (name) => {
    const hex = colorPicker.getHex();
    if (colorPresets.some((p) => p.hex.toLowerCase() === hex.toLowerCase())) {
      log('This color is already saved.', 'info');
      return;
    }
    colorPresets.unshift({ hex, label: name });
    if (colorPresets.length > 12) colorPresets = colorPresets.slice(0, 12);
    saveColorPresets();
    renderColorPresets();
    log(`Saved color preset "${name}".`, 'success');
    haptic('light');
  },
});

document.getElementById('btn-save-color-preset')?.addEventListener('click', () => {
  const hex = colorPicker.getHex();
  window.openColorPresetModal?.(`Color ${hex.toUpperCase()}`);
});

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

window.addEventListener('pagehide', persistSceneNow);
window.addEventListener('beforeunload', persistSceneNow);
