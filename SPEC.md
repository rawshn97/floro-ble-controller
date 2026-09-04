# FloRo Sign Controller: Technical Specification (index)

**Repo:** `ItsRRM97/floro-ble-controller` (GitHub also redirects to `rawshn97/floro-ble-controller`) · **Branch:** `main`  
**Canonical URL:** https://rawshn.com/sign-controller/  
**Audience:** product, developers, and agents

This file is the **entrypoint**. Shipped contracts live under [`specs/`](specs/). Edit the feature file you care about; keep this index short.

| Doc | Role |
|-----|------|
| **[SPEC.md](SPEC.md)** (this file) | Index + reading order |
| **[specs/](specs/)** | Shipped per-feature specs |
| **[SPEC_IN_PROGRESS.md](SPEC_IN_PROGRESS.md)** | Future / not shipped |
| **[README.md](README.md)** | Setup and BLE command table |
| **[DESIGN.md](DESIGN.md)** | Visual IA, tokens, anti-patterns |
| **[docs/PROTOCOL.md](docs/PROTOCOL.md)** | Reverse-engineered Neon Attack UART |
| **[AGENTS.md](AGENTS.md)** | Agent bootstrap (no build step, Cloud limits) |

---

## Spec map

| Spec | Feature | Path |
|------|---------|------|
| [specs/overview.md](specs/overview.md) | Purpose, stack, layout, deploy | (repo) |
| [specs/ble.md](specs/ble.md) | Web Bluetooth, command queue, reconnect, wire format | `js/ble.js`, `js/protocol.js` |
| [specs/pwa.md](specs/pwa.md) | Installable PWA, service worker, install prompt | `manifest.webmanifest`, `sw.js`, `js/pwa-install.js` |

**PM tip:** change one feature → edit that one file under `specs/`. Unshipped ideas → `SPEC_IN_PROGRESS.md`.

---

## Capabilities (at a glance)

| Feature | Summary |
|---------|---------|
| **Sign remote** | Solid color + 200 animation modes, brightness 1–8, speed, favorites, scene restore |
| **BLE** | Nordic UART to FloRo / Neon Attack firmware; Chrome/Edge, HTTPS or localhost |
| **PWA** | Installable at `/sign-controller/`; native install when the browser offers it |
| **Deploy** | Static files vendored into `rawshn-portfolio` `public/sign-controller/` |

---

## Document history

| Date | Change |
|------|--------|
| 2026-09-05 | Initial spec split (overview, BLE, PWA) plus PWA install reimplementation |
