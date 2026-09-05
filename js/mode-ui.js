import { ble, els, log, modeHeroEls, persistScene, state } from './app-context.js';
import { updatePreviewChrome } from './color-ui.js';
import {
  formatModeLabel,
  getModeName,
  listModes,
  MODE_COUNT,
} from './mode-names.js';
import { syncRemotePanels } from './scene-sync.js';
import { filterAnimationOptions, haptic, setDisplayView, truncatePresetLabel } from './ui.js';

const FAVORITES_KEY = 'floro_favorites';

const defaultFavorites = [
  { mode: 32, label: getModeName(32) },
  { mode: 34, label: getModeName(34) },
  { mode: 35, label: getModeName(35) },
  { mode: 38, label: getModeName(38) },
];

export function renderModeList(listEl, { query = '', activeMode = 1 } = {}) {
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

export function updateModeHero(heroEls, mode) {
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

export function refreshAnimationPicker(mode = state.activeModeVal) {
  const query = els.modeSearchSheet?.value || els.modeSearch?.value || '';
  const pickerMode = state.displayView === 'solid' ? 1 : mode;
  filterAnimationOptions(
    els.animDropdown,
    query,
    pickerMode,
    els.modeListSheet || els.modeList,
    modeHeroEls
  );
  if (els.modeListSheet) {
    renderModeList(els.modeListSheet, { query, activeMode: pickerMode });
  }
}

export function updateModeDropdown(mode) {
  els.animDropdown.value = String(mode);
  renderModeList(els.modeList, { activeMode: mode });
  renderModeList(els.modeListSheet, {
    activeMode: mode,
    query: els.modeSearchSheet?.value || '',
  });
  updateModeHero(modeHeroEls, mode);
}

export function syncDisplayViewWithMode() {
  const target = state.activeModeVal === 1 ? 'solid' : 'animation';
  if (target !== state.displayView) {
    state.displayView = target;
    setDisplayView(
      els.solidView,
      els.animationView,
      els.modeSegSolid,
      els.modeSegAnimation,
      target
    );
    syncRemotePanels();
  }
}

export function setMode(mode, { sendBle = true } = {}) {
  state.activeModeVal = mode;
  if (mode > 1) {
    state.lastAnimationMode = mode;
  }

  updateModeDropdown(mode);
  highlightActiveFavorite();
  syncDisplayViewWithMode();
  persistScene();

  if (!sendBle) return;

  ble.bumpSceneGeneration();
  if (ble.isConnected && state.isPoweredOn) {
    ble.sendMode(mode);
  }
  haptic('light');
}

export function stepMode(delta) {
  let mode = parseInt(els.animDropdown.value, 10);
  do {
    mode += delta;
    if (mode < 2) mode = MODE_COUNT;
    if (mode > MODE_COUNT) mode = 2;
  } while (mode === 1);
  setMode(mode);
}

export function saveFavorites() {
  localStorage.setItem(FAVORITES_KEY, JSON.stringify(state.favorites));
}

export function renderFavorites() {
  els.favoritesGrid.innerHTML = '';
  state.favorites.forEach((fav) => {
    const chip = document.createElement('div');
    chip.className = `preset-tile${fav.mode === state.activeModeVal ? ' active' : ''}`;
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

    els.favoritesGrid.appendChild(chip);
  });
}

export function highlightActiveFavorite() {
  document.querySelectorAll('.preset-row--anim .preset-tile').forEach((chip) => {
    const mode = parseInt(chip.getAttribute('data-mode'), 10);
    chip.classList.toggle('active', mode === state.activeModeVal);
  });
}

export function loadFavorites() {
  const stored = localStorage.getItem(FAVORITES_KEY);
  if (stored === null) {
    state.favorites = [...defaultFavorites];
    saveFavorites();
  } else {
    try {
      const parsed = JSON.parse(stored);
      state.favorites = Array.isArray(parsed) ? parsed : [...defaultFavorites];
    } catch {
      state.favorites = [];
      saveFavorites();
      log('Preset data was corrupted. Cleared favorites.', 'info');
    }
  }
  renderFavorites();
}

function removeFavorite(mode) {
  state.favorites = state.favorites.filter((f) => f.mode !== mode);
  saveFavorites();
  renderFavorites();
  log(`Removed Mode ${mode} from presets.`, 'info');
}

export function addCurrentToFavorites() {
  const mode = state.activeModeVal;
  if (state.favorites.some((f) => f.mode === mode)) {
    log('Mode is already in your favorites.', 'info');
    return;
  }
  window.openFavoriteModal(mode);
}

export function initModeUI() {
  for (let i = 1; i <= MODE_COUNT; i++) {
    const opt = document.createElement('option');
    opt.value = i;
    opt.textContent = formatModeLabel(i);
    els.animDropdown.appendChild(opt);
  }
  refreshAnimationPicker(state.activeModeVal);
  loadFavorites();

  els.animDropdown.addEventListener('change', (e) => {
    setMode(parseInt(e.target.value, 10));
  });

  els.modeSegSolid.addEventListener('click', () => {
    if (state.displayView === 'solid' && state.activeModeVal === 1) return;
    state.displayView = 'solid';
    setDisplayView(
      els.solidView,
      els.animationView,
      els.modeSegSolid,
      els.modeSegAnimation,
      'solid'
    );
    syncRemotePanels();
    if (state.activeModeVal !== 1) setMode(1);
    else persistScene();
  });

  els.modeSegAnimation.addEventListener('click', () => {
    if (state.displayView === 'animation') return;
    state.displayView = 'animation';
    setDisplayView(
      els.solidView,
      els.animationView,
      els.modeSegSolid,
      els.modeSegAnimation,
      'animation'
    );
    syncRemotePanels();
    persistScene();
    if (state.activeModeVal === 1) setMode(state.lastAnimationMode);
  });

  document.getElementById('btn-add-favorite')?.addEventListener('click', () => {
    if (state.displayView !== 'animation') {
      els.modeSegAnimation.click();
    }
    addCurrentToFavorites();
  });

  document.getElementById('btn-preset-search-anim')?.addEventListener('click', () => {
    if (state.displayView !== 'animation') {
      els.modeSegAnimation.click();
    }
    window.openModePickerSheet?.();
  });
}
