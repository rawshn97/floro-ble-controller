/** Native PWA install with honest manual and already-installed fallbacks. */

import { trackClarityEvent } from './clarity.js';

export const DISMISS_KEY = 'floro_install_dismissed_v7';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function isStandalone() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.matchMedia('(display-mode: minimal-ui)').matches ||
    window.navigator.standalone === true
  );
}

export function isIOS() {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  );
}

export function isAndroid() {
  return /android/i.test(navigator.userAgent);
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

function shouldSuppressBanner() {
  return isStandalone() || isDismissed();
}

function installHelpText(hasNativePrompt) {
  if (isIOS() && !hasNativePrompt) {
    return 'Open this page in Safari, tap Share, then Add to Home Screen.';
  }
  if (isAndroid() && !hasNativePrompt) {
    return 'Waiting for Chrome’s app installer. Do not create a shortcut—it opens as a browser tab.';
  }
  return 'Install FloRo so it opens full screen, not as a browser tab.';
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
  let deferredPrompt = window.__floroDeferredInstall || null;

  function showBanner() {
    if (!bannerEl || shouldSuppressBanner()) return;
    bannerEl.classList.remove('hidden');
    bannerEl.setAttribute('aria-hidden', 'false');
    syncBanner();
  }

  function hideBanner() {
    bannerEl?.classList.add('hidden');
    bannerEl?.setAttribute('aria-hidden', 'true');
  }

  function syncBanner() {
    const hasNativePrompt = Boolean(deferredPrompt);
    if (bannerTitle) {
      bannerTitle.textContent = 'Install FloRo Sign';
    }
    if (bannerSubtitle) {
      bannerSubtitle.textContent = installHelpText(hasNativePrompt);
    }
    if (btnInstall) {
      btnInstall.textContent = 'Install';
      btnInstall.classList.toggle('hidden', !hasNativePrompt);
    }
    if (hasNativePrompt) trackClarityEvent('sc_install_prompt_ready');
    btnDismiss?.classList.remove('hidden');
    syncSettingsInstall();
  }

  function syncSettingsInstall() {
    const section = settingsBtn?.closest('.settings-section');
    if (!section) return;
    const canInstallOrHelp =
      !isStandalone() && (Boolean(deferredPrompt) || isIOS());
    section.classList.toggle('hidden', !canInstallOrHelp);
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

  function openHelpSheet() {
    if (!modal) return;
    modal.classList.remove('hidden');
    modalSteps?.classList.remove('hidden');
    modalAction?.classList.add('hidden');

    if (isIOS()) {
      modalTitle.textContent = 'Add to Home Screen';
      modalDesc.textContent = 'iPhone and iPad cannot auto-install. In Safari:';
      renderModalSteps([
        'Tap the Share button (square with arrow)',
        'Scroll down and tap Add to Home Screen',
        'Tap Add to confirm',
      ]);
      return;
    }

    modalTitle.textContent = 'App install not ready';
    modalDesc.textContent =
      'Chrome has not made native app installation available yet. A shortcut is only a bookmark and will keep the browser bar.';
    renderModalSteps([
      'Open this page directly in Chrome or Edge, not an in-app browser',
      'Keep the page open briefly and interact with it so Chrome can finish checking the app',
      'Reload the page and use FloRo’s Install button when it appears',
      'Do not choose Create shortcut from Chrome’s menu',
    ]);
  }

  function closeHelpSheet() {
    modal?.classList.add('hidden');
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) return false;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        trackClarityEvent('sc_install_accepted');
        log?.('User installed FloRo Sign.', 'success');
      }
    } catch (err) {
      log?.(`Install prompt failed: ${err?.message || err}`, 'error');
      return false;
    }
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    closeHelpSheet();
    hideBanner();
    syncSettingsInstall();
    return true;
  }

  function capturePrompt(event) {
    event.preventDefault();
    deferredPrompt = event;
    window.__floroDeferredInstall = event;
    showBanner();
  }

  window.addEventListener('beforeinstallprompt', capturePrompt);

  if (shouldSuppressBanner()) {
    hideBanner();
  } else if (deferredPrompt) {
    showBanner();
  } else if (isIOS() || isAndroid()) {
    showBanner();
  } else {
    hideBanner();
  }
  syncSettingsInstall();

  window.addEventListener('appinstalled', () => {
    trackClarityEvent('sc_install_appinstalled');
    log?.('FloRo Sign installed.', 'success');
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    hideBanner();
    syncSettingsInstall();
  });

  btnInstall?.addEventListener('click', async () => {
    await triggerNativeInstall();
  });

  btnDismiss?.addEventListener('click', () => {
    try {
      localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      /* ignore storage failures */
    }
    trackClarityEvent('sc_install_dismissed');
    hideBanner();
    log?.('Install prompt dismissed. Use Settings > Install App anytime.', 'info');
  });

  settingsBtn?.addEventListener('click', async () => {
    if (await triggerNativeInstall()) return;
    openHelpSheet();
  });

  modalClose?.addEventListener('click', closeHelpSheet);
  modalAction?.addEventListener('click', () => {
    triggerNativeInstall();
  });
  modal?.querySelector('[data-close-install]')?.addEventListener('click', closeHelpSheet);
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) closeHelpSheet();
  });

}
