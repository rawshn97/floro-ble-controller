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

export function toggleConsole(consoleBody, consoleArrow) {
  consoleBody.classList.toggle('collapsed');
  consoleArrow.classList.toggle('collapsed');
}

export function updateNeonThemeColor(hexColor, panels) {
  document.documentElement.style.setProperty('--neon-glow', hexColor);
  document.documentElement.style.setProperty('--neon-glow-rgba', `${hexColor}40`);

  panels.forEach((panel) => {
    panel.style.boxShadow = `0 8px 32px 0 rgba(0, 0, 0, 0.4), 0 0 16px 0 ${hexColor}20`;
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
  bannerEl.classList.add('compat-banner');
  bannerEl.innerHTML = `
    <div>
      <div class="banner-title">Web Bluetooth not supported</div>
      <div class="banner-subtitle">Use Chrome or Edge on desktop/Android over HTTPS to control your sign.</div>
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
  iosStepsEl,
  btnInstall,
  btnDismiss,
  headerBtn,
  modal,
  modalTitle,
  modalDesc,
  modalSteps,
  modalClose,
  modalAction,
  log,
}) {
  const DISMISS_KEY = 'floro_install_dismissed';
  let deferredPrompt = null;

  function isStandalone() {
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );
  }

  function isIOS() {
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    );
  }

  function isDismissed() {
    return localStorage.getItem(DISMISS_KEY) === '1';
  }

  function updateHeaderButton() {
    if (!headerBtn) return;
    headerBtn.classList.toggle('hidden', isStandalone());
  }

  function hideBanner() {
    bannerEl.classList.add('hidden');
  }

  function showAndroidBanner() {
    bannerTitle.textContent = 'Install FloRo as an App';
    bannerSubtitle.classList.add('hidden');
    iosStepsEl.classList.add('hidden');
    btnInstall.classList.remove('hidden');
    btnInstall.textContent = 'Install';
    bannerEl.classList.remove('hidden');
  }

  function showIOSBanner() {
    bannerTitle.textContent = 'Add FloRo to Home Screen';
    bannerSubtitle.textContent = 'Install for quick access from your home screen.';
    bannerSubtitle.classList.remove('hidden');
    iosStepsEl.classList.remove('hidden');
    btnInstall.classList.remove('hidden');
    btnInstall.textContent = 'How to Install';
    bannerEl.classList.remove('hidden');
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
      openInstallModal(isIOS() ? 'ios' : 'generic');
      return;
    }

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      log('User installed FloRo Controller app.', 'success');
      updateHeaderButton();
    }
    hideBanner();
    deferredPrompt = null;
    closeInstallModal();
  }

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    updateHeaderButton();
    if (!isDismissed()) {
      showAndroidBanner();
    }
  });

  window.addEventListener('appinstalled', () => {
    log('FloRo Controller installed.', 'success');
    hideBanner();
    deferredPrompt = null;
    updateHeaderButton();
  });

  btnInstall.addEventListener('click', () => {
    if (isIOS() && !deferredPrompt) {
      openInstallModal('ios');
      return;
    }
    triggerInstall();
  });

  btnDismiss.addEventListener('click', () => {
    localStorage.setItem(DISMISS_KEY, '1');
    hideBanner();
    log('Install banner dismissed. Tap the header download icon anytime to install.', 'info');
  });

  headerBtn?.addEventListener('click', () => {
    if (deferredPrompt) {
      openInstallModal('android');
      return;
    }
    openInstallModal(isIOS() ? 'ios' : 'generic');
  });

  modalClose.addEventListener('click', closeInstallModal);
  modalAction.addEventListener('click', triggerInstall);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeInstallModal();
  });

  updateHeaderButton();

  if (!isStandalone() && isIOS() && !isDismissed()) {
    showIOSBanner();
  }
}

/** @deprecated Use setupPwaInstall */
export function setupInstallBanner(opts) {
  setupPwaInstall(opts);
}

export function setupFavoriteModal({ modal, input, btnConfirm, btnCancel, onConfirm }) {
  let pendingMode = null;

  window.openFavoriteModal = (mode) => {
    pendingMode = mode;
    input.value = `Mode ${mode}`;
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

export function filterAnimationOptions(selectEl, query, selectedValue) {
  const q = query.trim().toLowerCase();
  const current = selectedValue ?? selectEl.value;

  selectEl.innerHTML = '';
  for (let i = 1; i <= 200; i++) {
    const label = i === 1 ? 'Mode 1 — Solid Color' : `Animation Mode ${i}`;
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
    opt.textContent = `Animation Mode ${current}`;
    selectEl.appendChild(opt);
  }

  const hasCurrent = Array.from(selectEl.options).some((o) => o.value === String(current));
  selectEl.value = hasCurrent ? current : selectEl.options[0].value;
}
