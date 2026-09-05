import {
  ble,
  els,
  getColorPicker,
  persistScene,
  setColorPicker,
  state,
} from './app-context.js';
import { createColorPicker, loadRecentColors } from './color-picker.js';
import {
  NEON_COLORS,
  getSwatchTypeLabel,
  normalizeHex,
  resolveColorLabel,
  swatchTypeClass,
  truncateColorLabel,
} from './colors.js';
import { setMode } from './mode-ui.js';
import { hexToRgb } from './protocol.js';
import { syncColorToSign, syncRemotePanels, syncSceneToSign } from './scene-sync.js';
import { haptic, setDisplayView, truncatePresetLabel } from './ui.js';

const COLOR_PRESETS_KEY = 'floro_color_presets';
const COLOR_PRESET_MAX_COUNT = 12;

let colorLiveTimeout = null;
let colorPickNeedsModeSend = false;

function applySwatchClasses(el, hex) {
  if (!el) return;
  el.classList.remove('swatch--neon', 'swatch--saved', 'swatch--custom');
  el.classList.add(swatchTypeClass(hex, state.colorPresets));
}

export function updateColorHero() {
  const hex = normalizeHex(state.activeColor);
  if (els.colorHeroSwatch) {
    els.colorHeroSwatch.style.background = hex;
    applySwatchClasses(els.colorHeroSwatch, hex);
    els.colorHeroSwatch.classList.toggle('is-selected', true);
  }
  if (els.colorHeroName) {
    els.colorHeroName.textContent = resolveColorLabel(hex, state.colorPresets);
  }
  if (els.colorHeroType) {
    els.colorHeroType.textContent = getSwatchTypeLabel(hex, state.colorPresets);
  }
}

export function renderNeonGrid(container, { extraClass = '', stopPropagation = false } = {}) {
  if (!container) return;
  container.innerHTML = '';
  NEON_COLORS.forEach(({ hex, name }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    const selected = normalizeHex(hex) === normalizeHex(state.activeColor) ? ' selected' : '';
    btn.className = `swatch-btn${extraClass}${selected}`;
    btn.style.background = hex;
    btn.title = name;
    btn.setAttribute('aria-label', name);
    btn.addEventListener('click', (e) => {
      if (stopPropagation) e.stopPropagation();
      pickColor(hex);
    });
    container.appendChild(btn);
  });
}

export function renderColorStrip() {
  if (!els.colorRecentsStrip) return;
  updateColorHero();
  els.colorRecentsStrip.innerHTML = '';

  const recents = loadRecentColors().filter(
    (h) => normalizeHex(h) !== normalizeHex(state.activeColor)
  );
  const slots = recents.slice(0, 4);

  slots.forEach((hex) => {
    const col = document.createElement('button');
    col.type = 'button';
    col.className = 'recent-col';
    const sw = document.createElement('span');
    sw.className = `swatch-squircle ${swatchTypeClass(hex, state.colorPresets)}`;
    sw.style.background = hex;
    if (normalizeHex(hex) === normalizeHex(state.activeColor)) {
      sw.classList.add('is-selected');
    }
    const label = document.createElement('span');
    label.className = 'recent-label';
    label.textContent = truncateColorLabel(resolveColorLabel(hex, state.colorPresets));
    col.appendChild(sw);
    col.appendChild(label);
    col.addEventListener('click', (e) => {
      e.stopPropagation();
      pickColor(hex);
    });
    els.colorRecentsStrip.appendChild(col);
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
  els.colorRecentsStrip.appendChild(moreCol);
}

export function updatePreviewChrome() {
  updateColorHero();
  renderColorStrip();
  renderNeonGrid(els.neonGrid, { extraClass: ' swatch-squircle swatch--neon' });
  renderNeonGrid(els.neonGridStatic, { stopPropagation: true });
  highlightColorPresets();
}

export function updateColorPresetSectionVisibility() {
  if (!els.colorPresetSection) return;
  els.colorPresetSection.classList.toggle('hidden', state.displayView !== 'solid');
  els.colorPresetSection.toggleAttribute('hidden', state.displayView !== 'solid');
}

function openColorPickerSheet() {
  els.paletteToggle?.click() || els.btnOpenPalette?.click();
}

export function pickColor(hex, { commit = true } = {}) {
  const normalized = normalizeHex(hex);
  state.activeColor = normalized;
  getColorPicker().setHex(normalized, { commit: false });
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

function prepareSolidModeForColorPick() {
  if (state.activeModeVal === 1) return;
  state.displayView = 'solid';
  setDisplayView(
    els.solidView,
    els.animationView,
    els.modeSegSolid,
    els.modeSegAnimation,
    'solid'
  );
  syncRemotePanels();
  setMode(1, { sendBle: false });
  ble.bumpSceneGeneration();
  persistScene();
  colorPickNeedsModeSend = true;
}

export function sendColorToSignLive(hex, { immediate = false } = {}) {
  if (colorLiveTimeout) clearTimeout(colorLiveTimeout);
  const send = () => {
    colorLiveTimeout = null;
    if (!ble.isConnected || !state.isPoweredOn) return;
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

export async function applyColorSelection() {
  const switchingFromAnimation = state.activeModeVal !== 1;

  if (switchingFromAnimation) {
    state.displayView = 'solid';
    setDisplayView(
      els.solidView,
      els.animationView,
      els.modeSegSolid,
      els.modeSegAnimation,
      'solid'
    );
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

export function getMaxColorPresets() {
  return COLOR_PRESET_MAX_COUNT;
}

export function saveColorPresets() {
  localStorage.setItem(COLOR_PRESETS_KEY, JSON.stringify(state.colorPresets));
}

export function trimColorPresetsToMax() {
  const max = getMaxColorPresets();
  if (state.colorPresets.length <= max) return false;
  state.colorPresets = state.colorPresets.slice(0, max);
  saveColorPresets();
  return true;
}

export function renderColorPresets() {
  if (!els.colorPresetsRow) return;
  const max = getMaxColorPresets();
  const visiblePresets = state.colorPresets.slice(0, max);
  els.colorPresetsRow.innerHTML = '';
  els.colorPresetsRow.classList.remove('is-empty');

  if (visiblePresets.length === 0) {
    els.colorPresetsRow.classList.add('is-empty');
    const hint = document.createElement('span');
    hint.className = 'color-presets-empty-hint';
    hint.textContent = 'Save a preset from your custom color';
    els.colorPresetsRow.appendChild(hint);
    return;
  }

  visiblePresets.forEach((preset, index) => {
    const btn = document.createElement('button');
    const isSelected = normalizeHex(preset.hex) === normalizeHex(state.activeColor);
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
      state.colorPresets.splice(index, 1);
      saveColorPresets();
      renderColorPresets();
      updatePreviewChrome();
    });
    btn.appendChild(removeBtn);

    els.colorPresetsRow.appendChild(btn);
  });
}

export function highlightColorPresets() {
  if (!els.colorPresetsRow) return;
  els.colorPresetsRow.querySelectorAll('.swatch-btn').forEach((chip, index) => {
    const preset = state.colorPresets[index];
    if (!preset) return;
    chip.classList.toggle('selected', normalizeHex(preset.hex) === normalizeHex(state.activeColor));
  });
}

export function loadColorPresets() {
  try {
    const raw = localStorage.getItem(COLOR_PRESETS_KEY);
    state.colorPresets = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(state.colorPresets)) state.colorPresets = [];
  } catch {
    state.colorPresets = [];
  }
  trimColorPresetsToMax();
  renderColorPresets();
}

export function setupColorPickerWidget() {
  const colorPicker = createColorPicker({
    root: els.customColorPickerRoot,
    initialHex: state.activeColor,
    onColorChange: (hex) => {
      state.activeColor = hex;
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
  setColorPicker(colorPicker);
}

export function initColorUI() {
  setupColorPickerWidget();
  loadColorPresets();
  updatePreviewChrome();

  document.querySelector('.color-hero-icon')?.addEventListener('click', (e) => {
    e.stopPropagation();
    openColorPickerSheet();
  });

  document.getElementById('btn-close-palette')?.addEventListener('click', () => {
    getColorPicker().commitNow?.();
  });

  document.getElementById('btn-save-color-preset')?.addEventListener('click', () => {
    const hex = getColorPicker().getHex();
    window.openColorPresetModal?.(`Color ${hex.toUpperCase()}`);
  });

  let presetGridResizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(presetGridResizeTimer);
    presetGridResizeTimer = setTimeout(() => {
      if (trimColorPresetsToMax()) renderColorPresets();
    }, 150);
  });
}
