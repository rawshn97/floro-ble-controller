/** Health Hub-style PWA install: native prompt() only when Chromium offers it. */

export const DISMISS_KEY = 'floro_install_dismissed_v5';
const DISMISS_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const ANDROID_FALLBACK_DELAY_MS = 2500;

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
    return 'Stay on this page in Chrome. When Chrome offers install, use that. A bookmark keeps the browser bar.';
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
  let androidFallbackTimer = null;

  function showBanner() {
    if (!bannerEl || shouldSuppressBanner()) return;
    bannerEl.classList.remove('hidden');
    bannerEl.setAttribute('aria-hidden', 'false');
    document.querySelector('.app-shell')?.classList.add('install-banner-visible');
    syncBanner();
  }

  function hideBanner() {
    bannerEl?.classList.add('hidden');
    bannerEl?.setAttribute('aria-hidden', 'true');
    document.querySelector('.app-shell')?.classList.remove('install-banner-visible');
  }

  function syncBanner() {
    const hasNativePrompt = Boolean(deferredPrompt);
    if (bannerTitle) bannerTitle.textContent = 'Install FloRo';
    if (bannerSubtitle) bannerSubtitle.textContent = installHelpText(hasNativePrompt);
    if (btnInstall) {
      btnInstall.textContent = 'Install';
      btnInstall.classList.toggle('hidden', !hasNativePrompt);
    }
    btnDismiss?.classList.remove('hidden');
  }

  function scheduleAndroidFallback() {
    if (shouldSuppressBanner() || !isAndroid() || deferredPrompt) return;
    androidFallbackTimer = window.setTimeout(() => {
      if (!deferredPrompt && !shouldSuppressBanner()) showBanner();
    }, ANDROID_FALLBACK_DELAY_MS);
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

    modalTitle.textContent = 'Install FloRo';
    modalDesc.textContent =
      'Chrome and Edge only show a one-tap install when this page qualifies as an app. Until then:';
    renderModalSteps([
      'Open https://rawshn.com/sign-controller/ in Chrome or Edge (not a WebView or in-app browser)',
      'Wait until the address bar or browser menu offers Install / Install app',
      'If you only see Add to Home screen, that is a bookmark, not the standalone app. Reload and try again after the service worker is active',
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
        log?.('User installed FloRo Controller app.', 'success');
      }
    } catch (err) {
      log?.(`Install prompt failed: ${err?.message || err}`, 'error');
      return false;
    }
    hideBanner();
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    closeHelpSheet();
    return true;
  }

  function capturePrompt(event) {
    event.preventDefault();
    deferredPrompt = event;
    window.__floroDeferredInstall = event;
    if (androidFallbackTimer) {
      window.clearTimeout(androidFallbackTimer);
      androidFallbackTimer = null;
    }
    showBanner();
  }

  window.addEventListener('beforeinstallprompt', capturePrompt);

  if (shouldSuppressBanner()) {
    hideBanner();
  } else if (deferredPrompt) {
    showBanner();
  } else if (isIOS()) {
    showBanner();
  } else {
    hideBanner();
    scheduleAndroidFallback();
  }

  window.addEventListener('appinstalled', () => {
    log?.('FloRo Controller installed.', 'success');
    hideBanner();
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    settingsBtn?.closest('.settings-section')?.classList.add('hidden');
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

  if (settingsBtn && isStandalone()) {
    settingsBtn.closest('.settings-section')?.classList.add('hidden');
  }
}
