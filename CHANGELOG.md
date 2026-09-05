# Changelog

All notable changes to FloRo Remote are documented here. Version numbers match `APP_VERSION` in `js/ui.js`. Bump `CACHE_NAME` in `sw.js` when static assets change so installed PWAs pick up updates.

## [v68] - 2026-09-05

### Added
- Open source release under the MIT License (`LICENSE`)
- Added `CONTRIBUTING.md`, `SECURITY.md`, and `CODE_OF_CONDUCT.md`
- Camera-ready README badges and documentation polish
- Generic paths in reverse-engineering tooling and expanded `.gitignore`

### Changed
- Rebrand to FloRo Remote (`/floro-remote/`)
- Refactored `app.js` into focused ES modules (`app-context`, `connection`, `color-ui`, `mode-ui`, `scene-sync`)
- Added `docs/ble-protocol.schema.json` and `scripts/check-protocol.mjs`
- Removed dead code (gauge stubs, legacy CSS, unused helpers)

## [2.2.2] - 2026-09-05

### Fixed
- Match Health Hub's native installation contract: Android and desktop show **Install** only while Chromium supplies `beforeinstallprompt`, and clicking it calls `prompt()` directly.
- Remove the Android menu-help route that could lead users to **Create shortcut**, which is a Chrome bookmark and not a standalone PWA.
- Hide Settings > Install App when no native Chromium prompt exists; iOS guidance remains available.
- Remove the separate install-help control, self-referential `related_applications`, and installed-app detection for strict Health Hub parity.
- Restore the canonical production manifest ID used by Health Hub's identity pattern.

## [2.2.1] - 2026-09-05

### Fixed
- Register the service worker immediately instead of waiting for every font and image to load, and bypass stale CDN caches during worker updates.
- Add an honest manual-install path when Chrome withholds `beforeinstallprompt`, plus installed-app detection and app-drawer instructions for Android.
- Use the searchable Android app name **FloRo Sign** while preserving the same production manifest identity.
- Serve cached navigations immediately so installed launches do not wait on a poor network connection.
- Show Android install guidance without the old 2.5-second layout shift that delayed Largest Contentful Paint.
- Render the default disconnected state in the initial shell and align first-run Dynamic mode with the specified mode 32, avoiding startup layout and text shifts.
- Stop programmatic color restoration from firing a user-change callback that forced first-run and restored Dynamic scenes into Static mode 1.
- Force service-worker precache requests to bypass Chrome's HTTP cache, preventing a new cache version from silently reinstalling stale JavaScript.

### Performance
- Replace the 3.7 MB Material Symbols font with a 6 KB subset containing only the 16 icons used by FloRo.
- Remove render-blocking third-party Google Font requests; Android continues to use its native Roboto font.
- Reuse the 192 px app icon in the install banner instead of downloading and precaching a duplicate 53 KB logo.

## [2.2.0] - 2026-09-05

### Fixed
- PWA **Install** now opens Chrome/Edge's native install dialog when the browser offers one. It no longer shows a fake "use the ⋮ menu" sheet that Chrome will not display after `preventDefault`.
- Manifest `launch_handler.client_mode` is an array; `id` is the canonical `https://rawshn.com/sign-controller/`; `start_url` / `scope` / icons are relative `./` paths.
- Removed the runtime `<base>` tag and JS-injected manifest link (both broke installability).

### Added
- `js/pwa-install.js` (Health Hub-style prompt). Specs under `SPEC.md` / `specs/`.
- `scripts/check-pwa.mjs` CI contract for the install path.

## [2.1.0] - 2026-06-29

### Added
- Main-screen **Scan & Connect** prompt when offline (no need to open Settings first)
- Friendly BLE error messages with cause and next step (`js/errors.js`)
- `CHANGELOG.md`, GitHub bug report template, and CI workflow
- Status chip shows **Tap to connect** whenever offline

### Changed
- README: single golden path for local dev and portfolio deploy
- Docs: `manifest.webmanifest` filename corrected in README and DESIGN.md

## [2.0.0] - 2026-06

### Added
- Remote dock UI redesign with bottom thumb-zone controls
- Scene restore on connect (brightness, speed, color, animation mode)
- Floating PWA install prompt with platform-specific steps
- 200 curated animation mode names and searchable mode picker
- Color presets, favorites, wake lock, auto-reconnect

### Fixed
- Mobile remote dock layout and scroll (QA ISSUE-001)
- Offline panel interaction before BLE connect (QA ISSUE-002)
- Compact install banner on short viewports (QA ISSUE-003)
- Power button visibility and service worker cache bumps (QA ISSUE-004)

## [1.x] - Earlier

Initial PWA BLE controller with solid color control, basic animation modes, and Vercel deploy config.
