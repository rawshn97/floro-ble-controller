# FloRo Sign Controller: agent bootstrap

Static PWA (HTML/CSS/JS, no build step) for controlling FloRo neon signs over Web Bluetooth. See `README.md` for setup, `SPEC.md` for the project spec, and `DESIGN.md` for UI notes.

## Local serve

No dependencies and no build step. From the repo root:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080

## Cursor Cloud

Core functionality (connecting to a sign) needs the **Web Bluetooth API**, which requires Chrome/Edge over `https://` or `localhost` **and a physical FloRo device**. The headless cloud browser reports "Web Bluetooth is not available", so the connect flow cannot be exercised end-to-end here. The rest of the UI (tabs, sliders, color picker, activity log) still renders and is interactive, which is enough to verify changes that do not depend on a live BLE link.

PWA install (`beforeinstallprompt`) also does not fire in Cursor's embedded browser. Verify install on Chrome or Edge against https://rawshn.com/sign-controller/.

## Deploy

Production is https://rawshn.com/sign-controller/ via the `rawshn-portfolio` submodule. After changes on `main`:

```bash
bash scripts/deploy.sh
```
