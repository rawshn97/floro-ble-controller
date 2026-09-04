/** Native PWA install with honest manual and already-installed fallbacks. */

export const DISMISS_KEY = 'floro_install_dismissed_v6';
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

async function detectInstalledPwa() {
  if (isStandalone()) return true;
  if (!('getInstalledRelatedApps' in navigator)) return false;

  try {
    const apps = await navigator.getInstalledRelatedApps();
    return apps.some((app) => app.platform === 'webapp');
  } catch {
    return false;
  }
}

function installHelpText(hasNativePrompt, installedPwa) {
  if (installedPwa) {
    return 'FloRo Sign is installed. Find it in your Android app drawer; Chrome may not add a Home screen icon.';
  }
  if (isIOS() && !hasNativePrompt) {
    return 'Open this page in Safari, tap Share, then Add to Home Screen.';
  }
  if (isAndroid() && !hasNativePrompt) {
    return 'Chrome has not offered one-tap install yet. You can still install from the Chrome menu.';
  }
  return 'Install FloRo so it opens full screen, not as a browser tab.';
}

export function setupPwaInstall({
  bannerEl,
  bannerTitle,
  bannerSubtitle,
  btnInstall,
  btnInstallHelp,
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
  let installedPwa = isStandalone();
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
    if (bannerTitle) {
      bannerTitle.textContent = installedPwa ? 'FloRo Sign is installed' : 'Install FloRo Sign';
    }
    if (bannerSubtitle) {
      bannerSubtitle.textContent = installHelpText(hasNativePrompt, installedPwa);
    }
    if (btnInstall) {
      btnInstall.textContent = 'Install';
      btnInstall.classList.toggle('hidden', !hasNativePrompt || installedPwa);
    }
    if (btnInstallHelp) {
      btnInstallHelp.textContent = installedPwa ? 'Find app' : 'Install help';
      btnInstallHelp.classList.toggle(
        'hidden',
        hasNativePrompt || (!installedPwa && !isAndroid() && !isIOS())
      );
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

    if (installedPwa) {
      modalTitle.textContent = 'Find FloRo Sign';
      modalDesc.textContent =
        'Android installs the app in your app drawer, but your launcher may not add it to the Home screen.';
      renderModalSteps([
        'Swipe up from your Home screen to open the app drawer',
        'Search for FloRo Sign (older installs may appear as FloRo)',
        'Long-press the app icon and drag it to your Home screen',
      ]);
      return;
    }

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

    modalTitle.textContent = 'Install FloRo Sign';
    modalDesc.textContent =
      'Chrome can delay or temporarily suppress its one-tap prompt. Manual installation is always available:';
    renderModalSteps([
      'Open this page directly in Chrome or Edge, not an in-app browser',
      'Tap the three-dot Chrome menu',
      'Tap Add to Home screen (or Install and create shortcut), then choose Install app',
      'After installation, swipe up and search your app drawer for FloRo Sign',
    ]);
  }

  function closeHelpSheet() {
    modal?.classList.add('hidden');
  }

  async function triggerNativeInstall() {
    if (!deferredPrompt) return false;
    let accepted = false;
    try {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        accepted = true;
        installedPwa = true;
        log?.('User installed FloRo Sign.', 'success');
      }
    } catch (err) {
      log?.(`Install prompt failed: ${err?.message || err}`, 'error');
      return false;
    }
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    closeHelpSheet();
    if (accepted) showBanner();
    else hideBanner();
    return true;
  }

  function capturePrompt(event) {
    event.preventDefault();
    deferredPrompt = event;
    installedPwa = false;
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
    installedPwa = true;
    log?.('FloRo Sign installed.', 'success');
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    showBanner();
  });

  btnInstall?.addEventListener('click', async () => {
    await triggerNativeInstall();
  });

  btnInstallHelp?.addEventListener('click', openHelpSheet);

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

  detectInstalledPwa().then((installed) => {
    if (!installed || isStandalone()) return;
    installedPwa = true;
    deferredPrompt = null;
    window.__floroDeferredInstall = null;
    if (androidFallbackTimer) {
      window.clearTimeout(androidFallbackTimer);
      androidFallbackTimer = null;
    }
    showBanner();
  });
}
