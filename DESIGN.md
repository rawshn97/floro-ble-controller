# Design System — FloRo Sign Controller

## Product Context

- **What this is:** A mobile-first PWA for controlling FloRo neon signs over Web Bluetooth. Users connect once, then adjust brightness, color, animation modes, and power as if holding a dedicated hardware remote.
- **Who it's for:** FloRo sign owners on Chrome/Edge (desktop or Android) who want fast, tactile control without a generic developer console feel.
- **Space/industry:** Smart lighting / IoT controller apps (peers: Philips Hue, Govee Home, Apple Home).
- **Project type:** Single-screen utility PWA with installable home-screen behavior.

## North Star

**Premium hardware remote energy** — not a BLE debug panel.

The app should feel like a polished physical remote: compact, confident, mode-driven, with infrastructure (connection, logs, install) tucked away until needed. Every pixel on the main surface earns its place by controlling the sign.

### The memorable thing

**The UI glows the color on the sign.** Default chrome accent is mint (`#41E9BD`, reference palette). When the user picks a solid neon color, `updateNeonThemeColor()` retints `--accent`, arc stroke, slider fills, swatch rings, and control-card glows to match. The remote feels physically linked to the light it controls.

### Visual reference (2026-06-29 overhaul)

Mint Remote aesthetic from attached AC remote mockups: Sofia Sans, deep black-green canvas, charcoal cards, circular arc hero gauge, vertical mode rail, full-width mint power CTA. Implementation plan: `UI_OVERHAUL_PLAN.md`.

## Information Architecture

Hero + dock layout (Mint Remote). Arc gauge and mode rail are supplementary readout in `.app-main`; **control cards live inside `#remote-dock`** (primary thumb zone). Power CTA is the same `#power-btn` styled as a mint pill at the dock bottom. Infrastructure stays in sheets.

```
┌─────────────────────────────────────┐
│ Header: FloRo · status · menu     │  ~52px, radial glow behind
├─────────────────────────────────────┤
│ HERO ZONE (readout, compacts ≤740)  │
│  [Solid|Anim rail]  ( ARC GAUGE )   │
│  [ quick action chips x4 ]          │
├─────────────────────────────────────┤
│ CONNECT STRIP (offline, dock-adj)   │
├─────────────────────────────────────┤
│ #remote-dock (PRIMARY thumb zone)   │
│  [Solid|Anim] [power mirror] toolbar│
│  Brightness · Color/Mode cards      │
│  preset row (h-scroll or pills)     │
│  [ mint Power On/Off #power-btn ]   │
└─────────────────────────────────────┘

  (fixed overlay, outside `.app-shell`, z-index 70)
  Install banner (#install-banner)

         settings / sheets  →  z-index 100
```

Full markup and phase breakdown: `UI_OVERHAUL_PLAN.md`.

### Feature preservation (build contract)

Visual overhaul only. All v2.1.0 behavior must survive unchanged: BLE connect/reconnect/auto-reconnect/disconnect, power gating, Solid/Animation mode logic, brightness/speed/color/mode controls, 200-mode picker with search, animation favorites and color presets, HSL custom picker with recents, scene persistence, activity log, PWA install flows, wake lock, haptics, and dynamic accent from selected neon color.

**Authoritative checklist:** `UI_OVERHAUL_PLAN.md` → Feature Parity Matrix + Behavioral invariants + Existing UX Review. Devex review and QA sign off against those sections.

Additional non-negotiables from shipped UX review:

- **Install banner:** Fixed bottom overlay (`#install-banner.install-prompt`), outside `.app-shell`. Do not regress z-index or 7-day dismiss TTL.
- **Thumb-zone dock:** `#remote-dock` remains the primary control surface on phones; hero gauge is supplementary readout.
- **Preset layouts:** Animation favorites = horizontal scroll row; color presets = flex-wrap pill row.
- **Custom color:** Bottom sheet (`#palette-sheet`) only; no inline palette on the main surface.
- **Power-on restore:** `alignUIForPowerOnRestore()` Animation tab behavior is non-negotiable.

### Header (`app-header-compact`)

| Element | Role |
|---------|------|
| Neon Attack logo + "FloRo" | Compact brand mark (keep in mint layout) |
| Status chip | Connection state; offline copy "Tap to connect"; tap opens settings |
| Menu button (vertical dots) | `#btn-menu`; opens settings sheet |

### Remote dock (`#remote-dock`)

| Element | Role |
|---------|------|
| Segmented control | Solid \| Animation |
| Power button | IEC power symbol; global on/off |
| Brightness slider | Always visible in dock |
| Solid panel | 4×2 color grid filling thumb zone, color preset chips, custom color + save actions |
| Animation panel | Speed slider, mode picker row (+/−), horizontal quick presets |

Mode list and search live in `#mode-picker-sheet` (bottom sheet), not on the main scroll surface.

### Solid view

Preview swatch in upper area (hidden below 740px height). All controls in remote dock.

### Animation view

Mode hero is a tappable row opening the mode picker sheet. Quick presets scroll horizontally in the dock.

### Settings sheet (`#settings-sheet`)

Infrastructure only: connection, activity log, install, about.

## Layout Regions

| Region | CSS / ID | Behavior |
|--------|----------|----------|
| **Header** | `.app-header` | Sticky top: logo + FloRo, status chip, vertical-dots menu. 52px min height + safe-area top; radial glow behind. |
| **Hero zone** | `.hero-zone` | Mode rail (left) + arc gauge (center) + quick actions. Readout only; compacts on short viewports, never removed. |
| **Connect strip** | `#connect-prompt` | Dock-adjacent offline CTA; hidden when connected/connecting/unsupported. |
| **Remote dock** | `#remote-dock` | **Primary thumb zone:** sticky toolbar (Solid \| Animation + power mirror), scrollable control cards inside. |
| **Power CTA** | `#power-btn.power-cta` | Single `#power-btn` node; mint full-width pill at dock bottom (not a cloned button). |
| **Install banner** | `#install-banner.install-prompt` | Fixed overlay **outside** `.app-shell`, `z-index: 70`. Never flex child of shell. 7-day dismiss TTL. |
| **Sheets** | `.sheet-overlay` + `.modal-sheet` | Bottom sheets; `z-index: 100`. One overlay at a time. |

Main content (`.app-main`) is max-width 500px, centered. `#remote-dock` sits below connect strip; cards scroll inside dock while toolbar stays thumb-reachable.

## Aesthetic Direction

- **Direction:** Mint Remote — dark smart-home remote with neon mint accent and arc gauge hero (reference: attached AC remote mockups)
- **Decoration level:** Intentional — radial teal glow at top of canvas, mint outer glow on active controls and arc stroke
- **Mood:** Premium night-mode remote. Matte charcoal surfaces, one luminous mint thread (retinted to sign color when picking neon).
- **Reference patterns:**
  - **Attached mockups:** Arc gauge, vertical mode rail, 24px card radius, bottom power pill
  - **Philips Hue / Govee:** Mode-first IA, preset grids, brightness always visible
  - **Prior FloRo IA:** Settings in sheets, no BLE debug on main surface

## Typography

- **Family:** [Sofia Sans](https://fonts.google.com/specimen/Sofia+Sans) — Regular 400, Medium 500, Semi Bold 600, Bold 700
- **Loading:** Google Fonts CDN in `index.html`; fallback `system-ui, sans-serif`
- **Data/Console:** `ui-monospace, 'SF Mono', Menlo, monospace` at 11px for activity log (unchanged)

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| Gauge hero | 42–48px | 700 | Arc center value (brightness / mode #) |
| Title | 20px | 700 | Sheet titles, header |
| Body | 17px | 400 | Default text, buttons |
| Label | 15px | 600 | Card labels, slider values |
| Eyebrow | 13px | 600 | Section headers, uppercase |
| Caption | 11–12px | 600 | Status, console |

## Color

- **Approach:** Restrained — mint default accent + dynamic retint to selected neon color

### Core palette (target `css/styles.css` after overhaul)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-deep` / `--bg-primary` | `#020D0A` | Page background |
| `--bg-surface` / `--bg-grouped` | `#1D1F21` | Cards, rails, header buttons |
| `--bg-elevated` | `#252829` | Inactive chips, inputs |
| `--text-primary` / `--label-primary` | `#DBE6E4` | Primary text |
| `--text-secondary` / `--label-secondary` | `rgba(219,230,228,0.62)` | Labels |
| `--text-muted` / `--label-tertiary` | `rgba(219,230,228,0.38)` | Meta, placeholders |
| `--accent` / `--neon-glow` | `#41E9BD` | Default mint; updates with selected color |
| `--accent-dim` / `--accent-muted` | `rgba(65,233,189,0.18)` | Active chip fill, glow base |
| `--accent-glow` / `--accent-rgba` | `rgba(65,233,189,0.45)` | Shadow, arc, rings |
| `--danger` / `--system-red` | `#FF6B6B` | Offline, destructive |
| `--success` | `#41E9BD` | Connected (same as accent) |
| `--warning` / `--system-orange` | `#FFB020` | Connecting pulse |
| `--system-blue` | `#5B9BD5` | Info log entries |

### Ambient background

Top third: `radial-gradient(ellipse 120% 50% at 50% -10%, rgba(8,44,38,0.85), transparent 55%)` over `--bg-deep`.

### Dynamic accent

When a solid color is selected, `updateNeonThemeColor()` in `js/ui.js` propagates the chosen hex to `--accent`, arc stroke, slider fill, swatch rings, and card glow. Default rest state uses mint.

### Dark mode

Dark-only. No light theme.

## Spacing

- **Base unit:** 4px
- **Density:** Compact — one-handed phone use
- **Max content width:** 500px centered
- **Key spacing:**

| Context | Value |
|---------|-------|
| Header horizontal padding | 16px |
| Hero zone gap (rail / gauge) | 12px |
| Card grid gap | 10px |
| Card internal padding | 14px |
| Preset grid gap | 8px |
| Power CTA margin top | 12px + safe-area |

## Layout

- **Approach:** Grid-disciplined — hero row + 2-col control cards inside dock + mode-specific preset rows
- **Sticky chrome:** Header fixed; hero may scroll on very short viewports
- **Border radius scale:**

| Token | Value | Use |
|-------|-------|-----|
| `--radius-control` | 16px | Swatches, inputs, quick actions |
| `--radius-card` | 24px | Control cards, sheets |
| `--radius-pill` | 999px | Mode rail, power CTA, status chip |
| `--gauge-size` | `min(72vw, 280px)` | Arc diameter |

## Motion

- **Approach:** Intentional — arc and glow communicate state
- **Easing:** `--spring: 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)`
- **Key animations:**

| Interaction | Duration | Behavior |
|-------------|----------|----------|
| Arc value change | 280ms | `stroke-dashoffset` transition |
| View switch (Solid ↔ Animation) | 280ms | Gauge label crossfade |
| Sheet open | 350ms | Slide up (`sheet-up`) |
| Status connecting | 1s loop | Warning dot pulse |
| Button / card press | instant | `scale(0.98)` |
| Reduced motion | — | Collapse to 0.01ms via `prefers-reduced-motion` |

## Component Rules

### Status chip (`status-chip`)

- States: `chip-offline`, `chip-connecting`, `chip-connected`, `chip-error`
- Truncate device names beyond 14 characters
- Tapping opens settings sheet (same as menu button)
- Never show raw BLE UUIDs or debug strings

### Mode rail (`mode-rail` / `seg-control`)

- Vertical pills: Solid | Animation (restyled from horizontal seg control)
- Use `role="tablist"` / `role="tab"` / `role="tabpanel"` for accessibility
- Active pill: solid `--accent` fill, `--bg-deep` text, mint glow shadow

### Scene gauge (`scene-gauge`)

- SVG arc (~270°) with mint stroke (or dynamic accent)
- Center: large value (brightness `8` or mode `32`) + sublabel
- `aria-label` reflects current scene state
- Updated via `updateArcGauge()` in `js/ui.js`

### Control cards (`control-card`)

- Charcoal `--bg-surface`, 24px radius, optional icon badge
- Disabled: `disabled-control` → 45% opacity
- Connected: subtle dynamic glow on border from active color

### Sliders (`mint-slider` / `ios-slider`)

- Live value in card header in `--accent`
- Thin track with mint fill; thumb with soft glow

### Color swatches (`swatch-btn`)

- 4-column grid, minimum 48px touch target
- Selected: white border + accent glow ring
- Custom palette hidden behind disclosure — never compete with presets on first glance

### Palette disclosure (`palette-disclosure`)

- Collapsed by default (`palette-body.is-collapsed`)
- Chevron rotates 180° when expanded; `aria-expanded` toggles with state
- Opens custom HSL picker (2D saturation/lightness, hue strip, HSL sliders, hex input, recent colors)
- Light haptic on toggle

### Favorites (`fav-chip`)

- Pill chips in a scrollable grid (max-height 180px) under "Quick Presets"
- Each chip shows **mode number** (accent pill) + label
- Tap label to apply mode; tap × to remove
- Active chip: `--accent-muted` fill + accent ring when mode matches current selection
- "Add" uses `btn-text`; opens save-favorite sheet with prefilled name from `mode-names.js`
- Persisted in `localStorage` (`floro_favorites`)

### Settings sheet (`modal-sheet`)

- Bottom sheet on mobile; centered card on ≥600px
- Grabber bar at top
- Sections use uppercase 13px titles above grouped cards
- "Done" button dismisses sheet

### Activity log (`console-body`)

- Lives in settings only — never on main surface
- Color-coded left border: info (blue), success (green), error (red), write (accent)

### Buttons

| Variant | Use |
|---------|-----|
| `btn-primary` | Scan & Connect, Save, Install (mint fill) |
| `btn-secondary` | Reconnect, Done, Cancel (surface fill) |
| `btn-destructive` | Disconnect |
| `btn-text` | Add favorite (accent text) |
| `btn-step` | ± stepper (44×44px) |
| `power-cta` | Full-width bottom Power On/Off pill |

## Interaction Patterns

### Haptics

`haptic()` in `js/ui.js` uses `navigator.vibrate` when available:

| Trigger | Intensity |
|---------|-----------|
| Swatch tap, mode change, sheet open, connect success, favorite save | Light (15ms) |
| Power off | Heavy (50ms) |

No haptic spam on slider drag; values update visually in real time.

### Auto-reconnect

On load, `tryAutoReconnect()` in `js/app.js` runs if Web Bluetooth is supported, `ble.canReconnect()` is true, and a last device exists. Status chip shows `chip-connecting` / "Connecting…"; success runs `onConnected()`, failure resets to offline. Settings sheet exposes manual **Reconnect to {name}** when auto-connect is unavailable or failed.

### Solid-from-color tap

When the user is in Animation mode and picks a swatch or commits a custom color, `applyColorSelection()`:

1. Switches the view to Solid (animated panel transition)
2. Sets BLE mode to 1 (solid color) without a redundant mode write
3. Sends the full scene (brightness, speed, color, mode)

Tapping **Solid** in the toolbar also forces mode 1 if an animation was active. Tapping **Animation** restores `lastAnimationMode` if currently on solid (mode 1).

### View transitions

Solid ↔ Animation uses 280ms opacity + horizontal translate. Only one panel receives pointer events at a time (`is-active` / `is-exiting` classes).

### Disabled controls

When power is off, all control cards get `disabled-control` (45% opacity, no interaction). Brightness labels read "OFF". Power strip in toolbar is enabled only when connected.

### Power-on and reconnect restore

On connect and when the user turns power on, `restoreSceneToSign()` sends brightness, speed, color, and the saved animation mode to the sign. The UI switches to the **Animation** tab with that mode pre-selected in the picker so the remote matches sign output (the sign firmware tends to show the last animation on power-on even when the saved UI tab was Solid).

## Do / Don't (Anti-Patterns)

Do **not** introduce these — they break the premium-remote feel:

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| BLE debug console on main screen | Feels like a developer tool, not a remote |
| Showing Solid + Animation controls simultaneously | Violates mode-first IA; creates scroll fatigue |
| Large "Connect" hero on launch | Connection is secondary; status chip + auto-reconnect handle it |
| Native `<input type="color">` | Awkward on mobile; use HSL picker in collapsed disclosure |
| Purple/violet gradient accents | Generic AI slop; use mint `#41E9BD` as default chrome |
| iOS system-font-only UI | Use Sofia Sans per reference mockups |
| Multi-column marketing layout | This is a utility remote, not a landing page |
| Centered-everything with uniform spacing | Use left-aligned grouped cards like iOS Settings |
| Exposed UUID / GATT service names in UI | Belongs in dev docs, not user-facing chrome |
| Modal stacks (sheet on sheet on sheet) | One overlay at a time; use sequential sheets |
| Light theme | Breaks neon-on-dark premium aesthetic |

## Deployment

| URL | Role |
|-----|------|
| `https://rawshn.com/sign-controller/` | Public production URL (canonical for users) |
| `https://blecontroller.vercel.app/` | Direct Vercel deployment (optional mirror) |

**Subdirectory routing:** This repo is a git submodule at `rawshn-portfolio/public/sign-controller/`. The portfolio build serves those static files at `/sign-controller/` on `rawshn.com`. Asset paths stay relative (`./`) so the same files work at both URLs. Optional: point the `ble_controller` Vercel project at the portfolio repo with Root Directory `public/sign-controller` so both domains deploy from the same folder.

### PWA notes
- **Asset paths:** `manifest.webmanifest` uses absolute `/sign-controller/` paths (matches Health Hub `/coach/` pattern for standalone install). Page assets use `./` with `<base href>` for subdirectory resolution.
- **Display:** `standalone` with `display_override: ["standalone", "minimal-ui"]`
- **Meta:** `mobile-web-app-capable` + `apple-mobile-web-app-capable`; `apple-mobile-web-app-title` = FloRo
- **Icons:** Neon Attack `logo.png`; regenerate via `node scripts/generate-icons.mjs`
- **Service worker:** `${__FLORO_PWA_BASE}sw.js` with matching scope; cache `floro-controller-v31`
- **Install prompt:** Fixed bottom overlay (`#install-banner`, z-index 70); mobile Install always visible until standalone; Android 2.5s fallback; compact card on short viewports
- **Required header:** `Permissions-Policy: bluetooth=(self)` in `vercel.json`

## File Map

| File | Design responsibility |
|------|----------------------|
| `index.html` | IA structure, ARIA roles, component markup |
| `css/styles.css` | All visual tokens, mint remote layout, gauge, motion |
| `js/ui.js` | Arc gauge, view transitions, sheets, theme color, install dock |
| `UI_OVERHAUL_PLAN.md` | Phased implementation plan for mint remote build |
| `js/state.js` | Scene persistence (localStorage) |
| `js/app.js` | Mode logic, auto-reconnect, remote dock, color presets |
| `js/mode-names.js` | Curated friendly names for modes 1–200 |
| `js/color-picker.js` | Custom HSL palette widget |
| `js/errors.js` | User-facing BLE error messages for activity log |
| `manifest.webmanifest` | PWA identity (`/sign-controller/` absolute scope for portfolio install) |
| `icons/` | Install / home-screen icons (from Neon Attack `logo.png`) |
| `sw.js` | Offline cache |
| `logo.png` | Neon Attack official mark (header + icon source) |
| `scripts/generate-icons.mjs` | Regenerate icons from `logo.png` |

## UI Rebuild v2 (2026-06-29)

Locked layout decisions for the from-scratch HTML/CSS rebuild. Tokens and north star unchanged; this section supersedes conflicting notes in older IA diagrams above.

### Header

- **Visible:** Neon Attack logo + "FloRo" brand, vertical-dots menu (`#btn-menu`) only.
- **Hidden:** `#status-chip` is `sr-only` (screen reader + ID contract). Connection state surfaces on the **Connect** quick-action chip (`#quick-settings`), green when connected via `updateConnectQuickAction()`.

### Hero

- Arc gauge (`#scene-gauge`) + vertical **Static** / **Dynamic** mode rail (display labels; internal IDs remain `mode-seg-solid` / `mode-seg-animation`).
- Quick actions row: Color, Modes, Add, Connect.

### Remote dock (`#remote-dock`)

- **Scrollable panel** with `flex: 1; min-height: 0; overflow-y: auto` on `.remote-panel`. Power CTA pinned at dock bottom (`flex-shrink: 0`). No toolbar power mirror.
- **Static tab:** `.solid-layout` flex row - brightness remote column ~22% left, neon color card ~78% right (side by side, never stacked).
  - Brightness: vertical remote rail (up/down steps, sun readout, 8-segment tap track + accent fill) + hidden range input for BLE sync.
  - Neon color: 4×2 swatch grid, Custom color + Save preset actions below (grid, not overlapping swatches).
  - Color presets: 3-column `.preset-row--solid` grid; labels truncated to 6 chars via `truncatePresetLabel()`.
- **Dynamic tab:** brightness + speed slider cards, mode picker card, horizontal-scroll `.preset-row--anim` for favorites.
- **Power:** single `#power-btn.power-cta` mint pill at dock bottom only.

### Overflow contract

- `.app-shell`: `height: 100dvh; overflow: hidden` column flex.
- Hero compacts via `max-height` + smaller `--gauge-size` at ≤915px and ≤740px height (OnePlus 12 / short Android).
- Connect strip (`#connect-prompt`) stays mint-accented; not retinted to selected neon.
- Install banner: fixed overlay outside `.app-shell`, `z-index: 70`.

### Contrast

- `--accent-on` (computed in `accentOnColor()`) for readable text on accent-filled controls, chips, and mode rail active state.

### Unchanged JS contracts

- All 65 IDs in `scripts/check-ids.sh`.
- `syncSceneGauge()`, `updateConnectQuickAction()`, `updateNeonThemeColor()`, `truncatePresetLabel()` behavior preserved.
- Service worker cache bumped (`floro-controller-v47`) on static asset change.

## Decisions Log

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-23 | Ground-up IA: mode-specific views + settings sheet | User chose full IA redesign over reskin; matches Hue/Home remote patterns |
| 2026-06-23 | Premium hardware remote as north star | Differentiates from generic BLE panels; drives compact main + hidden infra |
| 2026-06-23 | iOS 16 dark grouped aesthetic | Native feel on primary target (Chrome Android + iOS PWA install) |
| 2026-06-23 | Accent `#ff007f` with dynamic color sync | FloRo brand pink default; UI glows selected neon color |
| 2026-06-23 | Collapsible custom palette | Keeps solid view scannable; power users expand HSL picker |
| 2026-06-23 | Auto-reconnect on load | Remote should "just work" when sign is in range |
| 2026-06-23 | Activity log in settings only | Debug visibility without polluting main remote surface |
| 2026-06-23 | Deploy at `/sign-controller/` via portfolio rewrite | Keeps rawshn.com namespace clean; separate Vercel project for static PWA |
| 2026-06-29 | Android install banner fallback + 7-day dismiss TTL | `beforeinstallprompt` is unreliable on some Android builds; fallback banner + timed dismiss prevents permanent hide after accidental tap |
| 2026-06-29 | Fixed install overlay outside shell | Shipped `#install-banner` at z-70; do not move into `.app-shell` flex (UX review 2026-06-29) |
| 2026-06-29 | Standalone PWA paths (absolute manifest + scoped SW) | `start_url`/`scope`/`id` = `/sign-controller/` like Health Hub `/coach/`; SW uses `__FLORO_PWA_BASE` |
| 2026-06-29 | Neon Attack logo in header + PWA icons | Official `logo.png` branding with FloRo title and `#ff007f` accent; icons regenerated from same source |
| 2026-06-29 | Animation picker IA redesign | Mode hero + searchable scrollable list with number + name; dropdown hidden (a11y fallback only) |
| 2026-06-29 | `js/mode-names.js` curated placeholders | 200 memorable names (mode 1 = Solid Color); APK strings not in repo, replace when available |
| 2026-06-29 | IEC power icon in toolbar | Universal power symbol (stem + arc) instead of toggle metaphor |
| 2026-06-30 | Mobile install dock always shows Install | Compact bar after **Not now** keeps Install one tap away; Android 2.5s fallback matches Health Hub |
| 2026-06-30 | Bottom-first remote dock layout | Power, tabs, colors, and mode controls in thumb zone; no primary scroll on phone |
| 2026-06-30 | Scene state persistence (`floro_scene_state`) | Restore tab, brightness, speed, color, mode on reconnect and power-on |
| 2026-06-30 | Power-on opens Animation tab | UI aligns with sign output on restore; avoids solid tab while sign animates |
| 2026-06-30 | Quick presets: 4 defaults, empty array respected | Deleted presets never respawn; only fresh install seeds defaults |
| 2026-06-30 | Official Neon Attack icon from APK playstore.png | Header + PWA icons regenerated from APK asset |
| 2026-06-30 | Mode picker + custom color as bottom sheets | Keeps main remote surface compact; lists scroll inside sheets only |
| 2026-06-30 | Save color preset (`floro_color_presets`) | User-named custom colors on Solid tab |
| 2026-06-29 | Mint Remote visual overhaul (planned) | Reference mockups: Sofia Sans, `#41E9BD`, arc gauge, card grid; see `UI_OVERHAUL_PLAN.md` |
| 2026-06-29 | Default accent mint, dynamic retint kept | North star unchanged: UI glows selected neon color |
| 2026-06-29 | Feature Parity Matrix in UI_OVERHAUL_PLAN.md | Every v2.1.0 feature mapped before mint build; devex/QA acceptance contract |
| 2026-06-29 | UI Rebuild v2 from scratch | Clean HTML/CSS; sr-only status chip; Connect quick-action shows connection; 20/80 static layout; scrollable dock; no power mirror; v38 cache |
