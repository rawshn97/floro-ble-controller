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

export function setupInstallBanner({ bannerEl, btnInstall, btnDismiss, log }) {
  let deferredPrompt = null;
  const dismissed = localStorage.getItem('floro_install_dismissed') === '1';

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (dismissed) return;
    deferredPrompt = e;
    bannerEl.classList.remove('hidden');
  });

  btnInstall.addEventListener('click', async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      log('User installed FloRo Controller app.', 'success');
    }
    bannerEl.classList.add('hidden');
    deferredPrompt = null;
  });

  btnDismiss.addEventListener('click', () => {
    localStorage.setItem('floro_install_dismissed', '1');
    bannerEl.classList.add('hidden');
  });
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
