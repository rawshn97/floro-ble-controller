import { formatModeLabel, getModeName, MODE_COUNT } from './mode-names.js';

export const APP_VERSION = '2.0.0';

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

export function updateNeonThemeColor(hexColor, panels) {
  document.documentElement.style.setProperty('--neon-glow', hexColor);
  document.documentElement.style.setProperty('--accent', hexColor);
  document.documentElement.style.setProperty('--neon-glow-rgba', `${hexColor}59`);
  document.documentElement.style.setProperty('--accent-rgba', `${hexColor}59`);
  document.documentElement.style.setProperty('--accent-muted', `${hexColor}26`);

  panels.forEach((panel) => {
    if (!panel) return;
    panel.style.boxShadow = `0 2px 20px ${hexColor}18`;
    panel.style.borderColor = `${hexColor}40`;
  });

  return hexColor;
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

  if (lastDevice?.name) {
    textEl.textContent = 'Tap to connect';
  } else {
    textEl.textContent = 'Offline';
  }
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

export function setupPaletteToggle(toggleBtn, bodyEl) {
  if (!toggleBtn || !bodyEl) return;

  const syncPaletteA11y = (expanded) => {
    bodyEl.setAttribute('aria-hidden', expanded ? 'false' : 'true');
    bodyEl.inert = !expanded;
  };

  syncPaletteA11y(false);

  toggleBtn.addEventListener('click', () => {
    const expanded = toggleBtn.getAttribute('aria-expanded') === 'true';
    const nextExpanded = !expanded;
    toggleBtn.setAttribute('aria-expanded', nextExpanded ? 'true' : 'false');
    bodyEl.classList.toggle('is-collapsed', !nextExpanded);
    syncPaletteA11y(nextExpanded);
    haptic('light');
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
  const DISMISS_KEY = 'floro_install_dismissed_v3';
  const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
  let deferredPrompt = window.__floroDeferredInstall || null;

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

  function isMobile() {
    return (
      isIOS() ||
      isAndroid() ||
      (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 900px)').matches)
    );
  }

  function androidStepItems() {
    return [
      'Tap the menu (⋮) in Chrome or Edge',
      'Choose Install app or Add to Home screen',
      'Confirm to add FloRo Controller',
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

  function installHelpText() {
    if (isIOS() && !deferredPrompt) {
      return 'Tap Share, then Add to Home Screen for one-tap access.';
    }
    if (isAndroid() && !deferredPrompt) {
      return 'Tap the menu (⋮), then Install app or Add to Home screen for one-tap access.';
    }
    return 'Add FloRo Controller to your home screen for quick access.';
  }

  function hideBannerFully() {
    bannerEl?.classList.add('hidden');
    bannerEl?.classList.remove('is-compact');
    bannerEl?.setAttribute('aria-hidden', 'true');
  }

  function showBanner({ compact = false } = {}) {
    if (!bannerEl || isStandalone()) return;

    bannerEl.classList.remove('hidden');
    bannerEl.classList.toggle('is-compact', compact);
    bannerEl.setAttribute('aria-hidden', 'false');

    if (bannerTitle) {
      bannerTitle.textContent = 'Install FloRo';
    }

    if (bannerSubtitle) {
      bannerSubtitle.textContent = installHelpText();
    }

    if (btnInstall) {
      btnInstall.classList.remove('hidden');
      if (deferredPrompt) {
        btnInstall.textContent = 'Install';
      } else if (isIOS()) {
        btnInstall.textContent = 'How to install';
      } else {
        btnInstall.textContent = 'Install';
      }
    }

    if (btnDismiss) {
      btnDismiss.classList.toggle('hidden', compact);
    }
  }

  function refreshInstallDock() {
    if (isStandalone()) {
      hideBannerFully();
      return;
    }

    if (!isMobile()) {
      if (isDismissed()) {
        hideBannerFully();
      } else {
        showBanner({ compact: false });
      }
      return;
    }

    // Mobile: always show Install (compact bar after dismiss)
    showBanner({ compact: isDismissed() });
  }

  const ANDROID_FALLBACK_DELAY_MS = 2500;

  function scheduleAndroidFallback() {
    if (isStandalone() || !isAndroid() || deferredPrompt) return;
    window.setTimeout(() => {
      if (!deferredPrompt && !isStandalone()) {
        refreshInstallDock();
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

    if (mode === 'android' && deferredPrompt) {
      modalTitle.textContent = 'Install FloRo';
      modalDesc.textContent = 'Add FloRo Controller to your home screen for quick access.';
      renderModalSteps(['Tap Install below', 'Confirm in the browser prompt']);
      modalSteps.classList.add('hidden');
      modalAction.classList.remove('hidden');
      modalAction.textContent = 'Install';
      return;
    }

    if (mode === 'android-fallback') {
      modalTitle.textContent = 'Install FloRo';
      modalDesc.textContent = 'Add FloRo Controller to your home screen:';
      renderModalSteps(androidStepItems());
      return;
    }

    modalSteps.classList.remove('hidden');
    modalAction.classList.add('hidden');

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

  async function triggerInstall() {
    if (!deferredPrompt) {
      if (isIOS()) {
        openInstallModal('ios');
      } else if (isAndroid()) {
        openInstallModal('android-fallback');
      } else {
        openInstallModal('generic');
      }
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      log('User installed FloRo Controller app.', 'success');
    }
    hideBannerFully();
    deferredPrompt = null;
    closeInstallModal();
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    window.__floroDeferredInstall = e;
    refreshInstallDock();
  });

  refreshInstallDock();
  scheduleAndroidFallback();

  window.addEventListener('appinstalled', () => {
    log('FloRo Controller installed.', 'success');
    hideBannerFully();
    deferredPrompt = null;
  });

  btnInstall?.addEventListener('click', () => {
    triggerInstall();
  });

  btnDismiss?.addEventListener('click', () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore storage failures */
    }
    refreshInstallDock();
    log('Install prompt minimized. Install stays available below.', 'info');
  });

  settingsBtn?.addEventListener('click', () => {
    if (deferredPrompt) {
      openInstallModal('android');
      return;
    }
    if (isIOS()) {
      openInstallModal('ios');
      return;
    }
    if (isAndroid()) {
      openInstallModal('android-fallback');
      return;
    }
    openInstallModal('generic');
  });

  modalClose?.addEventListener('click', closeInstallModal);
  modalAction?.addEventListener('click', triggerInstall);
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
    selectEl.value = hasCurrent ? String(current) : selectEl.options[0]?.value || '1';
  }

  if (listEl && window.__floroModeNames?.renderModeList) {
    window.__floroModeNames.renderModeList(listEl, { query: q, activeMode: current });
  }

  if (heroEls && window.__floroModeNames?.updateModeHero) {
    window.__floroModeNames.updateModeHero(heroEls, current);
  }
}
