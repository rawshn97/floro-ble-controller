# PWA install

**Parent index:** [`../SPEC.md`](../SPEC.md)  
**Code:** `manifest.webmanifest`, `sw.js`, `js/pwa-install.js`, `index.html`  
**Reference implementation:** Health Hub `PwaInstallPrompt.tsx` + `src/app/manifest.ts`

---

## What “install” means

On Chromium (Chrome / Edge, Android or desktop), a site is installable when it is HTTPS (or localhost), has a valid Web App Manifest, and a service worker with a `fetch` handler controls the page. The browser then fires `beforeinstallprompt`. Calling `event.prompt()` from a user gesture opens the **native** install dialog. That is the only automatic install path. There is no “install for me” API beyond that event.

iOS Safari never fires `beforeinstallprompt`. The only path is Share → Add to Home Screen.

Cursor’s embedded browser (Electron) also does not fire the event. Do not treat that as a product failure.

This app does **not** need a different stack (Next, Flutter, native) to install. Health Hub is Next + Serwist; FloRo is static files. Both can be PWAs on rawshn.com.

## Manifest

`manifest.webmanifest` is linked statically:

```html
<link rel="manifest" href="./manifest.webmanifest">
```

No `<base>` tag. Relative URLs resolve against the page URL (`/` locally, `/sign-controller/` in production).

| Field | Value |
|-------|--------|
| `name` / `short_name` | FloRo Sign Controller / FloRo Sign |
| `start_url` / `scope` | `./` |
| `id` | `https://rawshn.com/sign-controller/` (canonical production identity) |
| `display` | `standalone` |
| `display_override` | `["standalone"]` |
| `launch_handler.client_mode` | `["navigate-existing", "auto"]` (array, not a string) |
| `icons` | `./icons/icon-192.png` (`any`), `./icons/icon-512.png` (`any` + `maskable`) |
| `theme_color` / `background_color` | `#020D0A` |
`prefer_related_applications` stays `false` so Chrome does not skip the install UI looking for a Play Store app.

## Service worker

`sw.js` registers with default scope (the directory of the script):

```js
navigator.serviceWorker.register('./sw.js');
```

Register immediately—the API is asynchronous and waiting for `window.load` can delay installability behind slow images or fonts. Use `updateViaCache: "none"` so a stale CDN header cannot pin an old worker. `skipWaiting` + `clientsClaim` remain. Precache the app shell including `js/pwa-install.js` with `cache: "reload"` requests; otherwise a new cache version can be populated with old files from the browser’s HTTP cache. Bump `CACHE_NAME` whenever cached assets change.

Production (portfolio `vercel.json`): `/sign-controller/sw.js` must be `Cache-Control: no-cache` so clients are not stuck on a 4-hour cached worker. Optional `Service-Worker-Allowed: /sign-controller/`.

Navigations return the cached app shell immediately and refresh it in the background. Manifest requests are network-first. Worker updates bypass the HTTP cache.

## Install UI

Module: `js/pwa-install.js`. Early capture in `index.html` (before other scripts) stores `beforeinstallprompt` on `window.__floroDeferredInstall` so the event is not lost before the module loads.

| Situation | Banner | Install button | Click |
|-----------|--------|----------------|-------|
| `beforeinstallprompt` fired | Show | Show | `event.prompt()` only |
| Android, no native event | Show immediately (honest copy) | Hidden | Wait for native eligibility; never create a shortcut |
| iOS, not standalone | Show (Share → A2HS copy) | Hidden | Settings retains Share → Add to Home Screen help |
| Desktop, no event | Hidden | Hidden | Settings install row hidden |
| Already standalone | Hidden | Hidden | Settings install row hidden |

Dismiss **Not now** writes `localStorage` `floro_install_dismissed_v7` with a 7-day TTL. On Android and desktop, Settings → **Install App** is visible only while a native prompt is held. It never directs users into Chrome’s **Create shortcut** flow, which creates a browser bookmark instead of a standalone app. As in Health Hub, FloRo does not use `related_applications` or installed-app detection as part of installation.

`preventDefault` on `beforeinstallprompt` is required to call `prompt()` later. The in-page **Install** button must call that event directly. If Chrome does not emit the event, FloRo must not offer an Android install action. **Create shortcut** is not an installation and must never be presented as a fallback.

## Verification

```bash
node scripts/check-pwa.mjs
```

Manual: Chrome or Edge on Android, https://rawshn.com/sign-controller/, tap **Install** when it appears, confirm the native dialog, app opens without browser chrome.

## Document history

| Date | Change |
|------|--------|
| 2026-09-05 | Removed Android shortcut flow; only native `beforeinstallprompt` can expose Install |
| 2026-09-05 | Register SW immediately, detect existing installs, add honest manual fallback, and make cached launches fast |
| 2026-09-05 | Reimplemented to match Health Hub: native prompt only, static manifest, relative scope |
