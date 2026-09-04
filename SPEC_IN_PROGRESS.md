# Spec in progress

Add planned work here. Nothing in this file is implemented until promoted into `specs/`.

---

## PWA install: native prompt, not fake Chrome-menu instructions (2026-09-05)

**Status:** **SHIPPED 2026-09-05.** Canonical: [`specs/pwa.md`](specs/pwa.md).

### Symptom

Tapping **Install** on the FloRo banner opens a sheet that says to use Chrome ⋮ → **Install app**. Chrome does not show that menu item. Health Hub on the same origin installs with one tap.

This is **not** a stack problem. The app is already a static PWA (manifest + service worker + HTTPS). Rewriting in Next.js / Flutter is out of scope.

### Why Health Hub works and FloRo does not

Health Hub (`rawshns-health-hub`, `PwaInstallPrompt.tsx`):

- Listens for `beforeinstallprompt`, calls `preventDefault`, stores the event.
- Renders **Install** only when that event exists.
- Click calls `event.prompt()` (the only way to open Chrome’s install dialog from a page).
- If the event never fires: no fake Install button. iOS/Android copy explains the real path. Desktop stays quiet until Chrome offers install.

FloRo (`js/ui.js` `setupPwaInstall` on main before this change):

- Always unhides **Install**, including the Android 2.5s fallback when `deferredPrompt` is still null.
- Click with a null prompt opens the ⋮-menu sheet. That sheet is a lie when Chrome has not marked the site installable, and it is also a lie when `preventDefault` already hid **Install app** from the menu.
- Manifest `launch_handler.client_mode` is a string (`"navigate-existing"`). Health Hub uses an array (`["navigate-existing", "auto"]`).
- Manifest `id` is the path `/sign-controller/`. Health Hub uses the canonical absolute URL.
- Manifest `<link>` and `<base href>` are injected with JS. Health Hub emits a static manifest link. The `<base>` script also turns `/sign-controller/index.html` into a bogus base path.
- Production `sw.js` is served with `Cache-Control: max-age=14400`. Focus PWA on the same host uses `no-cache`.

Stale git branches (`cursor/floro-features-0da7` and friends) did **not** contain a better install path. Their `index.html` / `sw.js` are older and would regress the UI. They were closed unmerged; protocol docs were copied onto main separately.

### Goal

Match Health Hub’s install contract on this static app:

1. Chrome/Edge that fire `beforeinstallprompt`: banner **Install** → native dialog → installed standalone app.
2. No native event: do not show a button that pretends to install. Show honest copy (iOS A2HS; Chromium: wait for the browser install UI).
3. Settings → **Install App** still works: native `prompt()` when available, otherwise the help sheet.
4. Already-installed (`display-mode: standalone` or iOS `navigator.standalone`): hide banner and settings install row.
5. No framework change.

### Acceptance

- [ ] `index.html` has a static `<link rel="manifest" href="./manifest.webmanifest">`. No runtime `<base>` tag.
- [ ] Manifest `id` is `https://rawshn.com/sign-controller/`. `start_url` / `scope` / icon `src` are relative (`./`) so localhost and production both resolve.
- [ ] `launch_handler.client_mode` is an array, matching Health Hub.
- [ ] Install button is visible only when a `BeforeInstallPromptEvent` is held.
- [ ] Clicking that button calls `prompt()`; it never opens the ⋮-menu sheet as a substitute.
- [ ] Service worker still has a `fetch` handler; cache name bumped; `js/pwa-install.js` cached.
- [ ] Portfolio host sends `Cache-Control: no-cache` for `/sign-controller/sw.js`.
- [ ] `node scripts/check-pwa.mjs` enforces the contracts above.

### Out of scope

- Flash/Beat/sensitivity UI (protocol known, not product).
- iOS Safari one-tap install (Apple does not provide `beforeinstallprompt`).
- Making Cursor’s embedded browser fire `beforeinstallprompt` (Electron does not).
