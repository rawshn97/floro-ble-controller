import { FloroBleController } from './ble.js';
import { flushSceneSave, loadSceneState, scheduleSceneSave } from './state.js';
import { createLogger, WakeLockManager } from './ui.js';

const savedScene = loadSceneState();

export const els = {
  btnConnect: document.getElementById('btn-connect'),
  btnReconnect: document.getElementById('btn-reconnect'),
  btnDisconnect: document.getElementById('btn-disconnect'),
  btnConnectMain: document.getElementById('btn-connect-main'),
  btnReconnectMain: document.getElementById('btn-reconnect-main'),
  connectPrompt: document.getElementById('connect-prompt'),
  deviceNameEl: document.getElementById('device-name'),
  connectionStatus: document.getElementById('connection-status'),
  statusChip: document.getElementById('status-chip'),
  statusChipText: document.getElementById('status-chip-text'),
  remoteDock: document.getElementById('remote-dock'),
  solidControls: document.getElementById('solid-controls'),
  animControls: document.getElementById('anim-controls'),
  animationPanel: document.getElementById('animation-panel'),
  powerBtn: document.getElementById('power-btn'),
  colorHeroSwatch: document.getElementById('color-hero-swatch'),
  colorHeroName: document.getElementById('color-hero-name'),
  colorHeroType: document.getElementById('color-hero-type'),
  colorRecentsStrip: document.getElementById('color-recents-strip'),
  neonGrid: document.getElementById('neon-grid'),
  neonGridStatic: document.getElementById('neon-grid-static'),
  paletteToggle: document.getElementById('palette-toggle'),
  btnOpenPalette: document.getElementById('btn-open-palette'),
  modeSegSolid: document.getElementById('mode-seg-solid'),
  modeSegAnimation: document.getElementById('mode-seg-animation'),
  solidView: document.getElementById('solid-view'),
  animationView: document.getElementById('animation-view'),
  sliderBrightness: document.getElementById('slider-brightness'),
  sliderBrightnessAnim: document.getElementById('slider-brightness-anim'),
  valBrightness: document.getElementById('val-brightness'),
  valBrightnessAnim: document.getElementById('val-brightness-anim'),
  brightnessCard: document.querySelector('#solid-controls .brightness-card'),
  sliderSpeed: document.getElementById('slider-speed'),
  valSpeed: document.getElementById('val-speed'),
  customColorPickerRoot: document.getElementById('custom-color-picker'),
  animDropdown: document.getElementById('anim-dropdown'),
  modeSearch: document.getElementById('mode-search'),
  modeSearchSheet: document.getElementById('mode-search-sheet'),
  modeList: document.getElementById('mode-list'),
  modeListSheet: document.getElementById('mode-list-sheet'),
  favoritesGrid: document.getElementById('favorites-grid'),
  colorPresetsRow: document.getElementById('color-presets-row'),
  colorPresetSection: document.getElementById('color-preset-section'),
  animModeHeroNum: document.getElementById('anim-mode-hero-num'),
  animModeHeroName: document.getElementById('anim-mode-hero-name'),
  animModeHeroMeta: document.getElementById('anim-mode-hero-meta'),
  animStepperReadout: document.getElementById('anim-stepper-readout'),
  animModePickerBtn: document.getElementById('anim-mode-picker-btn'),
  consoleBody: document.getElementById('console-body'),
  compatBanner: document.getElementById('compat-banner'),
  appVersionEl: document.getElementById('app-version'),
};

export const modeHeroEls = {
  num: els.animModeHeroNum,
  name: els.animModeHeroName,
  meta: els.animModeHeroMeta,
  readout: els.animStepperReadout,
  pickerBtn: els.animModePickerBtn,
};

export const controlPanels = [
  els.remoteDock,
  els.solidControls,
  els.animControls,
  els.animationPanel,
];

export const state = {
  isPoweredOn: savedScene.isPoweredOn,
  lastBrightnessVal: savedScene.brightness,
  lastSpeedVal: savedScene.speed,
  activeColor: savedScene.color,
  activeModeVal: savedScene.activeMode,
  lastAnimationMode: savedScene.lastAnimationMode,
  displayView: savedScene.displayView,
  favorites: [],
  colorPresets: [],
  connectionState: 'offline',
};

export const log = createLogger(els.consoleBody);
export const wakeLock = new WakeLockManager(log);

export const bleHooks = {
  onConnectionChange: null,
  onDisconnect: null,
};

export const ble = new FloroBleController({
  onLog: log,
  onConnectionChange: (connected, name) => bleHooks.onConnectionChange?.(connected, name),
  onDisconnect: (info) => bleHooks.onDisconnect?.(info),
});

let colorPicker = null;

export function getColorPicker() {
  return colorPicker;
}

export function setColorPicker(picker) {
  colorPicker = picker;
}

export function getBleMode() {
  return state.displayView === 'solid' ? 1 : state.activeModeVal;
}

export function getSceneSnapshot() {
  return {
    displayView: state.displayView,
    isPoweredOn: state.isPoweredOn,
    brightness: state.lastBrightnessVal,
    speed: state.lastSpeedVal,
    color: state.activeColor,
    activeMode: state.displayView === 'solid' ? 1 : state.activeModeVal,
    lastAnimationMode: state.lastAnimationMode,
  };
}

export function persistScene() {
  scheduleSceneSave(getSceneSnapshot);
}

export function persistSceneNow() {
  flushSceneSave(getSceneSnapshot);
}
