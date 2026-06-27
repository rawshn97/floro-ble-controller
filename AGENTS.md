# FloRo Sign Controller — Agent bootstrap

Static PWA (HTML/CSS/JS, no build step) for controlling FloRo neon signs over Web Bluetooth. See `README.md` for the BLE protocol and `DESIGN.md` for UI notes.

## Cursor Cloud specific instructions

- No dependencies to install and no build step — these are static files. Serve from the repo root with any static server, e.g. `python3 -m http.server 8080` → http://localhost:8080.
- Core functionality (connecting to a sign) needs the **Web Bluetooth API**, which requires Chrome/Edge over `https://` or `localhost` **and a physical FloRo device**. The headless cloud browser reports "Web Bluetooth is not available", so the connect flow cannot be exercised end-to-end here — the rest of the UI (tabs, sliders, color picker, activity log) still renders and is interactive, which is enough to verify changes that don't depend on a live BLE link.
