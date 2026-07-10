import { FloroBleController, isBleSupported } from './ble.js';
import { createColorPicker, loadRecentColors } from './color-picker.js';
import {
  NEON_COLORS,
  getSwatchTypeLabel,
  normalizeHex,
  resolveColorLabel,
  swatchTypeClass,
  truncateColorLabel,
} from './colors.js';
import { describeBleError } from './errors.js';
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
  truncatePresetLabel,
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
const btnConnectMain = document.getElementById('btn-connect-main');
const btnReconnectMain = document.getElementById('btn-reconnect-main');
const connectPrompt = document.getElementById('connect-prompt');
const deviceNameEl = document.getElementById('device-name');
const connectionStatus = document.getElementById('connection-status');
const statusChip = document.getElementById('status-chip');
const statusChipText = document.getElementById('status-chip-text');

const remoteDock = document.getElementById('remote-dock');
const solidControls = document.getElementById('solid-controls');
const animControls = document.getElementById('anim-controls');
const animationPanel = document.getElementById('animation-panel');
const powerBtn = document.getElementById('power-btn');

const colorHeroSwatch = document.getElementById('color-hero-swatch');
const colorHeroName = document.getElementById('color-hero-name');
const colorHeroType = document.getElementById('color-hero-type');
const colorRecentsStrip = document.getElementById('color-recents-strip');
const neonGrid = document.getElementById('neon-grid');
const neonGridStatic = document.getElementById('neon-grid-static');
const paletteToggle = document.getElementById('palette-toggle');
const btnOpenPalette = document.getElementById('btn-open-palette');

const modeSegSolid = document.getElementById('mode-seg-solid');
const modeSegAnimation = document.getElementById('mode-seg-animation');
const solidView = document.getElementById('solid-view');
const animationView = document.getElementById('animation-view');

const sliderBrightness = document.getElementById('slider-brightness');
const sliderBrightnessAnim = document.getElementById('slider-brightness-anim');
const valBrightness = document.getElementById('val-brightness');
const valBrightnessAnim = document.getElementById('val-brightness-anim');
const brightnessCard = document.querySelector('#solid-controls .brightness-card');
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
const colorPresetSection = document.getElementById('color-preset-section');
const animModeHeroNum = document.getElementById('anim-mode-hero-num');
const animModeHeroName = document.getElementById('anim-mode-hero-name');
const animModeHeroMeta = document.getElementById('anim-mode-hero-meta');
const animStepperReadout = document.getElementById('anim-stepper-readout');
const animModePickerBtn = document.getElementById('anim-mode-picker-btn');

const modeHeroEls = {
  num: animModeHeroNum,
  name: animModeHeroName,
  meta: animModeHeroMeta,
  readout: animStepperReadout,
  pickerBtn: animModePickerBtn,
};

const consoleBody = document.getElementById('console-body');
const compatBanner = document.getElementById('compat-banner');
const appVersionEl = document.getElementById('app-version');

const controlPanels = [remoteDock, solidControls, animControls, animationPanel];
const themePanels = [];

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

function getGaugeState() {
  return {};
}

function refreshSceneGauge() {}

function applySwatchClasses(el, hex) {
  if (!el) return;
  el.classList.remove('swatch--neon', 'swatch--saved', 'swatch--custom');
  el.classList.add(swatchTypeClass(hex, colorPresets));
}

function updateColorHero() {
  const hex = normalizeHex(activeColor);
  if (colorHeroSwatch) {
    colorHeroSwatch.style.background = hex;
    applySwatchClasses(colorHeroSwatch, hex);
    colorHeroSwatch.classList.toggle('is-selected', true);
  }
  if (colorHeroName) {
    colorHeroName.textContent = resolveColorLabel(hex, colorPresets);
  }
  if (colorHeroType) {
    colorHeroType.textContent = getSwatchTypeLabel(hex, colorPresets);
  }
}

function pickColor(hex, { commit = true } = {}) {
  const normalized = normalizeHex(hex);
  activeColor = updateNeonThemeColor(normalized, themePanels);
  colorPicker.setHex(normalized, { commit: false });
  document.querySelectorAll('.swatch-btn, .swatch-squircle').forEach((s) => {
    s.classList.remove('selected', 'is-selected');
  });
  updatePreviewChrome();
  persistScene();
  haptic('light');
  if (commit) {
    applyColorSelection();
  }
}

function renderNeonGrid() {
  if (!neonGrid) return;
  neonGrid.innerHTML = '';
  NEON_COLORS.forEach(({ hex, name }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch-btn swatch-squircle swatch--neon${normalizeHex(hex) === normalizeHex(activeColor) ? ' selected' : ''}`;
    btn.style.background = hex;
    btn.title = name;
    btn.setAttribute('aria-label', name);
    btn.addEventListener('click', () => {
      pickColor(hex);
    });
    neonGrid.appendChild(btn);
  });
}

function renderStaticNeonGrid() {
  if (!neonGridStatic) return;
  neonGridStatic.innerHTML = '';
  NEON_COLORS.forEach(({ hex, name, r, g, b }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `swatch-btn${normalizeHex(hex) === normalizeHex(activeColor) ? ' selected' : ''}`;
    btn.style.background = hex;
    btn.title = name;
    btn.setAttribute('aria-label', name);
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickColor(hex);
    });
    neonGridStatic.appendChild(btn);
  });
}

function renderColorStrip() {
  if (!colorRecentsStrip) return;
  updateColorHero();
  colorRecentsStrip.innerHTML = '';

  const recents = loadRecentColors().filter((h) => normalizeHex(h) !== normalizeHex(activeColor));
  const slots = recents.slice(0, 4);

  slots.forEach((hex) => {
    const col = document.createElement('button');
    col.type = 'button';
    col.className = 'recent-col';
    const sw = document.createElement('span');
    sw.className = `swatch-squircle ${swatchTypeClass(hex, colorPresets)}`;
    sw.style.background = hex;
    if (normalizeHex(hex) === normalizeHex(activeColor)) {
      sw.classList.add('is-selected');
    }
    const label = document.createElement('span');
    label.className = 'recent-label';
    label.textContent = truncateColorLabel(resolveColorLabel(hex, colorPresets));
    col.appendChild(sw);
    col.appendChild(label);
    col.addEventListener('click', (e) => {
      e.stopPropagation();
      pickColor(hex);
    });
    colorRecentsStrip.appendChild(col);
  });

  const moreCol = document.createElement('button');
  moreCol.type = 'button';
  moreCol.className = 'recent-col';
  moreCol.setAttribute('data-open-palette', 'true');
  moreCol.setAttribute('aria-label', 'More colors');
  const moreSw = document.createElement('span');
  moreSw.className = 'swatch-more';
  moreSw.textContent = '+';
  const moreLabel = document.createElement('span');
  moreLabel.className = 'recent-label';
  moreLabel.textContent = 'More';
  moreCol.appendChild(moreSw);
  moreCol.appendChild(moreLabel);
  moreCol.addEventListener('click', () => openColorPickerSheet());
  colorRecentsStrip.appendChild(moreCol);
}

function openColorPickerSheet() {
  paletteToggle?.click() || btnOpenPalette?.click();
}

function updatePreviewChrome() {
  updateColorHero();
  renderColorStrip();
  renderNeonGrid();
  renderStaticNeonGrid();
  highlightColorPresets();
}

function syncRemotePanels() {
  const isSolid = displayView === 'solid';
  solidControls?.classList.toggle('hidden', !isSolid);
  animControls?.classList.toggle('hidden', isSolid);
  if (solidControls) {
    solidControls.toggleAttribute('hidden', !isSolid);
    solidControls.toggleAttribute('inert', !isSolid);
  }
  if (animControls) {
    animControls.toggleAttribute('hidden', isSolid);
    animControls.toggleAttribute('inert', isSolid);
  }
  updateColorPresetSectionVisibility();
}

function updateColorPresetSectionVisibility() {
  if (!colorPresetSection) return;
  colorPresetSection.classList.toggle('hidden', displayView !== 'solid');
  colorPresetSection.toggleAttribute('hidden', displayView !== 'solid');
}

let colorLiveTimeout = null;
let colorPickNeedsModeSend = false;

function prepareSolidModeForColorPick() {
  if (activeModeVal === 1) return;
  displayView = 'solid';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid');
  syncRemotePanels();
  setMode(1, { sendBle: false });
  ble.bumpSceneGeneration();
  persistScene();
  colorPickNeedsModeSend = true;
}

function sendColorToSignLive(hex, { immediate = false } = {}) {
  if (colorLiveTimeout) clearTimeout(colorLiveTimeout);
  const send = () => {
    colorLiveTimeout = null;
    if (!ble.isConnected || !isPoweredOn) return;
    const { r, g, b } = hexToRgb(hex);
    ble.sendColor(r, g, b, 'Color');
    if (colorPickNeedsModeSend) {
      colorPickNeedsModeSend = false;
      ble.sendMode(1);
    }
  };
  if (immediate) {
    send();
  } else {
    colorLiveTimeout = setTimeout(send, 120);
  }
}

const colorPicker = createColorPicker({
  root: customColorPickerRoot,
  initialHex: activeColor,
  onColorChange: (hex) => {
    activeColor = updateNeonThemeColor(hex, themePanels);
    updatePreviewChrome();
    document.querySelectorAll('.swatch-btn').forEach((s) => s.classList.remove('selected'));
    persistScene();
    prepareSolidModeForColorPick();
    sendColorToSignLive(hex);
  },
  onColorCommit: (hex) => {
    colorPickNeedsModeSend = false;
    if (colorLiveTimeout) {
      clearTimeout(colorLiveTimeout);
      colorLiveTimeout = null;
    }
    sendColorToSignLive(hex, { immediate: true });
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
      updateConnectPrompt();
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
  updateConnectPrompt();
}

function updateConnectPrompt() {
  if (!connectPrompt) return;

  if (!isBleSupported() || ble.isConnected || connectionState === 'connecting') {
    connectPrompt.classList.add('hidden');
    return;
  }

  connectPrompt.classList.remove('hidden');

  const last = ble.lastDeviceInfo;
  if (btnReconnectMain && ble.canReconnect() && last) {
    btnReconnectMain.textContent = `Reconnect to ${last.name}`;
    btnReconnectMain.classList.remove('hidden');
  } else {
    btnReconnectMain?.classList.add('hidden');
  }
}

function enablePanels(enabled) {
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', !enabled));
}

function resetUI() {
  deviceNameEl.textContent = 'Not connected';
  connectionStatus.textContent = 'OFFLINE';
  connectionStatus.className = 'status-pill';
  btnConnect.classList.remove('hidden');
  btnDisconnect.classList.add('hidden');
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
  updateConnectPrompt();
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
    subtitle.textContent = mode === 1 ? 'Static color on sign' : label;

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
  const modeName = getModeName(num);
  if (heroEls.num) heroEls.num.textContent = String(num);
  if (heroEls.name) heroEls.name.textContent = modeName;
  if (heroEls.meta) heroEls.meta.textContent = `Mode ${num} of ${MODE_COUNT}`;
  if (heroEls.readout) heroEls.readout.textContent = formatModeLabel(num);
  if (heroEls.pickerBtn) {
    heroEls.pickerBtn.setAttribute(
      'aria-label',
      `Select animation mode: ${modeName}, mode ${num} of ${MODE_COUNT}`
    );
  }
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
  filterAnimationOptions(animDropdown, query, pickerMode, modeListSheet || modeList, modeHeroEls);
  if (modeListSheet) {
    renderModeList(modeListSheet, { query, activeMode: pickerMode });
  }
}

function updateModeDropdown(mode) {
  animDropdown.value = String(mode);
  renderModeList(modeList, { activeMode: mode });
  renderModeList(modeListSheet, { activeMode: mode, query: modeSearchSheet?.value || '' });
  updateModeHero(modeHeroEls, mode);
}

function setMode(mode, { sendBle = true } = {}) {
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

function alignUIForPowerOnRestore() {
  const restoreMode = activeModeVal > 1 ? activeModeVal : lastAnimationMode;
  activeModeVal = restoreMode;
  lastAnimationMode = restoreMode;
  displayView = 'animation';

  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'animation', { animate: false });
  syncRemotePanels();
  updateModeDropdown(restoreMode);
  highlightActiveFavorite();
  colorPicker.setHex(activeColor, { commit: false });
  updateNeonThemeColor(activeColor, themePanels);
  syncBrightnessSliders(lastBrightnessVal);
  sliderSpeed.value = lastSpeedVal;
  valSpeed.textContent = `${lastSpeedVal}%`;
  updatePreviewChrome();
  persistScene();

  return restoreMode;
}

async function restoreSceneToSign() {
  ble.bumpSceneGeneration();
  const restoreMode = alignUIForPowerOnRestore();
  await syncSceneToSign({ includeMode: true, mode: restoreMode });
}

async function onConnected() {
  updatePowerUI(isPoweredOn);
  log(`Restoring animation mode ${activeModeVal > 1 ? activeModeVal : lastAnimationMode}…`, 'info');
  if (isPoweredOn) {
    await restoreSceneToSign();
  } else {
    await ble.sendBrightness(0);
  }
}

async function connectDevice() {
  if (!isBleSupported()) {
    log('Web Bluetooth is not available. Use Chrome or Edge on desktop/Android over HTTPS.', 'error');
    return;
  }

  try {
    setConnectionState('connecting');
    btnConnect.disabled = true;
    btnReconnect.disabled = true;
    btnConnectMain && (btnConnectMain.disabled = true);
    btnReconnectMain && (btnReconnectMain.disabled = true);
    await ble.connectNew();
    await onConnected();
    haptic('light');
  } catch (error) {
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
    btnConnectMain && (btnConnectMain.disabled = false);
    btnReconnectMain && (btnReconnectMain.disabled = false);
  }
}

async function reconnectDevice() {
  if (!isBleSupported()) return;

  try {
    setConnectionState('connecting');
    btnConnect.disabled = true;
    btnReconnect.disabled = true;
    btnConnectMain && (btnConnectMain.disabled = true);
    btnReconnectMain && (btnReconnectMain.disabled = true);
    await ble.reconnectLast();
    await onConnected();
    haptic('light');
  } catch (error) {
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
    btnConnectMain && (btnConnectMain.disabled = false);
    btnReconnectMain && (btnReconnectMain.disabled = false);
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
  const connected = ble.isConnected;
  const visualOn = connected && on;
  const ctaLabel = powerBtn?.querySelector('.power-cta-label');

  if (powerBtn) {
    powerBtn.classList.toggle('is-on', visualOn);
    powerBtn.classList.toggle('is-unavailable', !connected);
    powerBtn.setAttribute('aria-pressed', visualOn ? 'true' : 'false');
    if (!connected) {
      powerBtn.setAttribute('aria-label', 'Power');
    } else {
      powerBtn.setAttribute('aria-label', on ? 'Power on' : 'Power off');
    }
  }

  if (ctaLabel) {
    if (!connected) {
      ctaLabel.textContent = 'Power';
    } else {
      ctaLabel.textContent = on ? 'Power On' : 'Power Off';
    }
  }

  syncControlPanelsEnabled();

  if (on) {
    syncBrightnessSliders(lastBrightnessVal);
  } else {
    if (brightnessCard) {
      brightnessCard.dataset.poweredOff = 'true';
    }
    valBrightness.textContent = 'OFF';
    valBrightnessAnim.textContent = 'OFF';
  }

  refreshSceneGauge();
}

function syncControlPanelsEnabled() {
  const locked = ble.isConnected && !isPoweredOn;
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', locked));
}

function syncBrightnessSliders(val) {
  sliderBrightness.value = val;
  sliderBrightnessAnim.value = val;
  if (brightnessCard) {
    brightnessCard.dataset.level = String(val);
    brightnessCard.style.setProperty('--brightness-level', String(val));
    brightnessCard.dataset.poweredOff = isPoweredOn ? 'false' : 'true';
  }
  if (valBrightness) {
    valBrightness.textContent = isPoweredOn ? String(val) : 'OFF';
  }
  if (valBrightnessAnim) {
    valBrightnessAnim.textContent = isPoweredOn ? String(val) : 'OFF';
  }
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
  refreshSceneGauge();
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
  pickColor(rgbToHex(r, g, b));
};

window.selectNeonSwatch = function (hex) {
  pickColor(hex);
};

animDropdown.addEventListener('change', (e) => {
  setMode(parseInt(e.target.value, 10));
});

window.stepMode = function stepMode(delta) {
  let mode = parseInt(animDropdown.value, 10);
  do {
    mode += delta;
    if (mode < 2) mode = MODE_COUNT;
    if (mode > MODE_COUNT) mode = 2;
  } while (mode === 1);
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
    chip.className = `preset-tile${fav.mode === activeModeVal ? ' active' : ''}`;
    chip.setAttribute('data-mode', fav.mode);
    chip.setAttribute('role', 'button');
    chip.setAttribute('tabindex', '0');
    chip.setAttribute('aria-label', fav.label);
    chip.title = fav.label;

    const labelSpan = document.createElement('span');
    labelSpan.className = 'preset-tile-label';
    labelSpan.textContent = truncatePresetLabel(fav.label);
    chip.appendChild(labelSpan);

    chip.addEventListener('click', () => setMode(fav.mode));
    chip.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        setMode(fav.mode);
      }
    });

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'preset-tile-remove';
    removeBtn.setAttribute('aria-label', `Remove ${fav.label}`);
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
  document.querySelectorAll('.preset-row--anim .preset-tile').forEach((chip) => {
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

const COLOR_PRESET_MAX_COUNT = 12;

function getMaxColorPresets() {
  return COLOR_PRESET_MAX_COUNT;
}

function trimColorPresetsToMax() {
  const max = getMaxColorPresets();
  if (colorPresets.length <= max) return false;
  colorPresets = colorPresets.slice(0, max);
  saveColorPresets();
  return true;
}

function loadColorPresets() {
  try {
    const raw = localStorage.getItem(COLOR_PRESETS_KEY);
    colorPresets = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(colorPresets)) colorPresets = [];
  } catch {
    colorPresets = [];
  }
  trimColorPresetsToMax();
  renderColorPresets();
}

function saveColorPresets() {
  localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(colorPresets));
}

function renderColorPresets() {
  if (!colorPresetsRow) return;
  const max = getMaxColorPresets();
  const visiblePresets = colorPresets.slice(0, max);
  colorPresetsRow.innerHTML = '';
  colorPresetsRow.classList.remove('is-empty');

  if (visiblePresets.length === 0) {
    colorPresetsRow.classList.add('is-empty');
    const hint = document.createElement('span');
    hint.className = 'color-presets-empty-hint';
    hint.textContent = 'Save a preset from your custom color';
    colorPresetsRow.appendChild(hint);
    return;
  }

  visiblePresets.forEach((preset, index) => {
    const btn = document.createElement('button');
    const isSelected = normalizeHex(preset.hex) === normalizeHex(activeColor);
    btn.type = 'button';
    btn.className = `swatch-btn swatch-squircle swatch--saved${isSelected ? ' selected' : ''}`;
    btn.style.background = preset.hex;
    btn.setAttribute('aria-label', preset.label);
    btn.title = preset.label;

    const label = document.createElement('span');
    label.className = 'swatch-preset-label';
    label.textContent = truncatePresetLabel(preset.label, 8);
    btn.appendChild(label);

    btn.addEventListener('click', () => pickColor(preset.hex));

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'swatch-preset-remove';
    removeBtn.setAttribute('aria-label', `Remove ${preset.label}`);
    removeBtn.textContent = '×';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      colorPresets.splice(index, 1);
      saveColorPresets();
      renderColorPresets();
      updatePreviewChrome();
    });
    btn.appendChild(removeBtn);

    colorPresetsRow.appendChild(btn);
  });
}

function highlightColorPresets() {
  if (!colorPresetsRow) return;
  colorPresetsRow.querySelectorAll('.swatch-btn').forEach((chip, index) => {
    const preset = colorPresets[index];
    if (!preset) return;
    chip.classList.toggle('selected', normalizeHex(preset.hex) === normalizeHex(activeColor));
  });
}

function applySavedSceneToUI() {
  colorPicker.setHex(activeColor, { commit: false });
  updateNeonThemeColor(activeColor, themePanels);
  syncBrightnessSliders(lastBrightnessVal);
  sliderSpeed.value = lastSpeedVal;
  valSpeed.textContent = `${lastSpeedVal}%`;
  const uiMode = displayView === 'solid' ? 1 : activeModeVal;
  animDropdown.value = String(uiMode);
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, displayView, { animate: false });
  syncRemotePanels();
  updateModeDropdown(uiMode);
  updatePreviewChrome();
}

btnConnect.addEventListener('click', connectDevice);
btnReconnect.addEventListener('click', reconnectDevice);
btnDisconnect.addEventListener('click', disconnectDevice);
btnConnectMain?.addEventListener('click', connectDevice);
btnReconnectMain?.addEventListener('click', reconnectDevice);

modeSegSolid.addEventListener('click', () => {
  if (displayView === 'solid' && activeModeVal === 1) return;
  displayView = 'solid';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'solid');
  syncRemotePanels();
  refreshSceneGauge();
  if (activeModeVal !== 1) setMode(1);
  else persistScene();
});

modeSegAnimation.addEventListener('click', () => {
  if (displayView === 'animation') return;
  displayView = 'animation';
  setDisplayView(solidView, animationView, modeSegSolid, modeSegAnimation, 'animation');
  syncRemotePanels();
  persistScene();
  refreshSceneGauge();
  if (activeModeVal === 1) setMode(lastAnimationMode);
});

document.getElementById('btn-add-favorite')?.addEventListener('click', () => {
  if (displayView !== 'animation') {
    modeSegAnimation.click();
  }
  window.addCurrentToFavorites?.();
});

document.getElementById('btn-preset-search-anim')?.addEventListener('click', () => {
  if (displayView !== 'animation') {
    modeSegAnimation.click();
  }
  window.openModePickerSheet?.();
});

statusChip?.addEventListener('click', () => {
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

let presetGridResizeTimer;
window.addEventListener('resize', () => {
  clearTimeout(presetGridResizeTimer);
  presetGridResizeTimer = setTimeout(() => {
    if (trimColorPresetsToMax()) renderColorPresets();
  }, 150);
});

setupPaletteToggle(paletteToggle, {
  sheet: document.getElementById('palette-sheet'),
  closeBtn: document.getElementById('btn-close-palette'),
});

setupPaletteToggle(btnOpenPalette, {
  sheet: document.getElementById('palette-sheet'),
  closeBtn: document.getElementById('btn-close-palette'),
});

document.querySelector('.color-hero-icon')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openColorPickerSheet();
});

document.getElementById('btn-close-palette')?.addEventListener('click', () => {
  colorPicker.commitNow?.();
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
    const max = getMaxColorPresets();
    if (colorPresets.length >= max) {
      const removed = colorPresets.pop();
      log(`Removed "${removed.label}" to make room for new preset.`, 'info');
    }
    colorPresets.unshift({ hex, label: name });
    saveColorPresets();
    renderColorPresets();
    updatePreviewChrome();
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
    const { message, level } = describeBleError(error, 'connection');
    log(message, level);
    resetUI();
  } finally {
    btnConnect.disabled = false;
    btnReconnect.disabled = false;
  }
}

bindStepperButtons();
syncControlPanelsEnabled();
updatePowerUI(isPoweredOn);
updateConnectPrompt();

log('System ready.', 'info');
tryAutoReconnect();

window.addEventListener('pagehide', persistSceneNow);
window.addEventListener('beforeunload', persistSceneNow);
