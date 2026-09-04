#!/usr/bin/env node
/**
 * Contracts for the installable PWA. Fail CI if the native install path,
 * honest fallback, manifest, or startup performance regresses.
 */
import { readFileSync, existsSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const fail = (msg) => {
  console.error(`check-pwa: ${msg}`);
  process.exitCode = 1;
};

const html = readFileSync(join(root, 'index.html'), 'utf8');
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const manifestRaw = readFileSync(join(root, 'manifest.webmanifest'), 'utf8');

if (html.includes("createElement('base')") || html.includes('createElement("base")')) {
  fail('index.html must not inject a <base> tag (breaks manifest and SW URLs)');
}

if (!html.includes('rel="manifest"') || !html.includes('./manifest.webmanifest')) {
  fail('index.html needs a static <link rel="manifest" href="./manifest.webmanifest">');
}

const appJs = readFileSync(join(root, 'js/app.js'), 'utf8');
if (!appJs.includes('./pwa-install.js')) {
  fail('js/app.js must import ./pwa-install.js');
}

if (html.includes('__FLORO_PWA_BASE')) {
  fail('remove __FLORO_PWA_BASE; use relative ./ URLs');
}

if (!html.includes('beforeinstallprompt')) {
  fail('index.html must capture beforeinstallprompt early');
}

if (!html.includes('id="btn-install"') || !html.includes('install-banner-action-primary hidden')) {
  fail('Install button must start hidden until a native prompt exists');
}
if (!html.includes('id="btn-install-help"')) {
  fail('Android needs an honest manual-install fallback when Chrome withholds prompt()');
}
if (!html.includes("updateViaCache: 'none'")) {
  fail('service worker registration must bypass stale HTTP caches');
}
if (html.includes("window.addEventListener('load'") && html.includes('serviceWorker.register')) {
  fail('service worker registration must not wait for slow page assets to finish loading');
}
if (html.includes('fonts.googleapis.com') || html.includes('fonts.gstatic.com')) {
  fail('startup must not depend on third-party web fonts');
}

let manifest;
try {
  manifest = JSON.parse(manifestRaw);
} catch (err) {
  fail(`manifest.webmanifest is not JSON: ${err.message}`);
}

if (manifest) {
  if (manifest.start_url !== './' || manifest.scope !== './') {
    fail('manifest start_url and scope must be "./" (portable across localhost and /sign-controller/)');
  }
  if (manifest.id !== './') {
    fail('manifest id must be "./" so it resolves consistently on production and localhost');
  }
  if (manifest.display !== 'standalone') {
    fail('manifest display must be standalone');
  }
  const modes = manifest.launch_handler?.client_mode;
  if (!Array.isArray(modes) || !modes.includes('navigate-existing')) {
    fail('launch_handler.client_mode must be an array including navigate-existing');
  }
  const icons = manifest.icons || [];
  for (const icon of icons) {
    if (!icon.src?.startsWith('./icons/')) {
      fail(`icon src must be relative under ./icons/: ${icon.src}`);
    }
    const file = join(root, icon.src.replace(/^\.\//, ''));
    if (!existsSync(file)) fail(`missing icon file: ${icon.src}`);
  }
  if (!icons.some((i) => i.sizes === '192x192') || !icons.some((i) => i.sizes === '512x512')) {
    fail('manifest needs 192x192 and 512x512 icons');
  }
  if (!manifest.related_applications?.some(
    (app) => app.platform === 'webapp' && app.url === './manifest.webmanifest'
  )) {
    fail('manifest must self-reference so Android can detect an existing installation');
  }
}

if (!/const CACHE_NAME = 'floro-controller-v\d+'/.test(sw)) {
  fail('sw.js must define CACHE_NAME = floro-controller-vN');
}
if (!sw.includes('./js/pwa-install.js')) {
  fail('sw.js must precache ./js/pwa-install.js');
}
if (!sw.includes("addEventListener('fetch'") && !sw.includes('addEventListener("fetch"')) {
  fail('sw.js must have a fetch handler (Chrome installability)');
}
if (!sw.includes("event.request.mode === 'navigate'") || !sw.includes("caches.match('./index.html')")) {
  fail('service worker must serve cached navigation immediately for fast installed-app launch');
}

const symbolsFont = join(root, 'fonts/MaterialSymbolsOutlined.woff2');
if (!existsSync(symbolsFont)) {
  fail('missing self-hosted Material Symbols font');
} else if (statSync(symbolsFont).size > 50_000) {
  fail('Material Symbols font must stay subset below 50 KB');
}

if (existsSync(join(root, 'manifest.json'))) {
  fail('do not ship manifest.json; use manifest.webmanifest');
}

const pwaSrc = readFileSync(join(root, 'js/pwa-install.js'), 'utf8');
const nativeInstallHandler = pwaSrc.match(
  /btnInstall\?\.addEventListener\('click',[\s\S]*?\n  \}\);/
)?.[0] || '';
if (!nativeInstallHandler.includes('triggerNativeInstall') ||
    nativeInstallHandler.includes('openHelpSheet')) {
  fail('Install button click must call prompt() only; do not open the help sheet');
}
if (!pwaSrc.includes("btnInstall.classList.toggle('hidden', !hasNativePrompt || installedPwa)")) {
  fail('Install button visibility must follow hasNativePrompt');
}

if (!process.exitCode) {
  console.log('check-pwa: ok');
}
