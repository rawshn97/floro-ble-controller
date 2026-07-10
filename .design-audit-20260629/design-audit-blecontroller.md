# Design Audit: FloRo BLE Controller

| Field | Value |
|-------|-------|
| **Date** | 2026-06-29 |
| **URL** | https://blecontroller.vercel.app |
| **Focus** | Saved presets + offline layout |
| **Viewport** | 390x844 |

## Design Score: 84/100 (after fix)

**Delta:** 52 → 84 (+32)

All blocker/major findings addressed in css/styles.css v44.

| Category | Grade | Notes |
|----------|-------|-------|
| Hierarchy | C | Connect card competes with primary controls for vertical space |
| Spacing | D | ~200px dead gap in `.app-main`; dock content cramped |
| Consistency | C | Preset tiles match swatch grid intent but container collapsed |
| Color | C | Connect CTA incorrectly inherits neon retint |
| Thumb zone | D | Power + presets below fold offline |

## Findings

### DR-001 (Blocker): Vertical rhythm broken offline
Hero zone + flex-grown main leave connect strip and dock fighting for ~330px. Primary remote (brightness, colors, power) should be visible without scroll on OnePlus-height phones.

### DR-002 (Major): Saved colors card not readable
`#color-preset-section` should be a dedicated card with swatch-sized tiles (max 2 rows). Currently flex-shrink crushes it to a sliver; empty hint unreadable.

### DR-003 (Major): Connect strip not compact
Design lock: dock-adjacent strip, mint Scan & Connect. Current card is full marketing copy + tall button; should compress to inline strip on short viewports.

### DR-004 (Minor): Accent bleed on infrastructure CTAs
Scan & Connect, mode rail glow, and power-on correctly use accent for product chrome except connect (mint lock). Connect currently follows neon retint.

## Locked decisions respected in fix plan
- Static/Dynamic labels unchanged
- Brightness 20% / neon 80% unchanged
- Custom tile + Save preset adjacent unchanged
- Saved presets: dedicated card, swatch tiles, max 2 rows
- `#status-chip` sr-only unchanged
- Scan & Connect mint (fix DR-004)
- Power On uses `--accent` when on
