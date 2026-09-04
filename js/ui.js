import { formatModeLabel, getModeName, MODE_COUNT } from './mode-names.js';

export const APP_VERSION = '2.2.1';

export function createLogger(consoleBody) {
  return function log(message, type = 'info') {
    const entry = document.createElement('div');
    entry.className = `console-entry ${type}`;
    const now = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    entry.textContent = `[${now}] ${message}`;
    consoleBody.appendChild(entry);
    consoleBody.scrollTop = consoleBody.scrollHeight;
  };
}

function accentOnColor(hexColor) {
  const hex = hexColor.replace('#', '');
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.58 ? '#020D0A' : '#FFFFFF';
}

export function updateNeonThemeColor(hexColor, panels) {
  /* M3: color feedback on squircles only, not a global UI retint. */
  void panels;
  return hexColor;
}

export function truncatePresetLabel(name, maxLen = 6) {
  if (!name) return '';
  const trimmed = String(name).trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function rgbToHex(r, g, b) {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

export function haptic(type = 'light') {
  if (navigator.vibrate) {
    navigator.vibrate(type === 'heavy' ? 50 : 15);
  }
}

export function updateConnectionChip(chipEl, textEl, state, name = '', lastDevice = null) {
  if (!chipEl || !textEl) return;

  chipEl.className = `status-chip chip-${state}`;

  if (state === 'connecting') {
    textEl.textContent = 'Connecting…';
    return;
  }

  if (state === 'connected') {
    const label = name || 'Connected';
    textEl.textContent = label.length > 14 ? `${label.slice(0, 12)}…` : label;
    return;
  }

  if (state === 'error') {
    textEl.textContent = 'Tap to connect';
    return;
  }

  textEl.textContent = 'Tap to connect';
}

export function updateConnectQuickAction(btnEl, labelEl, state, name = '') {
  if (!btnEl) return;

  btnEl.classList.remove('is-connected', 'is-connecting', 'is-offline');

  if (state === 'connecting') {
    btnEl.classList.add('is-connecting');
    if (labelEl) labelEl.textContent = 'Connecting…';
    btnEl.setAttribute('aria-label', 'Connecting to sign');
    return;
  }

  if (state === 'connected') {
    btnEl.classList.add('is-connected');
    const shortName = name && name.length > 10 ? `${name.slice(0, 8)}…` : name;
    if (labelEl) labelEl.textContent = shortName || 'Connected';
    btnEl.setAttribute('aria-label', name ? `Connected to ${name}. Open settings` : 'Connected. Open settings');
    return;
  }

  btnEl.classList.add('is-offline');
  if (labelEl) labelEl.textContent = 'Connect';
  btnEl.setAttribute('aria-label', 'Connection and settings');
}

let viewTransitionLock = false;

export function setDisplayView(
  solidView,
  animationView,
  segSolid,
  segAnimation,
  view,
  { animate = true } = {}
) {
  const isSolid = view === 'solid';
  const incoming = isSolid ? solidView : animationView;
  const outgoing = isSolid ? animationView : solidView;

  segSolid?.classList.toggle('active', isSolid);
  segSolid?.setAttribute('aria-selected', isSolid ? 'true' : 'false');
  segAnimation?.classList.toggle('active', !isSolid);
  segAnimation?.setAttribute('aria-selected', !isSolid ? 'true' : 'false');

  if (!solidView || !animationView) return;

  const applyView = () => {
    solidView.classList.toggle('is-active', isSolid);
    solidView.hidden = !isSolid;
    solidView.inert = !isSolid;
    animationView.classList.toggle('is-active', !isSolid);
    animationView.hidden = isSolid;
    animationView.inert = isSolid;
    solidView.classList.remove('is-exiting');
    animationView.classList.remove('is-exiting');
  };

  if (!animate || viewTransitionLock || !incoming || !outgoing) {
    applyView();
    return;
  }

  if (incoming.classList.contains('is-active')) return;

  viewTransitionLock = true;
  outgoing.classList.remove('is-active');
  outgoing.classList.add('is-exiting');
  outgoing.inert = true;
  outgoing.hidden = true;

  incoming.hidden = false;
  incoming.inert = false;
  incoming.classList.add('is-active');

  window.setTimeout(() => {
    outgoing.classList.remove('is-exiting');
    viewTransitionLock = false;
  }, 280);
}

export function setupPaletteToggle(toggleBtn, { sheet, closeBtn, backdropSelector } = {}) {
  if (!toggleBtn) return;

  const sheetEl = sheet || document.getElementById('palette-sheet');
  const close = closeBtn || document.getElementById('btn-close-palette');
  const backdrop = sheetEl?.querySelector(backdropSelector || '[data-close-palette]');

  function openSheet() {
    if (!sheetEl) return;
    sheetEl.classList.remove('hidden');
    document.body.classList.add('sheet-open');
    toggleBtn.setAttribute('aria-expanded', 'true');
    haptic('light');
  }

  function closeSheet() {
    if (!sheetEl) return;
    sheetEl.classList.add('hidden');
    document.body.classList.remove('sheet-open');
    toggleBtn.setAttribute('aria-expanded', 'false');
  }

  toggleBtn.addEventListener('click', openSheet);
  close?.addEventListener('click', closeSheet);
  backdrop?.addEventListener('click', closeSheet);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && sheetEl && !sheetEl.classList.contains('hidden')) {
      closeSheet();
    }
  });
}

export function setupModePickerSheet({
  sheet,
  openBtn,
  closeBtn,
  searchInput,
  listEl,
  onModeSelect,
}) {
  if (!sheet) return;

  const backdrop = sheet.querySelector('[data-close-mode-picker]');

  function open() {
    sheet.classList.remove('hidden');
    document.body.classList.add('sheet-open');
    haptic('light');
    searchInput?.focus();
  }

  function close() {
    sheet.classList.add('hidden');
    document.body.classList.remove('sheet-open');
    if (searchInput) searchInput.value = '';
  }

  window.openModePickerSheet = open;

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  searchInput?.addEventListener('input', () => {
    const active = Number(document.getElementById('anim-dropdown')?.value || 1);
    filterAnimationOptions(null, searchInput.value, active, listEl, {
      num: document.getElementById('anim-mode-hero-num'),
      name: document.getElementById('anim-mode-hero-name'),
      meta: document.getElementById('anim-mode-hero-meta'),
      readout: document.getElementById('anim-stepper-readout'),
    });
  });

  listEl?.addEventListener('click', (e) => {
    const item = e.target.closest('.mode-list-item');
    if (!item) return;
    const mode = parseInt(item.dataset.mode, 10);
    if (!Number.isFinite(mode)) return;
    onModeSelect?.(mode);
    close();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.classList.contains('hidden')) close();
  });
}

function bindKeyboardAwareModal(modal) {
  if (!modal) return { open: () => {}, close: () => {} };

  const updateLift = () => {
    const vv = window.visualViewport;
    if (!vv) {
      modal.style.removeProperty('--vv-lift');
      return;
    }
    const obscured = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
    modal.style.setProperty('--vv-lift', `${obscured}px`);
  };

  return {
    open() {
      modal.classList.add('keyboard-aware');
      updateLift();
      window.visualViewport?.addEventListener('resize', updateLift);
      window.visualViewport?.addEventListener('scroll', updateLift);
    },
    close() {
      modal.classList.remove('keyboard-aware');
      modal.style.removeProperty('--vv-lift');
      window.visualViewport?.removeEventListener('resize', updateLift);
      window.visualViewport?.removeEventListener('scroll', updateLift);
    },
  };
}

export function setupColorPresetModal({ modal, input, btnConfirm, btnCancel, onConfirm }) {
  if (!modal) return;

  const keyboard = bindKeyboardAwareModal(modal);

  function closeModal() {
    keyboard.close();
    modal.classList.add('hidden');
  }

  window.openColorPresetModal = (defaultName = '') => {
    input.value = defaultName;
    modal.classList.remove('hidden');
    keyboard.open();
    requestAnimationFrame(() => {
      input.focus();
      input.select();
      setTimeout(() => {
        input.scrollIntoView({ block: 'center', behavior: 'smooth' });
      }, 300);
    });
  };

  btnConfirm?.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    onConfirm?.(name);
    closeModal();
  });

  btnCancel?.addEventListener('click', closeModal);

  modal.querySelector('[data-close-color-preset]')?.addEventListener('click', closeModal);

  input?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnConfirm?.click();
    if (e.key === 'Escape') btnCancel?.click();
  });
}

export function setupSettingsSheet({ sheet, openBtn, closeBtn }) {
  if (!sheet) return;

  const backdrop = sheet.querySelector('[data-close-sheet]');

  function open() {
    sheet.classList.remove('hidden');
    document.body.classList.add('sheet-open');
    haptic('light');
  }

  function close() {
    sheet.classList.add('hidden');
    document.body.classList.remove('sheet-open');
  }

  window.openSettingsSheet = open;

  openBtn?.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  backdrop?.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.classList.contains('hidden')) close();
  });
}

export class WakeLockManager {
  constructor(onLog) {
    this.onLog = onLog || (() => {});
    this.lock = null;
    this._onVisibility = this._onVisibility.bind(this);
  }

  async acquire() {
    if (!('wakeLock' in navigator)) return;
    try {
      this.lock = await navigator.wakeLock.request('screen');
      this.lock.addEventListener('release', () => {
        this.lock = null;
      });
      document.addEventListener('visibilitychange', this._onVisibility);
    } catch (error) {
      this.onLog(`Wake lock unavailable: ${error.message}`, 'info');
    }
  }

  async release() {
    document.removeEventListener('visibilitychange', this._onVisibility);
    if (this.lock) {
      try {
        await this.lock.release();
      } catch {
        /* already released */
      }
      this.lock = null;
    }
  }

  async _onVisibility() {
    if (document.visibilityState === 'visible' && !this.lock) {
      await this.acquire();
    }
  }
}

function isBleSupported() {
  return Boolean(navigator.bluetooth?.requestDevice);
}

export function setupCompatBanner(bannerEl, log) {
  if (isBleSupported()) return;

  bannerEl.classList.remove('hidden');
  bannerEl.innerHTML = `
    <div class="compat-banner-text">
      <strong>Web Bluetooth not supported</strong>
      <span>Use Chrome or Edge on desktop/Android over HTTPS.</span>
    </div>
  `;

  log('Web Bluetooth is unavailable in this browser.', 'error');
}

export function setupFavoriteModal({ modal, input, btnConfirm, btnCancel, onConfirm }) {
  let pendingMode = null;

  window.openFavoriteModal = (mode) => {
    pendingMode = mode;
    const label = getModeName(mode);
    input.value = label;
    modal.classList.remove('hidden');
    input.focus();
    input.select();
  };

  btnConfirm.addEventListener('click', () => {
    if (pendingMode === null) return;
    const name = input.value.trim() || `Mode ${pendingMode}`;
    onConfirm(pendingMode, name);
    pendingMode = null;
    modal.classList.add('hidden');
  });

  btnCancel.addEventListener('click', () => {
    pendingMode = null;
    modal.classList.add('hidden');
  });

  modal.querySelector('[data-close-favorite]')?.addEventListener('click', () => {
    pendingMode = null;
    modal.classList.add('hidden');
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      pendingMode = null;
      modal.classList.add('hidden');
    }
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') btnConfirm.click();
    if (e.key === 'Escape') btnCancel.click();
  });
}

export function filterAnimationOptions(selectEl, query, selectedValue, listEl, heroEls) {
  const q = query.trim().toLowerCase();
  const current = Number(selectedValue ?? selectEl?.value ?? 1);

  if (selectEl) {
    selectEl.innerHTML = '';
    for (let i = 1; i <= MODE_COUNT; i++) {
      const label = formatModeLabel(i);
      const matches = !q || label.toLowerCase().includes(q) || String(i).includes(q);
      if (!matches) continue;

      const opt = document.createElement('option');
      opt.value = i;
      opt.textContent = label;
      selectEl.appendChild(opt);
    }

    if (selectEl.options.length === 0) {
      const opt = document.createElement('option');
      opt.value = current;
      opt.textContent = formatModeLabel(current);
      selectEl.appendChild(opt);
    }

    const hasCurrent = Array.from(selectEl.options).some((o) => o.value === String(current));
    const nextValue = hasCurrent ? String(current) : selectEl.options[0]?.value || '1';
    if (selectEl.value !== nextValue) {
      selectEl.value = nextValue;
    }
  }

  if (listEl && window.__floroModeNames?.renderModeList) {
    window.__floroModeNames.renderModeList(listEl, { query: q, activeMode: current });
  }

  if (heroEls && window.__floroModeNames?.updateModeHero) {
    window.__floroModeNames.updateModeHero(heroEls, current);
  }
}
