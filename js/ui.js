import { formatModeLabel, getModeName, MODE_COUNT } from './mode-names.js';

export const APP_VERSION = '2.1.0';

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
  document.documentElement.style.setProperty('--neon-glow', hexColor);
  document.documentElement.style.setProperty('--accent', hexColor);
  document.documentElement.style.setProperty('--accent-on', accentOnColor(hexColor));
  document.documentElement.style.setProperty('--neon-glow-rgba', `${hexColor}59`);
  document.documentElement.style.setProperty('--accent-rgba', `${hexColor}59`);
  document.documentElement.style.setProperty('--accent-muted', `${hexColor}26`);
  document.documentElement.style.setProperty('--accent-dim', `${hexColor}2E`);
  document.documentElement.style.setProperty('--accent-glow', `${hexColor}73`);

  panels.forEach((panel) => {
    if (!panel) return;
    panel.style.boxShadow = `0 2px 20px ${hexColor}18`;
    panel.style.borderColor = `${hexColor}40`;
  });

  return hexColor;
}

let _arcLength = 0;

function getArcLength(arcEl) {
  if (!_arcLength && arcEl?.getTotalLength) {
    _arcLength = arcEl.getTotalLength();
  }
  return _arcLength || 283;
}

export function updateArcGauge(gaugeEl, { value, max, label, sublabel, poweredOff }) {
  if (!gaugeEl) return;

  const arc = gaugeEl.querySelector('.scene-gauge__arc');
  const valueEl = gaugeEl.querySelector('#scene-gauge-value') || gaugeEl.querySelector('.scene-gauge__value');
  const subEl = gaugeEl.querySelector('#scene-gauge-sub') || gaugeEl.querySelector('.scene-gauge__sub');

  const pct = poweredOff || max <= 0 ? 0 : Math.min(1, Math.max(0, value / max));
  const len = getArcLength(arc);

  if (arc) {
    arc.style.strokeDasharray = `${len * pct} ${len}`;
  }
  if (valueEl) valueEl.textContent = label ?? String(value);
  if (subEl) subEl.textContent = sublabel ?? '';

  if (poweredOff) {
    gaugeEl.setAttribute('aria-label', 'Power off');
  } else if (sublabel) {
    gaugeEl.setAttribute('aria-label', `${label} ${sublabel}`.trim());
  }
}

/** Single hub for arc gauge readout updates */
export function syncSceneGauge(state) {
  const gaugeEl = document.getElementById('scene-gauge');
  if (!gaugeEl) return;

  const {
    displayView = 'solid',
    isPoweredOn = true,
    brightness = 8,
    speed = 50,
    activeMode = 32,
    connected = true,
  } = state;

  if (!connected || !isPoweredOn) {
    updateArcGauge(gaugeEl, {
      value: 0,
      max: 1,
      label: 'OFF',
      sublabel: connected ? 'Powered off' : 'Offline',
      poweredOff: true,
    });
    return;
  }

  if (displayView === 'solid') {
    updateArcGauge(gaugeEl, {
      value: brightness,
      max: 8,
      label: String(brightness),
      sublabel: 'Brightness',
      poweredOff: false,
    });
    return;
  }

  updateArcGauge(gaugeEl, {
    value: speed,
    max: 100,
    label: String(activeMode),
    sublabel: getModeName(Number(activeMode)),
    poweredOff: false,
  });
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

  chipEl.className = `status-chip chip-${state} sr-only`;

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

  segSolid.classList.toggle('active', isSolid);
  segSolid.setAttribute('aria-selected', isSolid ? 'true' : 'false');
  segAnimation.classList.toggle('active', !isSolid);
  segAnimation.setAttribute('aria-selected', !isSolid ? 'true' : 'false');

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

  if (!animate || viewTransitionLock) {
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

export function setupColorPresetModal({ modal, input, btnConfirm, btnCancel, onConfirm }) {
  if (!modal) return;

  window.openColorPresetModal = (defaultName = '') => {
    input.value = defaultName;
    modal.classList.remove('hidden');
    input.focus();
    input.select();
  };

  btnConfirm?.addEventListener('click', () => {
    const name = input.value.trim();
    if (!name) return;
    onConfirm?.(name);
    modal.classList.add('hidden');
  });

  btnCancel?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

  modal.querySelector('[data-close-color-preset]')?.addEventListener('click', () => {
    modal.classList.add('hidden');
  });

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

function isBleSupported() {
  return Boolean(navigator.bluetooth?.requestDevice);
}

export function setupPwaInstall({
  bannerEl,
  bannerTitle,
  bannerSubtitle,
  btnInstall,
  btnDismiss,
  settingsBtn,
  modal,
  modalTitle,
  modalDesc,
  modalSteps,
  modalClose,
  modalAction,
  log,
}) {
  const DISMISS_KEY = 'floro_install_dismissed_v4';
  const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  const ANDROID_FALLBACK_DELAY_MS = 2500;
  let deferredPrompt = window.__floroDeferredInstall || null;
  let androidFallbackTimer = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.matchMedia('(display-mode: minimal-ui)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  function isAndroid() {
    return /android/i.test(navigator.userAgent);
  }

  function androidStepItems() {
    return [
      'Tap the menu (⋮) in Chrome',
      'Choose Install app (not Add to Home screen)',
      'Confirm to install FloRo as a standalone app',
    ];
  }

  function readDismissedAt() {
    try {
      const raw = localStorage.getItem(DISMISS_KEY);
      if (!raw) return null;
      const ts = Number(raw);
      return Number.isFinite(ts) ? ts : Date.now();
    } catch {
      return null;
    }
  }

  function isDismissed() {
    const dismissedAt = readDismissedAt();
    if (dismissedAt === null) return false;
    return Date.now() - dismissedAt < DISMISS_TTL_MS;
  }

  function shouldSuppressPrompt() {
    return isStandalone() || isDismissed();
  }

  function installHelpText() {
    if (isIOS() && !deferredPrompt) {
      return 'Tap Share, then Add to Home Screen to open FloRo directly.';
    }
    if (isAndroid() && !deferredPrompt) {
      return 'Tap the menu (⋮), then Install app (not Add to Home screen) for one-tap access.';
    }
    return 'Add FloRo Controller to your home screen for one-tap access.';
  }

  function showInstallPrompt() {
    if (!bannerEl || shouldSuppressPrompt()) return;

    bannerEl.classList.remove('hidden');
    bannerEl.setAttribute('aria-hidden', 'false');
    document.querySelector('.app-shell')?.classList.add('install-banner-visible');
    updateInstallPromptContent();
  }

  function hideInstallPrompt() {
    bannerEl?.classList.add('hidden');
    bannerEl?.setAttribute('aria-hidden', 'true');
    document.querySelector('.app-shell')?.classList.remove('install-banner-visible');
  }

  function updateInstallPromptContent() {
    if (bannerTitle) {
      bannerTitle.textContent = 'Install FloRo';
    }

    if (bannerSubtitle) {
      bannerSubtitle.textContent = installHelpText();
    }

    if (btnInstall) {
      btnInstall.classList.remove('hidden');
      btnInstall.textContent = 'Install';
    }

    if (btnDismiss) {
      btnDismiss.classList.remove('hidden');
    }
  }

  function scheduleAndroidFallback() {
    if (shouldSuppressPrompt() || !isAndroid() || deferredPrompt) return;

    androidFallbackTimer = window.setTimeout(() => {
      if (!deferredPrompt && !shouldSuppressPrompt()) {
        showInstallPrompt();
      }
    }, ANDROID_FALLBACK_DELAY_MS);
  }

  function iosStepItems() {
    return [
      'Tap the Share button in Safari (square with arrow)',
      'Scroll down and tap Add to Home Screen',
      'Tap Add to confirm',
    ];
  }

  function genericStepItems() {
    return [
      'Open this page in Chrome or Edge',
      'Use the browser menu and choose Install app or Add to Home Screen',
      'Confirm to add FloRo to your device',
    ];
  }

  function renderModalSteps(items) {
    if (!modalSteps) return;
    modalSteps.innerHTML = '';
    items.forEach((text) => {
      const li = document.createElement('li');
      li.textContent = text;
      modalSteps.appendChild(li);
    });
  }

  function openInstallModal(mode) {
    modal.classList.remove('hidden');
    modalSteps.classList.remove('hidden');
    modalAction.classList.add('hidden');

    if (mode === 'android-fallback') {
      modalTitle.textContent = 'Install FloRo';
      modalDesc.textContent = 'For a standalone app without the browser bar, use Install app in Chrome:';
      renderModalSteps(androidStepItems());
      return;
    }

    if (mode === 'ios') {
      modalTitle.textContent = 'Add to Home Screen';
      modalDesc.textContent = 'iOS does not support automatic install. Follow these steps in Safari:';
      renderModalSteps(iosStepItems());
      return;
    }

    modalTitle.textContent = 'Install FloRo';
    modalDesc.textContent = 'Add FloRo Controller to your home screen:';
    renderModalSteps(genericStepItems());
  }

  function closeInstallModal() {
    modal.classList.add('hidden');
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) return false;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      log('User installed FloRo Controller app.', 'success');
    }
    hideInstallPrompt();
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    closeInstallModal();
    return true;
  }

  function openManualInstallHelp() {
    if (isIOS()) {
      openInstallModal('ios');
      return;
    }
    if (isAndroid()) {
      openInstallModal('android-fallback');
      return;
    }
    openInstallModal('generic');
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.__floroDeferredInstall = e;
    if (androidFallbackTimer) {
      window.clearTimeout(androidFallbackTimer);
      androidFallbackTimer = null;
    }
    showInstallPrompt();
  });

  if (shouldSuppressPrompt()) {
    hideInstallPrompt();
  } else if (isIOS()) {
    showInstallPrompt();
  } else {
    hideInstallPrompt();
    scheduleAndroidFallback();
  }

  window.addEventListener('appinstalled', () => {
    log('FloRo Controller installed.', 'success');
    hideInstallPrompt();
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
  });

  btnInstall?.addEventListener('click', async () => {
    if (await triggerNativeInstall()) return;
    openManualInstallHelp();
  });

  btnDismiss?.addEventListener('click', () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore storage failures */
    }
    hideInstallPrompt();
    log('Install prompt dismissed. Use Settings > Install App anytime.', 'info');
  });

  settingsBtn?.addEventListener('click', async () => {
    if (await triggerNativeInstall()) return;
    openManualInstallHelp();
  });

  modalClose?.addEventListener('click', closeInstallModal);
  modalAction?.addEventListener('click', () => {
    triggerNativeInstall();
  });
  modal?.querySelector('[data-close-install]')?.addEventListener('click', closeInstallModal);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeInstallModal();
  });

  if (settingsBtn && isStandalone()) {
    settingsBtn.closest('.settings-section')?.classList.add('hidden');
  }
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
