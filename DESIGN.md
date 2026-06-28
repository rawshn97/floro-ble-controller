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

**The UI glows the color on the sign.** Default accent is FloRo pink (`#ff007f`), but when the user picks a solid neon color, `updateNeonThemeColor()` retints `--accent`, slider values, swatch rings, and control-card borders to match. The remote feels physically linked to the light it controls.

## Information Architecture

Bottom-first remote layout. Primary controls live in the thumb zone; header is status-only chrome.

```
┌─────────────────────────────────────┐
│ Header: logo · status chip · ⋮    │  compact (~44px)
├─────────────────────────────────────┤
│                                     │
│   Preview (optional, low emphasis)  │  flex; hidden on short screens
│                                     │
├─────────────────────────────────────┤
│ REMOTE DOCK (thumb zone)            │
│  [Solid | Animation]  [Power]       │
│  Brightness (+ Speed on Anim)       │
│  Color grid OR mode picker + presets│
│  [Custom color] [Save color preset] │
├─────────────────────────────────────┤
│ Install dock (when not standalone)  │
└─────────────────────────────────────┘
         ⋮ / status chip tap
              ↓
┌─────────────────────────────────────┐
│ Settings sheet                      │
│ Mode picker sheet (animation)       │
│ Custom color sheet (solid)          │
└─────────────────────────────────────┘
```

### Header (`app-header-compact`)

| Element | Role |
|---------|------|
| Neon Attack logo + "FloRo" | Compact brand mark |
| Status chip | Connection state; tap opens settings |
| Menu button (⋮) | Opens settings sheet |

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
| **Header** | `.app-header` | Sticky top chrome: brand, status chip, settings menu. Frosted black blur, 48px min height + safe-area top. |
| **Mode toolbar** | `.mode-toolbar` | Sticky below header: Solid \| Animation segmented control + Power switch. Stays visible while view scrolls. |
| **View stage** | `.view-stage` | Single active panel (`#solid-view` or `#animation-view`). 280px min height; horizontal slide transition between modes. |
| **Install dock** | `#install-banner.install-dock` | Bottom of `.app-shell` flex column (not floating overlay). Mobile: always shows Install until standalone; dismiss collapses to compact bar. |
| **Sheets** | `.sheet-overlay` + `.modal-sheet` | Bottom sheets for settings, install, and save-favorite. Backdrop blur; body scroll locked via `body.sheet-open`. |

Main content (`.app-main`) is max-width 500px, centered, with optional compat banner above the view stage.

## Aesthetic Direction

- **Direction:** Brutally Minimal + Luxury/Refined hybrid — iOS 16 dark grouped surfaces with neon accent glow
- **Decoration level:** Intentional — subtle glass blur on sticky chrome, neon border glow on active color panels
- **Mood:** Confident, tactile, night-mode native. Like holding a matte-black remote with one hot-pink LED indicator.
- **Reference patterns:**
  - **Philips Hue:** Mode-first surfaces, segmented room/scene switching, brightness always near the top
  - **Govee Home:** Compact preset grids, speed + brightness paired in effect mode
  - **Apple Home:** Grouped list cards, sheet modals for settings, system green/red status semantics

## Typography

- **Display/Hero:** SF Pro Text (system) — `-apple-system, BlinkMacSystemFont, 'SF Pro Text', system-ui, sans-serif`
- **Body:** Same stack at 17px base — matches iOS body text size for thumb-friendly legibility
- **UI/Labels:** 13px semibold uppercase eyebrows; 15px control labels
- **Data/Console:** `ui-monospace, 'SF Mono', Menlo, monospace` at 11px for activity log
- **Scale:**

| Token | Size | Weight | Use |
|-------|------|--------|-----|
| Title | 20px | 700 | Sheet titles |
| Body | 17px | 400 | Default text, buttons |
| Label | 15px | 500 | Control labels, slider values |
| Eyebrow | 13px | 600 | Section headers, uppercase |
| Caption | 11–12px | 600 | Status pills, console |

## Color

- **Approach:** Restrained — one dynamic neon accent; system semantics for status

### Core palette (CSS custom properties in `css/styles.css`)

| Token | Value | Use |
|-------|-------|-----|
| `--bg-primary` | `#000000` | Page background |
| `--bg-grouped` | `#1c1c1e` | Control cards |
| `--bg-secondary` | `#2c2c2e` | Settings cards |
| `--bg-tertiary` | `#3a3a3c` | Segmented active segment, fills |
| `--label-primary` | `#ffffff` | Primary text |
| `--label-secondary` | `rgba(235,235,245,0.6)` | Secondary text |
| `--label-tertiary` | `rgba(235,235,245,0.3)` | Placeholders, chevrons |
| `--accent` / `--neon-glow` | `#ff007f` | Default FloRo pink; updates with selected color |
| `--accent-rgba` | `rgba(255,0,127,0.35)` | Glow, selected swatch ring |
| `--accent-muted` | `rgba(255,0,127,0.15)` | Active favorite chip fill |
| `--system-green` | `#30d158` | Connected, power on |
| `--system-red` | `#ff453a` | Offline, destructive |
| `--system-blue` | `#0a84ff` | Info log entries |
| `--system-orange` | `#ff9f0a` | Connecting pulse |

### Dynamic accent

When a solid color is selected, `updateNeonThemeColor()` in `js/ui.js` propagates the chosen hex to `--accent`, `--neon-glow`, and control-card border/shadow. The UI literally glows the current neon color.

### Dark mode

Dark-only. No light theme. Surfaces use iOS grouped dark hierarchy; no pure white backgrounds except slider thumbs and switch knobs.

## Spacing

- **Base unit:** 4px
- **Density:** Compact — optimized for one-handed phone use
- **Max content width:** 500px centered
- **Key spacing:**

| Context | Value |
|---------|-------|
| Header/toolbar horizontal padding | 16px |
| Main padding | 12px 16px + safe-area |
| Card internal padding | 14px 16px |
| Gap between cards / view sections | 12px |
| Swatch grid gap | 10px |

## Layout

- **Approach:** Grid-disciplined single column
- **Sticky chrome:** Header + mode toolbar stay fixed while view content scrolls
- **Border radius scale:**

| Token | Value | Use |
|-------|-------|-----|
| `--radius-sm` | 8px | Logo, small chips |
| `--radius-md` | 12px | Swatches, inputs, buttons |
| `--radius-lg` | 14px | Control cards |
| `--radius-xl` | 20px | Sheet top corners |

## Motion

- **Approach:** Intentional — transitions aid comprehension without spectacle
- **Easing:** `--spring: 0.25s cubic-bezier(0.25, 0.1, 0.25, 1)`; switch knob uses `--spring-bounce`
- **Key animations:**

| Interaction | Duration | Behavior |
|-------------|----------|----------|
| View switch (Solid ↔ Animation) | 280ms | Outgoing panel slides left + fades; incoming slides in |
| Settings sheet open | 350ms | Slide up from bottom (`sheet-up` keyframe) |
| Status chip connecting | 1s loop | Orange dot pulse |
| Palette disclosure | 350ms | Chevron rotate + max-height expand |
| Button press | instant | `scale(0.97)` + opacity dip |
| Reduced motion | — | All animations collapse to 0.01ms via `prefers-reduced-motion` |

## Component Rules

### Status chip (`status-chip`)

- States: `chip-offline`, `chip-connecting`, `chip-connected`, `chip-error`
- Truncate device names beyond 14 characters
- Tapping opens settings sheet (same as menu button)
- Never show raw BLE UUIDs or debug strings

### Segmented control (`seg-control`)

- Exactly two segments for display mode: Solid | Animation
- Use `role="tablist"` / `role="tab"` / `role="tabpanel"` for accessibility
- Active segment gets `--bg-tertiary` fill + subtle shadow

### Control cards (`control-card`)

- Grouped iOS card on `--bg-grouped`
- Disabled state: `disabled-control` class → 45% opacity, no pointer events
- When connected, cards receive dynamic neon border glow from active color

### Sliders (`ios-slider`)

- Always show live value in `--accent` to the right (e.g. `8 / 8`, `50%`)
- 28px thumb, 4px track — large enough for thumbs

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
| `btn-primary` | Scan & Connect, Save, Install |
| `btn-secondary` | Reconnect, Done, Cancel |
| `btn-destructive` | Disconnect |
| `btn-text` | Add favorite (accent text, no fill) |
| `btn-step` | ± mode stepper (44×44px) |

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

## Do / Don't (Anti-Patterns)

Do **not** introduce these — they break the premium-remote feel:

| Anti-pattern | Why it's wrong |
|--------------|----------------|
| BLE debug console on main screen | Feels like a developer tool, not a remote |
| Showing Solid + Animation controls simultaneously | Violates mode-first IA; creates scroll fatigue |
| Large "Connect" hero on launch | Connection is secondary; status chip + auto-reconnect handle it |
| Native `<input type="color">` | Awkward on mobile; use HSL picker in collapsed disclosure |
| Purple/violet gradient accents | Generic AI slop; FloRo pink (`#ff007f`) is the brand anchor |
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
- **Asset paths:** `manifest.json` uses absolute `/sign-controller/` paths (matches Health Hub `/coach/` pattern for standalone install). Page assets use `./` with `<base href>` for subdirectory resolution.
- **Display:** `standalone` with `display_override: ["standalone", "minimal-ui"]`
- **Meta:** `mobile-web-app-capable` + `apple-mobile-web-app-capable`; `apple-mobile-web-app-title` = FloRo
- **Icons:** Neon Attack `logo.png`; regenerate via `node scripts/generate-icons.mjs`
- **Service worker:** `${__FLORO_PWA_BASE}sw.js` with matching scope; cache `floro-controller-v23`
- **Install prompt:** Bottom install dock; mobile Install always visible until standalone; Android 2.5s fallback
- **Required header:** `Permissions-Policy: bluetooth=(self)` in `vercel.json`

## File Map

| File | Design responsibility |
|------|----------------------|
| `index.html` | IA structure, ARIA roles, component markup |
| `css/styles.css` | All visual tokens, component styles, motion |
| `js/ui.js` | View transitions, sheet behavior, chip states, theme color, install dock, mode list filter |
| `js/state.js` | Scene persistence (localStorage) |
| `js/app.js` | Mode logic, auto-reconnect, remote dock, color presets |
| `js/mode-names.js` | Curated friendly names for modes 1–200 |
| `js/color-picker.js` | Custom HSL palette widget |
| `manifest.json` | PWA identity (`/sign-controller/` absolute scope for portfolio install) |
| `icons/` | Install / home-screen icons (from Neon Attack `logo.png`) |
| `sw.js` | Offline cache |
| `logo.png` | Neon Attack official mark (header + icon source) |
| `scripts/generate-icons.mjs` | Regenerate icons from `logo.png` |

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
| 2026-06-29 | Bottom install dock in app shell | Matches Coach PWA pattern: persistent mobile Install, not a dismissible floating chip |
| 2026-06-29 | Standalone PWA paths (absolute manifest + scoped SW) | `start_url`/`scope`/`id` = `/sign-controller/` like Health Hub `/coach/`; SW uses `__FLORO_PWA_BASE` |
| 2026-06-29 | Neon Attack logo in header + PWA icons | Official `logo.png` branding with FloRo title and `#ff007f` accent; icons regenerated from same source |
| 2026-06-29 | Animation picker IA redesign | Mode hero + searchable scrollable list with number + name; dropdown hidden (a11y fallback only) |
| 2026-06-29 | `js/mode-names.js` curated placeholders | 200 memorable names (mode 1 = Solid Color); APK strings not in repo, replace when available |
| 2026-06-29 | IEC power icon in toolbar | Universal power symbol (stem + arc) instead of toggle metaphor |
| 2026-06-30 | Mobile install dock always shows Install | Compact bar after **Not now** keeps Install one tap away; Android 2.5s fallback matches Health Hub |
| 2026-06-30 | Bottom-first remote dock layout | Power, tabs, colors, and mode controls in thumb zone; no primary scroll on phone |
| 2026-06-30 | Scene state persistence (`floro_scene_state`) | Restore tab, brightness, speed, color, mode on reconnect and power-on |
| 2026-06-30 | Quick presets: 4 defaults, empty array respected | Deleted presets never respawn; only fresh install seeds defaults |
| 2026-06-30 | Official Neon Attack icon from APK playstore.png | Header + PWA icons regenerated from APK asset |
| 2026-06-30 | Mode picker + custom color as bottom sheets | Keeps main remote surface compact; lists scroll inside sheets only |
| 2026-06-30 | Save color preset (`floro_color_presets`) | User-named custom colors on Solid tab |
