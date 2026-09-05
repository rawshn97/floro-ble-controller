# Analytics (Microsoft Clarity)

**Code:** `index.html` (tag loader), `js/clarity.js`, `data-clarity-event` on key controls

## Project

Use the **same Clarity project as rawshn.com** (`yakgofwgk3`). FloRo Remote lives at `/floro-remote/` on the same domain, so a second project would split sessions and double-load tags.

| Filter in Clarity | Value |
|---|---|
| URL path | contains `/floro-remote` |
| Custom tag | `app` = `floro-remote` |
| Smart Events | prefix `sc_` |

Create a separate Clarity project only if FloRo moves to its **own domain** (for example `sign.floro.app`).

## Events

| Event | When |
|---|---|
| `sc_app_open` | App module init |
| `sc_connect_tap` / `sc_reconnect_tap` / `sc_disconnect_tap` | Button clicks (`data-clarity-event`) |
| `sc_tab_static` / `sc_tab_dynamic` | Mode rail |
| `sc_ble_connected` / `sc_ble_disconnected` / `sc_ble_connect_failed` | BLE lifecycle |
| `sc_install_prompt_ready` | Native install button shown |
| `sc_install_tap` | Install button click |
| `sc_install_accepted` / `sc_install_dismissed` / `sc_install_appinstalled` | PWA install flow |

Portfolio docs: `rawshn-portfolio/docs/CLARITY_ANALYTICS.md`.
