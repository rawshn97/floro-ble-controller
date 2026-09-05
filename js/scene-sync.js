import {
  ble,
  controlPanels,
  els,
  getBleMode,
  getColorPicker,
  log,
  persistScene,
  persistSceneNow,
  state,
} from './app-context.js';
import { updateColorPresetSectionVisibility, updatePreviewChrome } from './color-ui.js';
import { hexToRgb } from './protocol.js';
import { highlightActiveFavorite, setMode, updateModeDropdown } from './mode-ui.js';
import { haptic, setDisplayView } from './ui.js';

let bTimeout = null;
let sTimeout = null;

export async function syncSceneToSign({ includeMode, mode: modeOverride } = {}) {
  if (!ble.isConnected) return;

  const { r, g, b } = hexToRgb(getColorPicker().getHex());
  const mode = modeOverride ?? getBleMode();
  await ble.sendScene({
    brightness: state.isPoweredOn ? state.lastBrightnessVal : 0,
    speed: state.lastSpeedVal,
    r,
    g,
    b,
    mode,
    includeMode: includeMode ?? true,
  });
}

export function syncColorToSign() {
  return syncSceneToSign({ includeMode: getBleMode() !== 1 });
}

export function syncRemotePanels() {
  const isSolid = state.displayView === 'solid';
  els.solidControls?.classList.toggle('hidden', !isSolid);
  els.animControls?.classList.toggle('hidden', isSolid);
  if (els.solidControls) {
    els.solidControls.toggleAttribute('hidden', !isSolid);
    els.solidControls.toggleAttribute('inert', !isSolid);
  }
  if (els.animControls) {
    els.animControls.toggleAttribute('hidden', isSolid);
    els.animControls.toggleAttribute('inert', isSolid);
  }
  updateColorPresetSectionVisibility();
}

export function syncControlPanelsEnabled() {
  const locked = ble.isConnected && !state.isPoweredOn;
  controlPanels.forEach((p) => p?.classList.toggle('disabled-control', locked));
}

export function syncBrightnessSliders(val) {
  els.sliderBrightness.value = val;
  els.sliderBrightnessAnim.value = val;
  if (els.brightnessCard) {
    els.brightnessCard.dataset.level = String(val);
    els.brightnessCard.style.setProperty('--brightness-level', String(val));
    els.brightnessCard.dataset.poweredOff = state.isPoweredOn ? 'false' : 'true';
  }
  if (els.valBrightness) {
    els.valBrightness.textContent = state.isPoweredOn ? String(val) : 'OFF';
  }
  if (els.valBrightnessAnim) {
    els.valBrightnessAnim.textContent = state.isPoweredOn ? String(val) : 'OFF';
  }
}

export function updatePowerUI(on) {
  const connected = ble.isConnected;
  const visualOn = connected && on;
  const ctaLabel = els.powerBtn?.querySelector('.power-cta-label');

  if (els.powerBtn) {
    els.powerBtn.classList.toggle('is-on', visualOn);
    els.powerBtn.classList.toggle('is-unavailable', !connected);
    els.powerBtn.setAttribute('aria-pressed', visualOn ? 'true' : 'false');
    if (!connected) {
      els.powerBtn.setAttribute('aria-label', 'Power');
    } else {
      els.powerBtn.setAttribute('aria-label', on ? 'Power on' : 'Power off');
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
    syncBrightnessSliders(state.lastBrightnessVal);
  } else {
    if (els.brightnessCard) {
      els.brightnessCard.dataset.poweredOff = 'true';
    }
    els.valBrightness.textContent = 'OFF';
    els.valBrightnessAnim.textContent = 'OFF';
  }
}

export function alignUIForPowerOnRestore() {
  const restoreMode = state.activeModeVal > 1 ? state.activeModeVal : state.lastAnimationMode;
  state.activeModeVal = restoreMode;
  state.lastAnimationMode = restoreMode;
  state.displayView = 'animation';

  setDisplayView(
    els.solidView,
    els.animationView,
    els.modeSegSolid,
    els.modeSegAnimation,
    'animation',
    { animate: false }
  );
  syncRemotePanels();
  updateModeDropdown(restoreMode);
  highlightActiveFavorite();
  getColorPicker().setHex(state.activeColor, { commit: false });
  syncBrightnessSliders(state.lastBrightnessVal);
  els.sliderSpeed.value = state.lastSpeedVal;
  els.valSpeed.textContent = `${state.lastSpeedVal}%`;
  updatePreviewChrome();
  persistScene();

  return restoreMode;
}

export async function restoreSceneToSign() {
  ble.bumpSceneGeneration();
  const restoreMode = alignUIForPowerOnRestore();
  await syncSceneToSign({ includeMode: true, mode: restoreMode });
}

export async function onConnected() {
  updatePowerUI(state.isPoweredOn);
  log(
    `Restoring animation mode ${state.activeModeVal > 1 ? state.activeModeVal : state.lastAnimationMode}…`,
    'info'
  );
  if (state.isPoweredOn) {
    await restoreSceneToSign();
  } else {
    await ble.sendBrightness(0);
  }
}

export function applySavedSceneToUI() {
  getColorPicker().setHex(state.activeColor, { commit: false });
  syncBrightnessSliders(state.lastBrightnessVal);
  els.sliderSpeed.value = state.lastSpeedVal;
  els.valSpeed.textContent = `${state.lastSpeedVal}%`;
  const uiMode = state.displayView === 'solid' ? 1 : state.activeModeVal;
  els.animDropdown.value = String(uiMode);
  setDisplayView(
    els.solidView,
    els.animationView,
    els.modeSegSolid,
    els.modeSegAnimation,
    state.displayView,
    { animate: false }
  );
  syncRemotePanels();
  updateModeDropdown(uiMode);
  updatePreviewChrome();
}

export async function setPowerState(on) {
  state.isPoweredOn = on;
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
}

function stepBrightness(delta) {
  const next = Math.min(8, Math.max(1, state.lastBrightnessVal + delta));
  if (next === state.lastBrightnessVal) return;
  haptic('light');
  onBrightnessInput(next, { immediate: true });
}

function stepSpeed(delta) {
  const next = Math.min(100, Math.max(0, state.lastSpeedVal + delta));
  if (next === state.lastSpeedVal) return;
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
  state.lastBrightnessVal = val;
  syncBrightnessSliders(val);
  persistScene();
  if (bTimeout) clearTimeout(bTimeout);
  const send = () => {
    if (ble.isConnected && state.isPoweredOn) ble.sendBrightness(val);
  };
  if (immediate) {
    send();
  } else {
    bTimeout = setTimeout(send, 120);
  }
}

function onSpeedInput(val, { immediate = false } = {}) {
  state.lastSpeedVal = val;
  els.sliderSpeed.value = val;
  els.valSpeed.textContent = `${val}%`;
  persistScene();
  if (sTimeout) clearTimeout(sTimeout);
  const send = () => {
    if (ble.isConnected && state.isPoweredOn) ble.sendSpeed(val);
  };
  if (immediate) {
    send();
  } else {
    sTimeout = setTimeout(send, 120);
  }
}

export function initSceneSync() {
  els.sliderBrightness.addEventListener('input', (e) =>
    onBrightnessInput(parseInt(e.target.value, 10))
  );
  els.sliderBrightnessAnim.addEventListener('input', (e) =>
    onBrightnessInput(parseInt(e.target.value, 10))
  );
  els.sliderSpeed.addEventListener('input', (e) => onSpeedInput(parseInt(e.target.value, 10)));

  if (els.powerBtn) {
    els.powerBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!ble.isConnected) {
        haptic('heavy');
        log('Connect to your sign before using power.', 'info');
        return;
      }
      setPowerState(!state.isPoweredOn);
    });
  }

  bindStepperButtons();
  applySavedSceneToUI();
  syncControlPanelsEnabled();
  updatePowerUI(state.isPoweredOn);
}
