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
| `id` | `./` (resolves to the canonical scope in production and localhost in development) |
| `display` | `standalone` |
| `display_override` | `["standalone"]` |
| `launch_handler.client_mode` | `["navigate-existing", "auto"]` (array, not a string) |
| `icons` | `./icons/icon-192.png` (`any`), `./icons/icon-512.png` (`any` + `maskable`) |
| `theme_color` / `background_color` | `#020D0A` |
| `related_applications` | Self-reference used to detect an existing Android installation |

`prefer_related_applications` stays `false` so Chrome does not skip the install UI looking for a Play Store app.

## Service worker

`sw.js` registers with default scope (the directory of the script):

```js
navigator.serviceWorker.register('./sw.js');
```

Register immediately—the API is asynchronous and waiting for `window.load` can delay installability behind slow images or fonts. Use `updateViaCache: "none"` so a stale CDN header cannot pin an old worker. `skipWaiting` + `clientsClaim` remain. Precache the app shell including `js/pwa-install.js`. Bump `CACHE_NAME` whenever cached assets change.

Production (portfolio `vercel.json`): `/sign-controller/sw.js` must be `Cache-Control: no-cache` so clients are not stuck on a 4-hour cached worker. Optional `Service-Worker-Allowed: /sign-controller/`.

Navigations return the cached app shell immediately and refresh it in the background. Manifest requests are network-first. Worker updates bypass the HTTP cache.

## Install UI

Module: `js/pwa-install.js`. Early capture in `index.html` (before other scripts) stores `beforeinstallprompt` on `window.__floroDeferredInstall` so the event is not lost before the module loads.

| Situation | Banner | Install button | Click |
|-----------|--------|----------------|-------|
| `beforeinstallprompt` fired | Show | Show | `event.prompt()` only |
| Android, no event after 2.5s | Show (honest copy) | **Install help** | Chrome menu instructions |
| Android, PWA already installed | Show find-app copy | **Find app** | App-drawer instructions |
| iOS, not standalone | Show (Share → A2HS copy) | **Install help** | Share → Add to Home Screen instructions |
| Desktop, no event | Hidden | Hidden | Settings help sheet only |
| Already standalone | Hidden | Hidden | Settings install row hidden |

Dismiss **Not now** writes `localStorage` `floro_install_dismissed_v6` with a 7-day TTL. Settings → **Install App** ignores dismiss: native `prompt()` if held, otherwise the help sheet. A self-reference in `related_applications` lets supporting Chrome versions distinguish “prompt unavailable” from “already installed.” Android launchers may install into the app drawer without pinning a Home screen icon, so the installed help names both **FloRo Sign** and the old **FloRo** short name.

`preventDefault` on `beforeinstallprompt` is required to call `prompt()` later. The in-page **Install** button must call that event directly. If Chrome does not emit the event (for example, after a recent dismissal), the separately labeled **Install help** action may explain the manual menu route; it must never pretend to invoke native installation.

## Verification

```bash
node scripts/check-pwa.mjs
```

Manual: Chrome or Edge on Android, https://rawshn.com/sign-controller/, tap **Install** when it appears, confirm the native dialog, app opens without browser chrome.

## Document history

| Date | Change |
|------|--------|
| 2026-09-05 | Register SW immediately, detect existing installs, add honest manual fallback, and make cached launches fast |
| 2026-09-05 | Reimplemented to match Health Hub: native prompt only, static manifest, relative scope |
