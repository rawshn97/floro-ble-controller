# UI Overhaul Plan: Mint Remote Aesthetic

Status: **All plan reviews complete** (2026-06-29); implementing Mint Remote UI  
Target: FloRo Sign Controller PWA (`floro-ble-controller`)  
Reference: Attached AC remote mockups (Sofia Sans, mint accent, arc gauge, card grid)

## Executive Summary

Replace the current iOS 16 grouped-dark + FloRo pink skin with a **mint remote** visual system: deep black-green canvas, charcoal cards, Sofia Sans typography, circular arc hero gauge, vertical mode rail, and a full-width mint power CTA. **No BLE protocol, state, or PWA routing changes** in this pass. All existing IDs, event hooks, and `js/app.js` logic stay wired; we reshape markup and CSS (minimal JS for gauge rendering).

North star preserved: **the UI glows the color on the sign** via `updateNeonThemeColor()`. Default chrome accent becomes mint (`#41E9BD`); when the user picks a neon color, accent tokens retint to match.

**Feature parity:** This plan is visual/IA only. Every row in [Feature Parity Matrix](#feature-parity-matrix) must ship unchanged in behavior. Devex review should treat that section as the acceptance contract.

## Feature Parity Matrix

Complete inventory of shipped features (v2.1.0) and where they live in the mint remote layout. **Behavior, storage keys, BLE commands, and JS hooks must not regress.**

### Connection and status

| Feature | Current UI | Mint remote placement | Hooks / IDs | Must preserve |
|---------|------------|----------------------|-------------|---------------|
| Scan & Connect (settings) | Settings > Connection | Same sheet | `#btn-connect` | Opens BLE picker; `connectDevice()` |
| Scan & Connect (main) | `#connect-prompt` | Connect strip (offline) | `#btn-connect-main` | Same handler as settings connect |
| Reconnect last device (settings) | Settings when `ble.canReconnect()` | Same sheet | `#btn-reconnect` | Dynamic label `Reconnect to {name}` |
| Reconnect (main) | `#connect-prompt` | Connect strip | `#btn-reconnect-main` | Same as settings reconnect |
| Auto-reconnect on load | Silent on startup | No UI change | `tryAutoReconnect()` | Runs when last device in `floro_last_device` |
| Disconnect | Settings destructive btn | Same sheet | `#btn-disconnect` | `disconnectDevice()`; releases wake lock |
| Status chip | Header center | Header (circular or pill) | `#status-chip`, `#status-chip-text` | States: offline, connecting, connected, error; offline/error copy **"Tap to connect"** (JS); connected truncates name at 14 chars |
| Status chip → settings | Tap chip | Same | `statusChip` click | Opens `#settings-sheet` |
| Settings menu | Header vertical dots | Same icon, restyled | `#btn-menu` | Same sheet as chip; not a gear icon in shipped HTML |
| Device name + pill | Settings connection row | Same | `#device-name`, `#connection-status` | CONNECTED/OFFLINE pill classes |
| Web Bluetooth unsupported | `#compat-banner` | Top of main (above hero) | `#compat-banner` | `setupCompatBanner()`; never hidden by restyle |
| Connect prompt visibility | Between `.app-main` and `#remote-dock` | **Dock-adjacent** connect strip (same DOM order) | `#connect-prompt` | Hidden when connected, connecting, or BLE unsupported; thumb-reachable offline |
| Activity log | Settings only | Same sheet, scrollable | `#console-body` | Color-coded info/success/error/write entries |
| About + version | Settings footer | Same | `#app-version` | Shows `APP_VERSION` (2.1.0) |

### Power and control gating

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Power toggle | Toolbar `#power-btn` (44px, dock top row) | Bottom mint `#power-btn` CTA **or** CTA + compact toolbar indicator (see amendments) | `setPowerState()`; `aria-pressed`; `is-on` uses **system-green** today; `is-unavailable` when disconnected |
| Power when disconnected | Dimmed, logs hint | Same | Click logs "Connect before power"; heavy haptic |
| Power off | Sends brightness 0 | Same | `#val-brightness*` show `OFF`; `disabled-control` on panels |
| Power on restore | Sends full scene | Same | **`alignUIForPowerOnRestore()`** switches to **Animation** tab + last animation mode |
| Panel enable on connect | All control cards | Same | `enablePanels(true)` removes disconnect lock |
| Controls locked when off | 45% opacity | Same | `syncControlPanelsEnabled()`; child buttons keep pointer-events (existing CSS quirk) |

### Display mode (Solid vs Animation)

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Solid tab | Horizontal seg | Vertical mode rail | `#mode-seg-solid`; `role="tab"` |
| Animation tab | Horizontal seg | Vertical mode rail | `#mode-seg-animation` |
| View transition | 280ms slide | Crossfade gauge label (optional slide) | `setDisplayView()`; `#solid-view`, `#animation-view` |
| Solid forces mode 1 | Tab click | Rail click | Sends mode 1 via BLE when coming from animation |
| Animation restores last mode | Tab click | Rail click | Uses `lastAnimationMode` when leaving solid (mode 1) |
| Panel swap | `#solid-controls` / `#anim-controls` | Same IDs, card grid inside | `syncRemotePanels()` toggles `.hidden` |
| Preview swatch (solid) | `#solid-view` stage | **Gauge center** fill | `#solid-preview-swatch`; `updatePreviewChrome()` |
| Preview mode name (anim) | `#animation-view` stage | **Gauge center** label | `#anim-preview-name` |

### Solid mode controls

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Brightness slider 1–8 | `#slider-brightness` + steppers | Brightness control card | Synced with anim slider; debounced BLE `B=n` |
| Brightness steppers | `data-step-brightness` ± | Inside brightness card | `bindStepperButtons()` |
| Live brightness label | `#val-brightness` | Card header + gauge | Format `8 / 8` or `OFF` |
| 8 preset swatches | 4×2 grid in `#color-panel` | Color card grid | `onclick="selectSwatch(...)"`; `.selected` ring |
| Custom color | `#palette-toggle` → sheet | Quick action **or** secondary row btn | `#palette-sheet`, `#custom-color-picker` |
| HSL picker widget | Sheet body | Same sheet (restyle only) | 2D pick, hue strip, HSL sliders, hex input, keyboard on 2D |
| Recent colors | Inside picker | Same | `floro_recent_colors` (max 8) |
| Live color while dragging | Picker + swatches | Same | 120ms debounce; `prepareSolidModeForColorPick()` |
| Color commits | Picker done / swatch | Same | `applyColorSelection()`; switches anim→solid + full scene |
| Dynamic theme tint | Accent on dock/cards | Arc + cards + CTA | `updateNeonThemeColor(hex, themePanels)` on `themePanels` |
| Save color preset | `#btn-save-color-preset` | Secondary row | Opens `#color-preset-modal`; max 12 presets |
| Saved color presets | `#color-presets-row` flex-wrap pill chips | Same layout (restyle only) | Tap apply; × remove; duplicate hex blocked; not a 3-col grid |
| Color preset storage | localStorage | Unchanged | `floro_color_presets` |

### Animation mode controls

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Brightness (anim tab) | `#slider-brightness-anim` | Brightness card (anim panel) | Same `onBrightnessInput` handler |
| Speed 0–100% | `#slider-speed` + steppers | Speed control card | BLE inverted mapping in protocol; `#val-speed` as `%` |
| Speed steppers | `data-step-speed` ± | Inside speed card | `stepSpeed()` |
| Mode hero row | `#anim-mode-picker-btn` | **Mode card** (tappable) | Opens `#mode-picker-sheet` |
| Mode number/name/meta | `#anim-mode-hero-*` | Mode card + gauge | `updateModeHero()` |
| Mode stepper ± | Row with `#anim-stepper-readout` | Mode card or dedicated stepper card | `window.stepMode(±1)`; wraps 1–200 |
| Mode picker sheet | Bottom sheet | Same (restyle) | Search `#mode-search-sheet`; list `#mode-list-sheet` |
| Search modes | By name or number | Same | `renderModeList()`; empty state message |
| 200 animation modes | Full list | Same | `mode-names.js`; mode 1 = Solid Color |
| Hidden a11y fallback | `#anim-dropdown`, `#mode-search`, `#mode-list` | Keep in DOM `.visually-hidden` | Required for `filterAnimationOptions` |
| Quick presets (favorites) | `#favorites-grid.favorites-grid-remote` horizontal scroll | Same horizontal scroll row (restyle chips) | Default modes 32,34,35,38 on fresh install only; not a 3-col grid |
| Mode stepper readout | `#anim-stepper-readout` in stepper row | Mode card (visible) | Fix `aria-hidden="true"` during build; keep `stepMode` row |
| Add favorite | `#animation-panel` Add btn | Quick action **or** card header | `addCurrentToFavorites()` → `#favorite-modal` |
| Remove favorite | × on chip | Same on grid chip | Does not respawn deleted defaults |
| Favorite storage | localStorage | Unchanged | `floro_favorites` |
| Favorite modal | Prefilled mode name | Same sheet | `openFavoriteModal(mode)` |

### Scene persistence and BLE sync

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Scene snapshot | Background | Unchanged | `floro_scene_state`: view, power, brightness, speed, color, modes |
| Save on change | Debounced 150ms | Unchanged | `scheduleSceneSave` / `flushSceneSave` on pagehide |
| Restore on load | `applySavedSceneToUI()` | Unchanged | Tab, sliders, color, mode, theme |
| Restore on connect | `onConnected()` → `restoreSceneToSign()` | Unchanged | Animation tab if powered on |
| sendScene ordering | ble.js | Unchanged | B, S, C, wait 250ms, M last |
| Scene generation bump | On mode/color change | Unchanged | Prevents stale mode writes |
| Wake lock | While connected | Unchanged | `WakeLockManager` |
| Haptics | Various taps | Unchanged | light 15ms; power off heavy 50ms |

### PWA and install

| Feature | Current UI | Mint remote placement | Must preserve |
|---------|------------|----------------------|---------------|
| Install banner | Fixed overlay **outside** `.app-shell` (`z-index: 70`) | Same fixed overlay behavior | Android 2.5s fallback; iOS always until standalone; document z-index vs power CTA |
| Not now dismiss | Banner button | Same | `floro_install_dismissed_v4` 7-day TTL |
| Install from settings | List row | Same sheet | `#btn-settings-install`; native or modal fallback |
| Install modal | Platform steps | Same (restyle) | iOS / Android / generic step lists |
| Standalone hide | Banner + settings row | Same | `matchMedia(display-mode: standalone)` |
| Service worker | Head script | Unchanged | `__FLORO_PWA_BASE` scope |
| Manifest paths | `/sign-controller/` | Unchanged | Only `theme_color` / `background_color` update |
| Deferred install prompt | `__floroDeferredInstall` | Unchanged | Head inline script |

### Global JS APIs (do not break)

| API | Used by |
|-----|---------|
| `window.selectSwatch(btn, r, g, b)` | Inline swatch onclick |
| `window.stepMode(delta)` | Mode stepper buttons |
| `window.addCurrentToFavorites()` | Add preset button |
| `window.setPowerState(on)` | Power handler (internal) |
| `window.openSettingsSheet()` | Status chip |
| `window.openModePickerSheet()` | Optional quick action |
| `window.openColorPresetModal(name)` | Save preset flow |
| `window.openFavoriteModal(mode)` | Add favorite flow |
| `window.__floroModeNames` | ui.js filter + list render |

### Mint layout: Solid vs Animation card visibility

| Zone | Solid tab (`#solid-controls`) | Animation tab (`#anim-controls`) |
|------|------------------------------|----------------------------------|
| Gauge center | Swatch + brightness arc | Mode # + name; arc = speed % |
| Brightness card | Visible | Visible (`#slider-brightness-anim`) |
| Speed card | Hidden | Visible |
| Color swatch card | Visible (`#color-panel`) | Hidden |
| Mode hero + stepper | Hidden | Visible (`#animation-panel`) |
| Presets | `#color-presets-row` (flex-wrap pills) | `#favorites-grid` (horizontal scroll) |
| Secondary row | Custom color + Save preset | Custom color hidden; Add via quick action or panel header |

### Quick actions row (maps reference mockup squares)

| Slot | Action | Wires to |
|------|--------|----------|
| 1 | Custom color | `#palette-toggle.click()` or open `#palette-sheet` |
| 2 | Animation modes | `#anim-mode-picker-btn.click()` (anim tab) or disabled/hidden on solid |
| 3 | Add favorite | `addCurrentToFavorites()` (anim tab only) |
| 4 | Connection / settings | `#status-chip` or `#btn-menu` |

### Behavioral invariants (non-negotiable)

1. Picking a swatch or custom color while in Animation mode switches to Solid, sets mode 1, sends full scene.
2. Power on after connect restores **Animation** tab with saved animation mode (not Solid), matching sign output.
3. Empty `floro_favorites` array stays empty (defaults only seed when key is absent, not `[]`).
4. Only one sheet open at a time; Escape closes top sheet; body `sheet-open` scroll lock.
5. `#remote-dock`, `#power-strip`, and control panels remain in `themePanels` for dynamic accent propagation.
6. Short viewports: gauge may shrink; **do not** hide primary controls entirely (old `@media` hid `.remote-view-stage`; new layout keeps gauge compact instead).
7. **`#remote-dock` stays the primary thumb-zone surface** on phones; hero/gauge is secondary readout, not a replacement for dock controls.
8. **Arc gauge is readout only**; brightness/speed manipulation stays on `#slider-*` + steppers (no arc-only control path).

## Existing UX Review (pre-build)

Review date: 2026-06-29. Shipped UX audited in `index.html`, `css/styles.css`, `js/app.js`, `js/ui.js`, `js/color-picker.js`.

**What works today (keep):** Bottom-first `#remote-dock` thumb zone; mode-first Solid|Animation panel swap; dual connect (main strip + settings); status chip opens settings; bottom sheets for palette and mode list; slider + 44px steppers; horizontal animation favorites; live HSL color with 120ms BLE debounce; dynamic accent via `themePanels`; auto-reconnect; power-on restores Animation tab.

**Shipped layout order:** header → main (compat + preview stage) → `#connect-prompt` → `#remote-dock`. Install banner is a **fixed overlay outside the shell**, not a flex child. On viewports ≤850px tall, `.remote-view-stage` is hidden entirely; phone UX is dock-only today.

**Regression risks for mint layout:** Stacking hero + cards + bottom power CTA + fixed install banner may exceed viewport height; vertical mode rail may squeeze the 4×2 swatch grid; moving power from dock toolbar to bottom-only CTA hides power while scrolling card panels unless a compact indicator remains.

**Screen flows validated:** Offline shows "Tap to connect" on chip + connect strip above dock. Connected Solid: brightness, swatches, palette sheet, color presets. Connected Animation: dual sliders (stack ≤850px), mode hero + picker sheet, stepper row, horizontal favorites. Settings: connection, 160px activity log, install, about.

**Parity matrix corrections applied above:** install overlay placement, preset layout types, status chip copy, menu icon, power green `is-on` state, `#anim-stepper-readout`, dock-adjacent connect strip.

## Plan amendments from UX review

1. **Preserve bottom-weighted layout on phones.** `#remote-dock` remains the primary control surface; gauge compacts on short viewports instead of hiding controls.
2. **Install banner: keep fixed overlay.** Do not move `#install-banner` into `.app-shell` without a z-index plan (overlay z-70 vs power CTA vs connect strip).
3. **Preset layouts are mode-specific.** Animation favorites = horizontal scroll; solid color presets = flex-wrap pills. No forced 3-col grid for both.
4. **Power CTA + visibility while scrolling.** Prefer bottom mint `#power-btn` **and** a compact power/state indicator in the dock toolbar until scroll-position QA passes with bottom-only CTA.
5. **Connect strip stays dock-adjacent.** `#connect-prompt` remains immediately above `#remote-dock`, not buried under the hero zone.
6. **Gauge supplements sliders.** Arc reflects `#val-brightness` / mode hero values; sliders + steppers remain primary manipulators.
7. **Build fixes:** Remove `aria-hidden` from `#anim-stepper-readout`; fix CSS orphan block at `styles.css` L1077-1087 in Phase 1.
8. **Phase 3 acceptance:** On 390×740, brightness slider, mode rail/seg, power, and first swatch row reachable without scrolling the main document.
9. **Custom color:** Bottom sheet only (`#palette-sheet`); no inline palette on the main surface (DESIGN.md disclosure prose is stale).

## Reference to Product Mapping

| Reference (AC remote) | FloRo equivalent | Notes |
|----------------------|------------------|-------|
| Temperature arc gauge (24°C) | **Scene arc gauge** | Solid: brightness 1-8 on arc + color fill in center. Animation: mode number + name, arc = speed % |
| Indoor temp sublabel | Secondary readout | Solid: hex or color name. Animation: "Mode N of 200" |
| Vertical mode pills (Cool/Heat/…) | **Solid \| Animation** rail | Left column, mint fill when active, icon + label |
| Quick action squares (swing, turbo) | **Quick actions row** | Custom color, mode picker shortcut, add favorite, connect status |
| Brand list grid | **Preset chips** | Animation: horizontal fav row; Solid: flex-wrap color preset pills |
| Wind Speed / Cooling cards | **Control cards** | Brightness card, Speed card (anim only), Color/Mode card |
| Vertical temp stepper | **Existing stepper rows** | Keep `#anim-stepper-readout` + `stepMode`; sliders primary |
| Air Flow row | **Optional strip** | Defer to v2 or map to speed preset chips |
| Power On pill (bottom) | **Power CTA** | Mint pill at bottom; consider compact dock indicator while scrolling |
| Header title + settings | FloRo + dots menu | Keep logo, status chip, `#btn-menu` (vertical dots) |
| Teal radial top gradient | **Ambient background** | `radial-gradient` from `#082c26` at top to `#020D0A` |

## Design Tokens (canonical)

Load Sofia Sans from Google Fonts. Define in `:root` (replace current iOS tokens).

| Token | Value | Role |
|-------|-------|------|
| `--bg-deep` | `#020D0A` | Page background |
| `--bg-surface` | `#1D1F21` | Cards, rails |
| `--bg-elevated` | `#252829` | Active pill inactive hover |
| `--accent` | `#41E9BD` | Primary CTA, arc, active mode (default) |
| `--accent-dim` | `rgba(65, 233, 189, 0.18)` | Glow, selected fills |
| `--accent-glow` | `rgba(65, 233, 189, 0.45)` | Box-shadow on active |
| `--text-primary` | `#DBE6E4` | Headings, values |
| `--text-secondary` | `rgba(219, 230, 228, 0.62)` | Labels |
| `--text-muted` | `rgba(219, 230, 228, 0.38)` | Meta, placeholders |
| `--danger` | `#FF6B6B` | Offline, destructive |
| `--success` | `#41E9BD` | Connected (reuse accent) |
| `--warning` | `#FFB020` | Connecting pulse |
| `--radius-card` | `24px` | Cards, sheets |
| `--radius-pill` | `999px` | Mode rail, power CTA |
| `--radius-control` | `16px` | Swatches, inputs |
| `--font-display` | `'Sofia Sans', system-ui, sans-serif` | All UI |
| `--gauge-size` | `min(72vw, 280px)` | Hero ring |

Dynamic accent: keep `updateNeonThemeColor()` mapping to `--accent`, `--accent-dim`, `--accent-glow`, card borders.

## Information Architecture (new layout)

```
┌──────────────────────────────────────────────┐
│  [logo] FloRo          [status]  [settings]  │  header ~52px
├──────────────────────────────────────────────┤
│  ░ radial glow background ░                  │
│  ┌────┐   ╭──────────────╮                   │
│  │Sol │   │  ARC GAUGE   │  readout only     │
│  │id ●│   │  (compact ≤850px)               │
│  │Anim│   ╰──────────────╯                   │
│  └────┘   [quick action chips x4]            │
├──────────────────────────────────────────────┤
│  CONNECT STRIP (offline, dock-adjacent)      │
├──────────────────────────────────────────────┤
│  #remote-dock (PRIMARY thumb zone)           │
│  [Solid|Anim] [power]  toolbar row           │
│  ┌─────────┐ ┌─────────┐                     │
│  │Brightness│ │ Color / │  cards + sliders   │
│  │  card   │ │  Mode   │                     │
│  └─────────┘ └─────────┘                     │
│  fav row (h-scroll) OR color preset pills    │
│  [ Custom color ]     [ Save preset ]        │
├──────────────────────────────────────────────┤
│  ╭══════════════════════════════════════╮    │
│  │  Power On / Off (mint CTA)           │    │  optional; see amendments
│  ╰══════════════════════════════════════╯    │
└──────────────────────────────────────────────┘

  (fixed overlay, outside shell)
│  Install banner (#install-banner)            │
```

Cards and sliders live **inside `#remote-dock`**, matching today's bottom-first pattern. Hero gauge sits in `.app-main` above the connect strip.

Sheets unchanged in behavior: settings, mode picker, palette, favorites, install modals.

## File Change Matrix

| File | Scope | Risk |
|------|-------|------|
| `index.html` | Restructure main shell: hero zone, mode rail, card grid, bottom power CTA. **Preserve all element IDs** used by `app.js` or add aliases. | Medium |
| `css/styles.css` | Full token swap + new layout classes. Remove iOS seg/slider styling; add gauge, rail, card grid, mint CTA. Fix broken rule at ~L1077 (orphan block). | Medium |
| `js/ui.js` | Add `updateArcGauge({ value, max, label, sublabel, color })`. Extend `updateNeonThemeColor` for new CSS vars. Optional: `renderModeRail()`. | Low |
| `js/app.js` | Call gauge updater on brightness/mode/color/power changes. Wire quick-action buttons. No protocol changes. | Low |
| `js/color-picker.js` | Token class names only if picker markup changes. | Low |
| `index.html` `<head>` | Add Sofia Sans `<link>`, `theme-color` → `#020D0A` | Trivial |
| `manifest.webmanifest` | `theme_color` / `background_color` → `#020D0A` | Trivial |
| `DESIGN.md` | Replace visual system section (done in this PR) | Doc |
| `sw.js` | Bump cache version after CSS/HTML ship | Trivial |

**Out of scope:** `ble.js`, `protocol.js`, `state.js`, `errors.js`, `mode-names.js`, Vercel config, CI.

## ID Preservation Checklist

These IDs must remain in the DOM so `app.js` / `ui.js` keep working without a logic rewrite:

**Connection / shell:** `compat-banner`, `connect-prompt`, `btn-connect-main`, `btn-reconnect-main`, `status-chip`, `status-chip-text`, `btn-menu`, `remote-dock`, `power-strip`, `power-btn`, `install-banner` (+ title, subtitle, `btn-install`, `btn-dismiss-install`).

**Views:** `solid-view`, `animation-view`, `solid-preview-swatch`, `anim-preview-name`, `mode-seg-solid`, `mode-seg-animation`.

**Solid:** `solid-controls`, `color-panel`, `slider-brightness`, `val-brightness`, `palette-toggle`, `btn-save-color-preset`, `color-presets-row`, all `.swatch-btn` with existing `onclick`.

**Animation:** `anim-controls`, `animation-panel`, `slider-brightness-anim`, `val-brightness-anim`, `slider-speed`, `val-speed`, `anim-mode-picker-btn`, `anim-mode-hero-num`, `anim-mode-hero-name`, `anim-mode-hero-meta`, `anim-stepper-readout`, `favorites-grid`, `anim-dropdown`, `mode-search`, `mode-list` (hidden a11y).

**Sheets / modals:** `settings-sheet` (+ `btn-connect`, `btn-reconnect`, `btn-disconnect`, `device-name`, `connection-status`, `console-body`, `btn-settings-install`, `btn-close-settings`, `app-version`), `palette-sheet` (+ `custom-color-picker`, `btn-close-palette`), `mode-picker-sheet` (+ `mode-search-sheet`, `mode-list-sheet`, `btn-close-mode-picker`), `favorite-modal`, `color-preset-modal`, `install-modal` (+ all install modal child IDs).

**New (additive only):** `scene-gauge`, `scene-gauge-arc`, `scene-gauge-value`, `scene-gauge-sub` (gauge can use these without breaking old preview IDs).

**Layout strategy:** Keep `#remote-dock` as the control container but restyle internally. Move `#power-btn` visually to bottom CTA via CSS grid order or duplicate button with shared handler (prefer single node + grid placement).

## Implementation Phases

### Phase 1: Foundation (CSS tokens + typography)
- Add Google Fonts link for Sofia Sans (400, 500, 600, 700).
- Replace `:root` tokens; ambient background gradient on `.app-shell`.
- **Fix CSS orphan block** at `styles.css` L1077-1087 (invalid rules without selector).
- Global type scale: hero 48px/700, card title 15px/600, body 17px/400.
- **Acceptance:** Page renders with new colors/fonts; layout still old; CSS parses cleanly.

### Phase 2: Shell + header
- Restyle header: circular back N/A, centered title optional, circular settings/status buttons with mint ring on connected.
- **Acceptance:** Header matches reference; settings sheet still opens.

### Phase 3: Hero gauge + mode rail
- Add SVG arc component (static HTML + CSS variables for dash offset).
- New `.mode-rail` wrapping existing seg buttons OR restyle `.seg-control` as vertical pills.
- **Keep** `#solid-preview-swatch` and `#anim-preview-name` inside gauge center (do not remove; `updatePreviewChrome()` depends on them).
- Wire quick-actions row to palette, mode picker, add favorite, settings (see Feature Parity Matrix).
- JS: `updateArcGauge()` mirrors `#val-brightness` / mode hero (readout only).
- **Acceptance:** Gauge updates live; on 390×740, dock controls reachable without main-document scroll; preview swatch still updates on color change.

### Phase 4: Control card grid
- Wrap slider blocks in `.control-card` with icons (brightness sun, speed wind, color droplet, mode sparkles).
- **Animation panel:** preserve `#anim-mode-picker-btn`, stepper row (`stepMode`), and `#anim-stepper-readout` inside mode card.
- Restyle sliders: thin track, mint fill, circular thumb with glow; keep `data-step-brightness` / `data-step-speed` buttons.
- Swatch grid: 4-col rounded squares inside color card; preserve all eight `selectSwatch` inline handlers.
- **Acceptance:** All sliders/swatch taps still send BLE commands; mode stepper wraps 1–200; hero opens picker sheet.

### Phase 5: Presets + bottom CTA
- Restyle animation `#favorites-grid` as horizontal scroll chips (mint when active).
- Restyle solid `#color-presets-row` as flex-wrap pill chips.
- Power: mint `.power-cta` at dock bottom (same `#power-btn` node); add `.power-strip__mirror` in sticky toolbar (aria-hidden decorative sync).
- Connect prompt: dock-adjacent card with mint outline when offline.
- Install-visible class: `padding-bottom` on `.app-shell` when banner shown.
- **Acceptance:** Power on/off, horizontal fav scroll, color preset pills unchanged functionally; install banner never covers power CTA.

### Phase 6: Sheets + polish
- Restyle modal sheets: `--bg-surface`, 24px top radius, grabber, mint primary buttons.
- **Settings sheet:** connection row, activity log (`#console-body` max-height scroll), install row, about version unchanged in function.
- **Palette sheet:** full HSL picker + recent colors; Done closes sheet.
- **Mode picker sheet:** search filters list; tap mode closes sheet and calls `setMode`.
- **Favorite / color preset modals:** Enter/Escape keyboard handlers preserved.
- Mode list items: mint active border.
- Install banner: mint accent border (not pink).
- `#compat-banner` visible above hero when BLE unsupported.
- Motion: arc dash transition 280ms; card press scale 0.98; glow pulse on connecting.
- `prefers-reduced-motion` respected.
- **Acceptance:** All sheets/modals usable; Escape closes; no scroll trap regressions.

### Phase 7: QA + cache bump
- Manual matrix: connect, solid color, custom picker, animation modes, favorites, power, reconnect, install, standalone PWA.
- Bump `sw.js` `CACHE_NAME` from `floro-controller-v32` to `floro-controller-v33` (or next integer).
- Run T8 ID preservation grep before merge.
- QA note: hard refresh or PWA reinstall required to pick up new cache (see sw-cache-verify learning).
- Visual pass against reference screenshots at 390px and 768px width.

## New CSS Components (add to `styles.css`)

| Class | Purpose |
|-------|---------|
| `.ambient-bg` | Fixed radial gradient layer |
| `.hero-zone` | Grid: mode rail + gauge |
| `.mode-rail` / `.mode-rail-btn` | Vertical Solid/Animation pills |
| `.scene-gauge` | SVG wrapper |
| `.scene-gauge__arc` | Progress stroke |
| `.scene-gauge__value` | Center number/text |
| `.quick-actions` | 4 icon buttons row |
| `.control-card` | Charcoal rounded card |
| `.control-card__icon` | Tinted icon badge |
| `.preset-row--anim` | Horizontal scroll chip row (`#favorites-grid`) |
| `.preset-row--solid` | Flex-wrap pill row (`#color-presets-row`) |
| `.power-cta` | Bottom mint pill |
| `.mint-slider` | Replaces `.ios-slider` styling |

## New JS (minimal)

```javascript
// js/ui.js - sketch
let _arcLength = 283; // set once from path.getTotalLength() on DOMContentLoaded

export function updateArcGauge(svgEl, { value, max, label, sublabel, accentHex, poweredOff }) {
  const pct = poweredOff || max <= 0 ? 0 : value / max;
  const arc = svgEl?.querySelector('.scene-gauge__arc');
  if (arc) {
    if (!_arcLength && arc.getTotalLength) _arcLength = arc.getTotalLength();
    arc.style.strokeDasharray = `${_arcLength * pct} ${_arcLength}`;
  }
  // update #scene-gauge-value / #scene-gauge-sub text nodes
}

/** Single hub - call from syncBrightnessSliders, onSpeedInput, setMode, updatePowerUI, updatePreviewChrome */
export function syncSceneGauge(state) {
  // state: { displayView, isPoweredOn, brightness, speed, activeMode, activeColor, connected }
  // branches: off → OFF/0; solid → B/8; anim → speed/100 + mode label
}
```

Call sites: **only** through `syncSceneGauge()` invoked inside existing hubs in `app.js` (not scattered at BLE layer).

Extend `updateNeonThemeColor()`:

```javascript
document.documentElement.style.setProperty('--accent-dim', `${hexColor}2E`);
document.documentElement.style.setProperty('--accent-glow', `${hexColor}73`);
// keep legacy --neon-glow / --accent-rgba until follow-up cleanup
```

Extend `updatePowerUI()`:

```javascript
const mirror = document.querySelector('.power-strip__mirror');
if (mirror) {
  mirror.classList.toggle('is-on', visualOn);
  mirror.classList.toggle('is-unavailable', !connected);
}
```

## Visual Scan Hierarchy (Pass 1)

Three-second scan order on phone (390px, connected, Solid tab):

| Order | Element | User reads | Job |
|-------|---------|------------|-----|
| 1 | Status chip | "Connected to {name}" or "Tap to connect" | Trust + entry to settings |
| 2 | Arc gauge center | Brightness `8` or mode `#32` + sublabel | Scene readout (matches sign) |
| 3 | Mode rail active pill | Solid or Animation | Current mode |
| 4 | Dock toolbar | Seg + power mirror | Mode switch + power at thumb height |
| 5 | Brightness card value | `8 / 8` in mint | Primary control label |
| 6 | Color swatch grid / mode card | Tappable presets | Change scene |
| 7 | Power CTA (dock bottom) | Power On/Off mint pill | Global on/off |

**Constraint worship (3 things if viewport collapses):** status chip, dock toolbar (mode + power), brightness card. Gauge compacts but stays visible; hero never pushes dock below fold on 390×740.

Navigation flow unchanged: one main surface, sheets for settings/palette/modes/modals. No hamburger, no tabs beyond Solid|Animation.

## Interaction State Coverage (Pass 2)

What the user **sees** per state (not backend):

| Feature | Loading | Empty | Error | Success | Partial |
|---------|---------|-------|-------|---------|---------|
| Connection | Chip: "Connecting…" + warning pulse | Offline: chip "Tap to connect" + connect strip | Chip error state + red dot; compat banner if unsupported | Chip green + truncated device name | Reconnect label with last device name |
| Power | n/a | n/a | Tap when offline: toast in activity log only | `is-on`: green IEC + "Power On" label on CTA | `disabled-control` on cards when off; labels `OFF` |
| Solid swatches | n/a | n/a | n/a | Selected ring + dynamic accent | One swatch `.selected` at a time |
| Color presets | n/a | Row hidden when `floro_color_presets` empty | Duplicate save blocked (info log) | Chip applies color | Max 12 chips |
| Animation favorites | n/a | Empty row (no respawn of deleted defaults) | Duplicate add: info log | Active chip mint ring | Horizontal scroll, no 3-col grid |
| Mode picker sheet | List renders from `mode-names.js` | Search: "No modes match …" centered in sheet | n/a | Tap mode closes sheet | Search filters live |
| Arc gauge | n/a | Powered off: center `OFF`, arc at 0 | n/a | Value tracks slider/hero | Solid: arc = B/8; Anim: arc = speed% |
| Install banner | Android: up to 2.5s before show | n/a | n/a | Native install or modal steps | Dismiss hides 7 days; settings install remains |
| Activity log | n/a | Empty: "No activity yet." muted caption in settings | Red border entries | Green success entries | Scroll max 160px in settings |

## User Journey and Emotional Arc (Pass 3)

| Step | User does | User feels | Plan support |
|------|-----------|------------|--------------|
| 1 | Opens PWA from home screen | "This is a real remote" | Mint + Sofia Sans + logo; no marketing hero |
| 2 | Sees offline | Mild urgency, not blocked | Connect strip dock-adjacent; chip invites tap |
| 3 | Connects | Relief, confidence | Chip animates to connected; panels unlock; haptic light |
| 4 | Adjusts brightness | Direct control | Slider + steppers primary; gauge confirms |
| 5 | Picks neon pink | Delight (UI glows pink) | `updateNeonThemeColor()` on arc, CTA, cards |
| 6 | Switches to Animation | Familiar mode switch | Rail pill + last mode restored |
| 7 | Finds mode 32 | Capable, not overwhelmed | Mode card + sheet search; favorites row |
| 8 | Power off | Clear off state | CTA + panels dim; no mystery disabled controls |
| 9 | Returns next day | "It remembers me" | Auto-reconnect + scene restore + Animation tab on power-on |

**Time horizons:** 5 sec: mint arc + FloRo logo. 5 min: thumb-zone dock, no scroll hunt. 5 year: consistent remote metaphor, no debug chrome creep.

## Design Specificity and Anti-Slop (Pass 4)

**Classifier:** APP UI (utility remote, not marketing).

**Litmus (target YES):**

| Check | Answer | Notes |
|-------|--------|-------|
| Brand unmistakable first screen? | YES | Neon Attack logo + FloRo + mint arc |
| One visual anchor? | YES | Arc gauge stroke |
| Scannable by labels? | YES | Card titles: Brightness, Speed, Color, Mode |
| One job per section? | YES | Hero = readout; dock = manipulate |
| Cards necessary? | YES | Each card wraps one slider/grid cluster |
| Motion improves hierarchy? | YES | Arc dash + connecting pulse only |
| Premium without decorative shadows? | YES | Glow is functional (accent state), not gray SaaS shadow stacks |

**Hard rejections:** None. Not a generic 3-column feature grid; reference-driven mint remote.

**Specificity locked (not "clean modern"):**

- Gauge arc: 270° SVG, 8px stroke, `stroke-linecap: round`, dash transition 280ms
- Mode rail pills: 88px wide, 12px gap, 15px/600 label, active fill `--accent` with `--bg-deep` text
- Control cards: `#1D1F21` fill, 1px `rgba(219,230,228,0.08)` border, 14px padding, 24px radius
- Mint slider: 4px track, 22px thumb, 2px white ring + accent glow shadow
- Quick actions: 56×56px tiles, 16px radius, icon 24px, label 11px/600 below icon
- Power CTA: min-height 52px, 17px/600 label, full width minus 16px horizontal inset

## Z-Index and Overlay Stack

| Layer | z-index | Element | Rule |
|-------|---------|---------|------|
| Base content | 1 | `.app-main`, hero | Default |
| Remote dock | 50 | `#remote-dock` | Sticky thumb zone |
| Compat banner | 55 | `#compat-banner` | Above main, below header |
| Header | 60 | `.app-header` | Always tappable |
| Install banner | 70 | `#install-banner` | Fixed overlay; add `padding-bottom` on `.app-shell` when visible so power CTA not obscured |
| Sheets / modals | 100 | `.sheet-overlay` | One at a time |

When install banner visible: `.app-shell` gets `padding-bottom: calc(88px + env(safe-area-inset-bottom))` via JS class `install-banner-visible` (same pattern as today; restyle only).

## Resolved Design Decisions (Pass 7)

| Decision | Resolution | Rationale |
|----------|------------|-----------|
| Power placement | Single `#power-btn` in `#remote-dock`; mint `.power-cta` styling at dock bottom; sticky `.remote-toolbar` keeps 44px IEC **power mirror** (`.power-strip__mirror`, `aria-hidden="true"`) synced from `is-on` / `is-unavailable` classes | One handler; power visible while scrolling cards; no cloned button |
| Install banner | Fixed overlay outside `.app-shell`, z-70 | Matches shipped HTML; avoids flex reflow |
| Hero vs dock priority | Dock primary; gauge readout secondary | UX review; 390×740 acceptance |
| Mode rail vs horizontal seg | Vertical rail in hero on all phone widths; horizontal seg fallback only ≥600px if rail QA fails | Reference mockups; rail collapses to icons-only below 360px width |
| Gauge compact ≤740px | `--gauge-size: min(52vw, 200px)`; hero max-height 220px; quick actions 48px tiles | Replaces `display:none` on `.remote-view-stage` |
| `#anim-stepper-readout` | Remove `aria-hidden="true"`; expose as `aria-live="polite"` | Screen reader hears mode changes from stepper |
| Preset layout | Anim: horizontal scroll; Solid: flex-wrap pills | No shared 3-col grid |
| Custom color | Sheet only | No inline palette on main surface |

## Accessibility

### Landmarks and reading order

- `header` → `main` (compat, hero) → `#connect-prompt` → `#remote-dock` → fixed `#install-banner`
- `#remote-dock` contains tablist, tabpanels (cards), and power CTA
- Sheets: `role="dialog"` + `aria-modal="true"` + labelled titles

### Touch targets (minimum)

| Control | Size |
|---------|------|
| Seg / mode rail | 44×44px min |
| Stepper buttons | 44×44px (existing `.btn-step`) |
| Swatches | 48×48px |
| Quick action tiles | 56×56px |
| Power CTA | 52px height, full width |
| Install banner actions | 44px min height (bump from 36px in mint restyle) |

### Keyboard and focus

- Tab order follows visual scan hierarchy
- `:focus-visible`: 2px solid `#41E9BD`, 2px offset, on all interactive controls
- Escape closes top sheet (unchanged)
- Mode rail: arrow keys between tabs (enhancement; keep click primary)
- Quick actions: real `<button>` elements, not divs

### Screen reader

- Gauge: dynamic `aria-label` (e.g. `"Brightness 8 of 8"`, `"Animation mode 32 Counter Spin"`)
- `#anim-stepper-readout`: remove `aria-hidden`; add `aria-live="polite"`
- Power mirror in toolbar: `aria-hidden="true"` (decorative duplicate of CTA state)
- `#solid-preview-swatch`: keep in DOM for JS; gauge carries primary label

### Contrast

- `#41E9BD` on `#1D1F21`: use for large text (≥18px bold) and UI components; card labels at 15px/600 use `#DBE6E4` on charcoal
- Status chip offline copy: `#DBE6E4` on `#252829`, not muted-only
- Connecting warning dot: `#FFB020` on charcoal passes for non-text indicator

## Responsive Layout

| Viewport | Layout behavior |
|----------|-----------------|
| ≤360px width | Mode rail icons-only (hide "Solid"/"Animation" text, keep aria-label) |
| 390×740 (acceptance) | Gauge 200px max; dock toolbar + brightness + mode rail + power CTA reachable without **document** scroll; card area may scroll inside dock |
| ≤740px height | `--gauge-size: min(52vw, 200px)`; hero `max-height: 220px`; do **not** hide controls |
| 391–599px width | Full mode rail labels; 2-col card grid when space allows |
| ≥600px width | Sheets as centered card (420px max); hero gauge 280px |
| ≥768px width | Same single-column 500px max content; extra margin only |

**Sticky behavior:** `.remote-toolbar` sticky at top of `#remote-dock` while card stack scrolls inside dock (`overflow-y: auto; max-height: calc(100dvh - header - hero - connect)`).

## What Already Exists

Reuse without reinventing:

| Asset | Location | Reuse in mint build |
|-------|----------|---------------------|
| DESIGN.md | repo root | Token source of truth (updated for mint) |
| Bottom-first dock IA | `#remote-dock`, `js/app.js` | Keep container ID and panel swap logic |
| Dynamic accent | `updateNeonThemeColor()` in `js/ui.js` | Extend CSS var list |
| Sheet system | `.sheet-overlay`, `body.sheet-open` | Restyle tokens only |
| HSL color picker | `js/color-picker.js` | Sheet body restyle |
| Scene persistence | `js/state.js`, `floro_scene_state` | No changes |
| Install flow | `js/ui.js` install helpers | z-70 overlay preserved |
| Mode names | `js/mode-names.js` | Unchanged |
| Reference mockups | `assets/original-*.png` | Visual QA target |

## NOT in Scope

| Deferred | Rationale |
|----------|-----------|
| Air Flow / speed preset strip | Reference row optional; v2 |
| BLE / protocol changes | Visual-only pass |
| Light theme | Dark-only product |
| Inline custom palette on main | Sheet-only keeps surface scannable |
| npm build pipeline | Static PWA |
| Bottom-only power (no toolbar mirror) | Ship mirror until post-QA confirms scroll-safe single CTA |
| gstack designer mockups | Designer binary not installed; text + reference PNGs sufficient |

## SAFE vs RISK (design choices)

**SAFE (category baseline)**
- Dark-only remote UI (smart lighting norm).
- Bottom primary action for power (thumb zone).
- Settings/infrastructure in sheet, not main surface.
- Mode-first IA (Solid vs Animation never shown at once).

**RISK (memorable)**
- Mint accent instead of FloRo pink default (reference-driven; dynamic color sync keeps sign link).
- Circular arc hero instead of flat sliders-first layout (reference pattern; sliders move to cards).
- Sofia Sans instead of SF Pro (distinct from iOS system apps; Google Font load ~20ms).

## Devex Review Focus Areas

1. **Feature Parity Matrix** — every row has a verified DOM hook after restructure; no feature dropped or merged without mapping.
2. **ID preservation** — full list above; hidden a11y nodes (`#anim-dropdown`, `#mode-list`, `#mode-search`) stay in DOM.
3. **Inline handlers** — eight `selectSwatch` onclick attrs and `stepMode` / `addCurrentToFavorites` globals unchanged.
4. **Single power control** - one `#power-btn`; mint `.power-cta` at dock bottom; `.power-strip__mirror` in sticky toolbar is decorative (`aria-hidden`), not a second button.
5. **Preview chrome IDs** — `#solid-preview-swatch`, `#anim-preview-name` must remain for `updatePreviewChrome()`.
6. **Power-on restore** — do not change `alignUIForPowerOnRestore()` Animation tab behavior.
7. **Gauge edge cases** — powered off shows OFF; solid arc = brightness/8; anim arc = speed/100.
8. **CSS file health** — fix pre-existing syntax error ~L1077-1087 (orphan properties without selector).
9. **Short viewport** — replace old hide-`.remote-view-stage` rule with compact gauge, not hidden controls.
10. **localStorage keys** — no renames: `floro_scene_state`, `floro_favorites`, `floro_color_presets`, `floro_recent_colors`, `floro_last_device`, `floro_install_dismissed_v4`.
11. **No npm build** — static files only; font CDN acceptable.
12. **PWA** — `__FLORO_PWA_BASE`, SW scope, manifest paths unchanged except colors.
13. **Performance** — SVG arc updates on slider input (max 8 brightness steps).

## DX Review (2026-06-29 `/plan-devex-review`)

**Product type:** PWA maintainer/contributor DX (not API/CLI). The "developer" is whoever implements or extends the FloRo Sign Controller static PWA.

**Auto-decisions (spawned session):** Persona A (OSS contributor/maintainer); empathy narrative accurate; competitive tier B (2-5 min TTHW); magical moment B (copy-paste `python3 -m http.server`); mode B (DX POLISH); journey friction fixes folded into plan; confusion report items A (all critical).

### Target Developer Persona

```
TARGET DEVELOPER PERSONA
========================
Who:       Solo or OSS contributor touching HTML/CSS/JS in a zero-build static PWA
Context:   UI overhaul branch; must not break 50+ getElementById refs or BLE hooks
Tolerance: ~15 minutes before abandoning if IDs silently null or CSS fails to parse
Expects:   README golden path, Feature Parity Matrix, ID checklist, DESIGN.md tokens
```

### Developer Perspective (empathy narrative)

I clone the repo and run `python3 -m http.server 8080`. Within two minutes I see the controller on localhost. I open `UI_OVERHAUL_PLAN.md` and find the Feature Parity Matrix, ID checklist, and phase order. I edit `index.html` and grep `app.js` for each ID before merge. If I miss one, the button silently no-ops (worst case). The plan's T8 grep gate and eng review A1 call this out. `styles.css` L1077 has a known orphan block; Phase 1 fixes it. After deploy I bump `sw.js` CACHE_NAME or users keep the old pink skin.

### Competitive DX Benchmark

```
COMPETITIVE DX BENCHMARK
=========================
Tool              | TTHW      | Notable DX Choice          | Source
Static PWA repos  | 2-3 min   | Zero npm, serve + open     | README golden path
Create React App  | 5-10 min  | npm install first          | industry baseline
YOUR PRODUCT      | ~2 min    | python3 -m http.server     | README L13-21
```

Target tier: **Competitive (2-5 min)**. Champion would add a hosted preview URL in plan (deferred).

### Magical Moment

**Moment:** First localhost load shows mint arc gauge updating when sliders move (UI "glows" the sign color).

**Delivery:** Copy-paste serve command (README already documents it). Reference preview at `~/.gstack/projects/ItsRRM97-floro-ble-controller/designs/mint-remote-preview.html` for visual diff.

### Developer Journey Map

```
STAGE           | DEVELOPER DOES              | FRICTION POINTS      | STATUS
----------------|-----------------------------|----------------------|--------
1. Discover     | README + UI_OVERHAUL_PLAN   | Plan is long (925L)    | ok (index + matrix)
2. Install      | git clone + python serve    | Mobile needs HTTPS     | documented optional
3. Hello World  | Open localhost, tap connect | Needs BLE hardware     | expected
4. Real Usage   | Edit HTML/CSS, grep IDs     | Silent null on miss    | fixed: T8 gate
5. Debug        | Activity log in settings    | No ID-miss console warn| deferred P3
6. Upgrade      | sw.js cache bump            | Stale SW skin          | Phase 7 locked
```

### First-Time Developer Confusion Report (addressed)

| # | Confusion | Resolution |
|---|-----------|------------|
| 1 | Which file owns gauge updates? | `syncSceneGauge()` hub in ui.js (eng A3) |
| 2 | Can I move `#power-btn`? | Single node; CSS grid places CTA + mirror (T1/T10) |
| 3 | Orphan CSS at L1077 | Phase 1 / T5 |
| 4 | Old hide rule kills hero | Delete `.remote-view-stage { display: none }` (T3) |

### DX Scorecard

```
+====================================================================+
|              DX PLAN REVIEW — SCORECARD                             |
+====================================================================+
| Dimension            | Score  | Prior  | Trend  |
|----------------------|--------|--------|--------|
| Getting Started      | 9/10   | -      | new    |
| API/CLI/SDK (contract)| 8/10  | -      | new    |
| Error Messages       | 7/10   | -      | new    |
| Documentation        | 9/10   | -      | new    |
| Upgrade Path         | 8/10   | -      | new    |
| Dev Environment      | 9/10   | -      | new    |
| Community            | 6/10   | -      | new    |
| DX Measurement       | 7/10   | -      | new    |
+--------------------------------------------------------------------+
| TTHW                 | 2 min  | -      | new    |
| Competitive Rank     | Competitive                              |
| Magical Moment       | designed via localhost + arc sync          |
| Product Type         | PWA maintainer/contributor                 |
| Mode                 | DX POLISH                                |
| Overall DX           | 8/10   | -      | new    |
+====================================================================+
```

### DX amendments folded into plan

1. **T8 ID grep gate** remains P1 before merge (maintainer pit of success).
2. **DESIGN.md + parity matrix** are the acceptance contract for contributors (Pass 4).
3. **Reference preview HTML** path documented for visual diff without running BLE.
4. **Deferred (NOT in scope):** console warning on null getElementById; Playwright smoke (T7 optional).

### DX Implementation Tasks (devex-sourced)

- [x] **T11 (P2)** — Add `scripts/check-ids.sh` one-liner from ID checklist (T8)
- [ ] **T12 (P3)** — README link to `UI_OVERHAUL_PLAN.md` Feature Parity Matrix for contributors

## Eng Review (2026-06-29 `/plan-eng-review`)

### Step 0: Scope Challenge

**Verdict: PROCEED.** Touches 8 files max (`index.html`, `css/styles.css`, `js/ui.js`, `js/app.js`, `js/color-picker.js` class-only, `manifest.webmanifest`, `sw.js`, `DESIGN.md`). Zero new services or classes. Visual/IA-only scope matches the stated goal; BLE/state/protocol correctly out of scope.

| Check | Result |
|-------|--------|
| Existing code reuse | Strong: `themePanels`, `updateNeonThemeColor()`, sheet system, scene persistence, 50+ module-load `getElementById` refs in `app.js` |
| Minimum diff | Markup/CSS restructure + one new `syncSceneGauge()` hub; no logic rewrite |
| Complexity smell | None (at 8-file threshold, not over) |
| Distribution | Static PWA; `sw.js` cache bump in Phase 7 is the deploy path |

**Prior learning applied:** sw-cache-verify (confidence 8/10, 2026-06-28) - bump `CACHE_NAME` before QA or users keep old CSS/HTML.

### Architecture Review (8/10)

| # | Severity | Confidence | Finding | Resolution (folded into plan) |
|---|----------|------------|---------|-------------------------------|
| A1 | P1 | 9/10 | `app.js` binds 50+ DOM refs at module load (`getElementById` L47-101). Missing ID after restructure = silent null, feature dead. | Phase 3 gate: grep checklist IDs vs `index.html` before merge; `/qa` Connection row catches connect/power first |
| A2 | P1 | 9/10 | `themePanels = [remoteDock, powerStrip, ...controlPanels]` (app.js L104). Dynamic accent applies inline box-shadow/border to these nodes only. | Do **not** add hero gauge wrapper to `themePanels`; arc gets accent via CSS vars set by `updateNeonThemeColor()` |
| A3 | P2 | 8/10 | Plan lists 6+ `updateArcGauge()` call sites scattered in `app.js`. Miss one = stale gauge. | **Amendment:** single `syncSceneGauge()` in `ui.js` called from existing sync hubs (see below) |
| A4 | P2 | 8/10 | Single `#power-btn` moved via CSS grid; `.power-strip__mirror` decorative. `updatePowerUI()` (app.js L580) only toggles `#power-btn` classes today. | **Amendment:** extend `updatePowerUI()` to mirror `is-on` / `is-unavailable` onto `.power-strip__mirror` |
| A5 | P3 | 7/10 | Hero zone splits preview between gauge center (`#solid-preview-swatch`, `#anim-preview-name`) and new `#scene-gauge-*` nodes. | Keep preview IDs inside gauge center DOM; `updatePreviewChrome()` unchanged; gauge labels read from same state |

**Gauge sync hub (architecture contract):**

```
syncSceneGauge()  ← called from:
  syncBrightnessSliders()     → solid tab: arc = B/8
  onSpeedInput()              → anim tab: arc = speed/100
  setMode() / updateModeHero()→ anim tab: center label from hero
  updatePowerUI()             → OFF: arc 0, label "OFF"
  updatePreviewChrome()       → solid: swatch fill (existing)
  updateNeonThemeColor()      → arc stroke via --accent (existing vars + new tokens)
```

Do **not** add gauge calls inside BLE callbacks or color debounce paths directly; always route through the hubs above.

### Code Quality Review (8/10)

| # | Severity | Confidence | Finding | Resolution |
|---|----------|------------|---------|------------|
| C1 | P1 | 10/10 | CSS orphan block at `styles.css` L1077-1087: properties without selector (orphaned `display:flex` block after comment). Browsers drop rules; adjacent `.anim-mode-hero-num` may inherit wrong cascade context. | Phase 1: restore missing selector (likely `.anim-mode-hero-row`) or delete dead block if hero markup moves |
| C2 | P2 | 9/10 | `updateNeonThemeColor()` sets legacy vars (`--neon-glow`, `--accent-rgba`, `--accent-muted`) but plan tokens use `--accent-dim`, `--accent-glow`. | Extend function to set **both** legacy and mint token names during transition; remove legacy aliases in a follow-up TODO |
| C3 | P2 | 8/10 | `@media (max-width: 500px), (max-height: 850px) { .remote-view-stage { display: none } }` (styles.css L1726-1728) contradicts mint layout goal. | Phase 1: delete hide rule; replace with compact `--gauge-size` tokens (T3) |
| C4 | P3 | 7/10 | `prefers-reduced-motion` zeroes all transitions globally (styles.css L1759). Arc dash should respect but gauge value updates must remain instant-readable. | Arc transition: wrap in `@media (prefers-reduced-motion: no-preference)`; value text updates always sync |

### Test Review (7/10)

**Framework:** No npm test suite, no `package.json`, no CI test runner. **Recommendation:** Feature Parity Matrix + existing manual QA table remain the acceptance contract. Optional minimal smoke (Phase 7, non-blocking): single Playwright spec or static `tests/id-preservation.html` that loads `index.html` and asserts required IDs exist (see T7).

#### Coverage diagram

```
CODE PATHS                                              USER FLOWS
[+] js/app.js                                           [+] Offline launch
  ├── module-load getElementById (50+ IDs)                ├── [GAP] [→MANUAL] QA Connection table
  │   ├── [GAP]         ID missing → null ref               └── [GAP] [→MANUAL] Post-build grep gate (T8)
  ├── updatePowerUI()                                     [+] Power toggle
  │   ├── [GAP]         mirror sync to .power-strip__mirror ├── [GAP] [→MANUAL] Power off/on rows
  │   └── [★★  MANUAL]  is-on / is-unavailable on #power-btn
  ├── syncBrightnessSliders() / onBrightnessInput()       [+] Brightness adjust
  │   ├── [GAP]         syncSceneGauge() hook               ├── [GAP] [→MANUAL] Slider + steppers + arc
  │   └── [★★  MANUAL]  BLE debounce 120ms unchanged
  ├── onSpeedInput()                                      [+] Animation speed
  │   └── [GAP]         syncSceneGauge() hook               └── [GAP] [→MANUAL] Arc = speed%
  ├── setMode() / stepMode()                              [+] Mode picker journey
  │   └── [GAP]         gauge label on mode change          ├── [GAP] [→MANUAL] Sheet search + apply
  ├── updatePreviewChrome()                               └── [GAP] [→MANUAL] Favorites row
  │   └── [★★  MANUAL]  swatch + anim name (existing)
  ├── updateNeonThemeColor()                              [+] Dynamic accent
  │   └── [GAP]         --accent-dim/--accent-glow tokens   └── [GAP] [→MANUAL] Pick hot pink case
  └── alignUIForPowerOnRestore()                          [+] Scene persistence
      └── [★★★ MANUAL]  Animation tab on power-on (REGRESSION)  └── [GAP] [→MANUAL] Reload + reconnect

[+] js/ui.js
  ├── updateArcGauge() [NEW]
  │   ├── [GAP]         strokeDasharray math
  │   ├── [GAP]         powered-off OFF state
  │   └── [GAP]         getTotalLength fallback
  └── syncSceneGauge() [NEW]
      └── [GAP]         branches solid vs anim vs off

[+] css/styles.css
  ├── orphan L1077 [REGRESSION FIX]
  │   └── [GAP]         valid parse after fix
  └── remote-view-stage hide [REGRESSION FIX]
      └── [GAP]         compact gauge at 390×740

[+] sw.js
  └── CACHE_NAME bump
      └── [GAP] [→MANUAL] Hard refresh / reinstall PWA verifies new skin

COVERAGE: 3/22 paths tested (14%)  |  Code: 2/14 (14%)  |  User flows: 1/8 (13%) - all manual
QUALITY: ★★★:1 ★★:2 ★:0  |  GAPS: 19 (0 E2E automated; 19 manual/QA)
REGRESSIONS flagged: power-on Animation tab, ID preservation, CSS parse, viewport hide rule
```

**Test strategy (locked):**

1. **Primary:** Manual QA matrix below (Feature Parity contract). `/qa` runs against it.
2. **Build gate (P1):** T8 ID grep script or checklist before PR merge.
3. **Optional (P3):** T7 Playwright smoke - `index.html` loads, `#power-btn` + `#remote-dock` + `#slider-brightness` present, no console errors. No BLE in CI.
4. **No unit tests for SVG math** unless Playwright added; 8 brightness steps make manual arc check sufficient.

### Performance Review (9/10)

| # | Severity | Confidence | Finding | Resolution |
|---|----------|------------|---------|------------|
| P1 | P3 | 8/10 | SVG `strokeDasharray` recalc on every slider `input` event. Max 8 brightness steps + 100 speed steps; negligible on target phones. | Use `requestAnimationFrame` throttle only if jank observed in QA; default direct update is fine |
| P2 | P3 | 7/10 | Google Fonts CDN (Sofia Sans) adds network dependency on first load; PWA offline may fall back to system-ui. | `font-display: swap` on link; `--font-display` stack includes `system-ui`; do **not** add fonts.googleapis.com to `sw.js` ASSETS (cross-origin cache unreliable) |
| P3 | P3 | 9/10 | `getTotalLength()` on arc path once at init, cache length in `syncSceneGauge` closure. | Plan sketch updated in New JS section |

### Failure Modes

| Codepath | Production failure | Test? | Error handling? | User sees |
|----------|-------------------|-------|-----------------|-----------|
| Missing DOM ID after restructure | Controls silently no-op | Manual grep gate | None (null guards partial) | Broken button, no toast - **critical gap** |
| `updateArcGauge` not wired on speed | Arc stale in Animation tab | Manual QA | N/A | Wrong readout, sliders still work |
| Stale SW cache | Old pink iOS skin after deploy | CACHE_NAME bump | SW activate deletes old | Confusing mixed UI until hard refresh |
| Font CDN blocked | system-ui fallback | Visual QA | CSS stack fallback | Slightly different typography |
| Power mirror desync | Toolbar shows wrong power state | Manual scroll QA | N/A | Misleading indicator (CTA still correct) |

**Critical gaps:** 1 (missing ID silent failure). Mitigated by T8 build gate + Feature Parity Matrix QA.

### Worktree Parallelization

Sequential implementation, no parallelization opportunity. All phases touch `index.html` + `styles.css`; Phases 3-5 share `js/ui.js` / `js/app.js`.

### Eng Amendments (auto-applied)

1. **`syncSceneGauge()` hub** - single gauge update entry; call from sync functions listed above.
2. **`updatePowerUI()` mirror** - sync classes to `.power-strip__mirror`.
3. **`updateNeonThemeColor()` token bridge** - set `--accent-dim` / `--accent-glow` alongside legacy vars.
4. **Phase 1** - delete `.remote-view-stage { display: none }` when fixing orphan CSS.
5. **Phase 7** - `CACHE_NAME` bump `floro-controller-v32` → `v33`; document hard-refresh step in QA.
6. **Acceptance** - Feature Parity Matrix is the eng acceptance contract alongside design score.

## Test Plan (for /qa after build)

Every row must pass. Grouped to match Feature Parity Matrix.

### Connection
| Case | Steps | Expected |
|------|-------|----------|
| Offline launch | Open disconnected | Connect strip visible; power unavailable; gauge muted |
| Main connect | Tap Scan & Connect on strip | BLE picker; success enables panels |
| Settings connect | Settings > Scan & Connect | Same as main |
| Reconnect | Disconnect; tap Reconnect on strip/settings | Uses last device name |
| Auto-reconnect | Reload with known device in range | Connecting chip → connected; scene restored |
| Disconnect | Settings > Disconnect | Offline; wake lock released; scene flushed |
| Status chip → settings | Tap chip | Settings sheet opens |
| Unsupported browser | Open in Safari | Compat banner; connect disabled |

### Power and gating
| Case | Steps | Expected |
|------|-------|----------|
| Power off | Tap Power Off | Labels OFF; panels disabled; `B=0` |
| Power on | Tap Power On | Animation tab restored; full scene sent |
| Power disconnected | Tap power when offline | Info log; heavy haptic |

### Solid mode
| Case | Steps | Expected |
|------|-------|----------|
| Swatch | Tap each of 8 swatches | Selected ring; sign color; theme retints |
| Brightness slider + steppers | Drag and tap ± | Gauge arc updates; synced anim slider |
| Custom color sheet | Quick action or button | HSL picker; live preview; commit switches to solid |
| Recent colors | Pick multiple custom colors | Up to 8 in recents grid |
| Save color preset | Save preset; name it | Appears in preset grid; max 12 |
| Apply/remove preset | Tap chip; tap × | Color applies; remove persists |
| Anim → solid via color | On Animation tab, pick swatch | Switches to Solid; mode 1; scene sent |

### Animation mode
| Case | Steps | Expected |
|------|-------|----------|
| Mode rail | Tap Animation | Restores last animation mode |
| Mode picker | Tap mode card / quick action | Sheet opens; search "32" finds mode |
| Mode stepper | Tap ± | Wraps 1–200; readout updates |
| Speed slider + steppers | Adjust speed | Gauge arc + `%` label; BLE speed sent |
| Add favorite | Add on mode 32 | Modal prefilled; chip in grid |
| Duplicate favorite | Add same mode again | Info log; no duplicate |
| Remove favorite | Tap × on chip | Removed; empty array stays empty |
| Apply favorite | Tap chip label | Mode applied; mint active state |

### Persistence and PWA
| Case | Steps | Expected |
|------|-------|----------|
| Scene reload | Change tab/color/mode; reload | UI restores from `floro_scene_state` |
| Activity log | Connect, change color | Entries in settings log with colors |
| Install banner | Android Chrome | Banner or 2.5s fallback |
| Dismiss install | Not now | Hidden 7 days; Settings install still works |
| Standalone | Installed PWA | No install banner/row |
| Reduced motion | OS setting on | No arc animation |

### Visual
| Case | Steps | Expected |
|------|-------|----------|
| Short viewport | 390×740 or shorter | Gauge compact; controls reachable; no blank main |
| Dynamic accent | Pick hot pink | Arc/CTA/sliders tint pink until another color |

## Rollback

Revert `index.html`, `css/styles.css`, `js/ui.js` gauge hooks, font link. `DESIGN.md` documents prior iOS system in git history.

## Next Steps

1. **Optional:** Run `/plan-devex-review` against this plan + `DESIGN.md`.
2. **Build:** Implement Phases 1-7 in order; one PR; no BLE changes.
3. **QA:** `/qa` with test plan above on Android Chrome + desktop.

---

Created: 2026-06-29 via `/design-consultation`  
Reference assets: `assets/original-*.png` in workspace

## Implementation Tasks

Synthesized from design review findings. Run with Claude Code or Codex; checkbox as you ship.

- [x] **T1 (P1, human: ~1h / CC: ~10min)** - Power mirror + single CTA - Add `.power-strip__mirror` synced to `#power-btn` state; mint `.power-cta` on same node at dock bottom
  - Surfaced by: Pass 7 - power visibility while scrolling cards
  - Files: `index.html`, `css/styles.css`, `js/ui.js`
  - Verify: 390×740 scroll card stack; power state visible in sticky toolbar and bottom CTA

- [x] **T2 (P1, human: ~30min / CC: ~5min)** - A11y stepper readout - Remove `aria-hidden` from `#anim-stepper-readout`; add `aria-live="polite"`
  - Surfaced by: Pass 6 - accessibility gaps
  - Files: `index.html`, `js/ui.js`
  - Verify: VoiceOver/TalkBack announces mode on stepper tap

- [x] **T3 (P1, human: ~45min / CC: ~10min)** - Short viewport gauge - Replace `.remote-view-stage { display: none }` with compact `--gauge-size` tokens
  - Surfaced by: Pass 6 - 390×740 acceptance
  - Files: `css/styles.css`, `js/ui.js`
  - Verify: 390×740: brightness slider reachable without document scroll

- [x] **T4 (P2, human: ~20min / CC: ~5min)** - Install banner clearance - `install-banner-visible` padding on `.app-shell`
  - Surfaced by: Pass 1 - z-index stack
  - Files: `css/styles.css`, `js/ui.js`
  - Verify: Banner open; power CTA fully tappable above banner

- [x] **T5 (P2, human: ~15min / CC: ~5min)** - CSS orphan fix - Repair invalid rules at `styles.css` L1077-1087
  - Surfaced by: Devex focus area 8
  - Files: `css/styles.css`
  - Verify: CSS parses; no orphan property blocks

- [x] **T6 (P2, human: ~2h / CC: ~20min)** - Arc gauge component - SVG + `syncSceneGauge()` hub wired to brightness/speed/mode/power
  - Surfaced by: Eng review A3 - scattered call-site risk
  - Files: `index.html`, `css/styles.css`, `js/ui.js`, `js/app.js`
  - Verify: Arc tracks slider; OFF when powered down; single hub only

- [ ] **T7 (P3, human: ~1h / CC: ~15min)** - Optional Playwright smoke - page loads, core IDs exist, no console errors
  - Surfaced by: Eng review Test - no automated suite today
  - Files: `tests/smoke.spec.js` (new, optional), `package.json` devDeps only if adopted
  - Verify: `npx playwright test` green OR skip with manual-only note in PR

- [x] **T8 (P1, human: ~15min / CC: ~5min)** - ID preservation gate - script greps ID checklist vs `index.html` before merge
  - Surfaced by: Eng review A1 - silent null refs
  - Files: `scripts/check-ids.sh` (new) or documented grep one-liner in Phase 3 acceptance
  - Verify: All IDs from checklist present in built HTML

- [x] **T9 (P2, human: ~20min / CC: ~5min)** - Neon token bridge - `updateNeonThemeColor()` sets `--accent-dim` / `--accent-glow`
  - Surfaced by: Eng review C2 - legacy vs mint token mismatch
  - Files: `js/ui.js`
  - Verify: Dynamic pink pick tints arc glow + card borders

- [x] **T10 (P2, human: ~15min / CC: ~5min)** - Power mirror sync - `updatePowerUI()` toggles `.power-strip__mirror` classes
  - Surfaced by: Eng review A4 - mirror desync risk
  - Files: `js/app.js`, `index.html`
  - Verify: Scroll card stack; toolbar mirror matches CTA state

## GSTACK REVIEW REPORT

| Review | Trigger | Why | Runs | Status | Findings |
|--------|---------|-----|------|--------|----------|
| CEO Review | `/plan-ceo-review` | Scope and strategy | 0 | - | - |
| Codex Review | `/codex review` | Independent 2nd opinion | 0 | - | - |
| Eng Review | `/plan-eng-review` | Architecture and tests (required) | 1 | clean | 12 issues, 0 critical gaps open, 4 sections scored 8/8/7/9 |
| Design Review | `/plan-design-review` | UI/UX gaps | 1 | clean | score: 7/10 → 9/10, 8 decisions resolved |
| DX Review | `/plan-devex-review` | Developer experience gaps | 1 | clean | score: 7/10 → 8/10, TTHW: est → 2 min |

**VERDICT:** Design + Eng + DX CLEARED — ready to implement Mint Remote UI.

NO UNRESOLVED DECISIONS
