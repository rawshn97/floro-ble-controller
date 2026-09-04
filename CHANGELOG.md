# Changelog

All notable changes to FloRo Sign Controller are documented here. Version numbers match `APP_VERSION` in `js/ui.js`. Bump `CACHE_NAME` in `sw.js` when static assets change so installed PWAs pick up updates.

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
