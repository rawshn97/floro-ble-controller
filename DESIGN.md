# Design System — FloRo Sign Controller

## Product Context

- **What this is:** A mobile-first PWA for controlling FloRo neon signs over Web Bluetooth. Users connect once, then adjust brightness, color, animation modes, and power as if holding a dedicated hardware remote.
- **Who it's for:** FloRo sign owners on Chrome/Edge (desktop or Android) who want fast, tactile control without a generic developer console feel.
- **Space/industry:** Smart lighting / IoT controller apps (peers: Philips Hue, Govee Home, Apple Home).
- **Project type:** Single-screen utility PWA with installable home-screen behavior.

## North Star

**Premium hardware remote energy** — not a BLE debug panel.

The app should feel like a polished physical remote: compact, confident, mode-driven, with infrastructure (connection, logs, install) tucked away until needed. Every pixel on the main surface earns its place by controlling the sign.

## Information Architecture

One control surface at a time. No scrolling past unrelated modes.

```
┌─────────────────────────────────────┐
│ Header: brand · status chip · ⋮    │  sticky
├─────────────────────────────────────┤
│ Toolbar: [Solid | Animation] · Power│  sticky
├─────────────────────────────────────┤
│                                     │
│   ONE view panel (Solid OR Anim)    │  scrollable
│                                     │
└─────────────────────────────────────┘
         ⋮ / status chip tap
              ↓
┌─────────────────────────────────────┐
│ Settings sheet (bottom modal)       │
│  · Connection                       │
│  · Activity Log                     │
│  · Install App                      │
│  · About                            │
└─────────────────────────────────────┘
```

### Header (`app-header`)

| Element | Role |
|---------|------|
| Brand (logo + "FloRo") | Identity anchor; always visible |
| Status chip | Compact connection state; tap opens settings |
| Menu button (⋮) | Opens settings sheet |

### Mode toolbar (`mode-toolbar`)

| Element | Role |
|---------|------|
| Segmented control | Solid \| Animation — switches the single active view |
| Power strip | Global on/off toggle; always reachable |

### Solid view (`#solid-view`)

Shown when Solid is selected. Contains only solid-color controls:

1. Brightness slider (1–8)
2. Eight neon swatches (4×2 grid)
3. Collapsible "Custom color" disclosure → HSL picker

### Animation view (`#animation-view`)

Shown when Animation is selected. Contains only animation controls:

1. Brightness slider (mirrors solid; same wire value)
2. Speed slider (0–100% UI, inverted for wire protocol)
3. Search field for mode filtering
4. Mode select row (stepper + dropdown)
5. Quick Presets (favorites grid)

### Settings sheet (`#settings-sheet`)

Infrastructure lives here, not on the main surface:

| Section | Contents |
|---------|----------|
| Connection | Device name, status pill, Scan & Connect / Reconnect / Disconnect |
| Activity Log | Monospace console (BLE writes, errors, auto-connect) |
| Install App | PWA install flow |
| About | App name + version |

### Auto-reconnect

On load, if BLE is supported and a previously paired device exists, attempt `reconnectLast()` automatically. Show "Connecting…" in the status chip; fall back to offline state on failure.

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

## Anti-Patterns

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

## PWA / Deployment

- **Production URL:** `https://rawshn.com/sign-controller/`
- **Hosting:** Static files on Vercel project `ble_controller` (`blecontroller.vercel.app`), proxied via `rawshn-portfolio` rewrites
- **Asset paths:** Relative (`./`) — works under subdirectory proxy without code changes
- **Service worker:** `./sw.js`, cache name bumped on asset changes
- **Manifest:** `start_url: "./"`, `scope: "./"` — resolves to `/sign-controller/` when served via rewrite
- **Required header:** `Permissions-Policy: bluetooth=(self)` in `vercel.json`

## File Map

| File | Design responsibility |
|------|----------------------|
| `index.html` | IA structure, ARIA roles, component markup |
| `css/styles.css` | All visual tokens, component styles, motion |
| `js/ui.js` | View transitions, sheet behavior, chip states, theme color |
| `js/app.js` | Mode logic, auto-reconnect, disabled-control toggling |
| `js/color-picker.js` | Custom HSL palette widget |
| `manifest.json` | PWA identity |
| `sw.js` | Offline cache |

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
