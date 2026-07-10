const RECENT_KEY = 'floro_recent_colors';
const RECENT_MAX = 8;

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function normalizeHex(hex) {
  if (!hex) return null;
  let h = hex.trim().toLowerCase();
  if (!h.startsWith('#')) h = `#${h}`;
  if (!/^#[0-9a-f]{6}$/.test(h)) return null;
  return h;
}

export function rgbToHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
        break;
      case g:
        h = ((b - r) / d + 2) / 6;
        break;
      default:
        h = ((r - g) / d + 4) / 6;
    }
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

export function hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360;
  s = clamp(s, 0, 100) / 100;
  l = clamp(l, 0, 100) / 100;

  if (s === 0) {
    const v = Math.round(l * 255);
    return { r: v, g: v, b: v };
  }

  const hue2rgb = (p, q, t) => {
    if (t < 0) t += 1;
    if (t > 1) t -= 1;
    if (t < 1 / 6) return p + (q - p) * 6 * t;
    if (t < 1 / 2) return q;
    if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
    return p;
  };

  const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
  const p = 2 * l - q;
  const hk = h / 360;

  return {
    r: Math.round(hue2rgb(p, q, hk + 1 / 3) * 255),
    g: Math.round(hue2rgb(p, q, hk) * 255),
    b: Math.round(hue2rgb(p, q, hk - 1 / 3) * 255),
  };
}

export function hslToHex(h, s, l) {
  const { r, g, b } = hslToRgb(h, s, l);
  return (
    '#' +
    [r, g, b]
      .map((x) => x.toString(16).padStart(2, '0'))
      .join('')
  );
}

function hexToHsl(hex) {
  const n = normalizeHex(hex);
  if (!n) return { h: 0, s: 100, l: 50 };
  const r = parseInt(n.slice(1, 3), 16);
  const g = parseInt(n.slice(3, 5), 16);
  const b = parseInt(n.slice(5, 7), 16);
  return rgbToHsl(r, g, b);
}

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) ? list.filter((h) => normalizeHex(h)).slice(0, RECENT_MAX) : [];
  } catch {
    return [];
  }
}

function saveRecent(list) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
}

function pushRecent(hex) {
  const n = normalizeHex(hex);
  if (!n) return;
  const list = loadRecent().filter((h) => h !== n);
  list.unshift(n);
  saveRecent(list);
  return list;
}

/**
 * Custom HSL color picker: 2D SL area, hue strip, sliders, hex input, recent colors.
 */
export function loadRecentColors() {
  return loadRecent();
}

export function createColorPicker({ root, initialHex = '#ff0000', onColorChange, onColorCommit }) {
  let hsl = hexToHsl(initialHex);
  let currentHex = hslToHex(hsl.h, hsl.s, hsl.l);
  let recent = loadRecent();
  let commitTimer = null;
  let suppressEvents = false;

  root.innerHTML = `
    <div class="color-picker-header">
      <span class="color-picker-label">Custom Palette</span>
      <div class="color-preview-wrap">
        <div class="color-preview-swatch" aria-hidden="true"></div>
        <span class="color-preview-hex"></span>
      </div>
    </div>
    <div class="color-pick-2d" role="slider" aria-label="Saturation and lightness" tabindex="0">
      <div class="color-pick-2d-bg"></div>
      <div class="color-pick-2d-cursor"></div>
    </div>
    <div class="hue-strip-row">
      <span class="slider-mini-label">Hue</span>
      <div class="hue-strip-track">
        <input type="range" class="hue-range" min="0" max="360" value="0" aria-label="Hue">
      </div>
    </div>
    <div class="hsl-sliders">
      <div class="hsl-slider-row">
        <span class="slider-mini-label">H</span>
        <input type="range" class="hsl-range hsl-h" min="0" max="360" value="0">
        <span class="hsl-val hsl-h-val">0°</span>
      </div>
      <div class="hsl-slider-row">
        <span class="slider-mini-label">S</span>
        <input type="range" class="hsl-range hsl-s" min="0" max="100" value="100">
        <span class="hsl-val hsl-s-val">100%</span>
      </div>
      <div class="hsl-slider-row">
        <span class="slider-mini-label">L</span>
        <input type="range" class="hsl-range hsl-l" min="0" max="100" value="50">
        <span class="hsl-val hsl-l-val">50%</span>
      </div>
    </div>
    <div class="hex-row">
      <label class="hex-label" for="color-hex-input">HEX</label>
      <input type="text" id="color-hex-input" class="hex-input" maxlength="7" spellcheck="false" autocomplete="off" inputmode="text">
    </div>
    <div class="recent-colors-section">
      <span class="recent-label">Recent</span>
      <div class="recent-swatches"></div>
    </div>
  `;

  const previewSwatch = root.querySelector('.color-preview-swatch');
  const previewHex = root.querySelector('.color-preview-hex');
  const pick2d = root.querySelector('.color-pick-2d');
  const pick2dBg = root.querySelector('.color-pick-2d-bg');
  const pick2dCursor = root.querySelector('.color-pick-2d-cursor');
  const hueRange = root.querySelector('.hue-range');
  const hRange = root.querySelector('.hsl-h');
  const sRange = root.querySelector('.hsl-s');
  const lRange = root.querySelector('.hsl-l');
  const hVal = root.querySelector('.hsl-h-val');
  const sVal = root.querySelector('.hsl-s-val');
  const lVal = root.querySelector('.hsl-l-val');
  const hexInput = root.querySelector('.hex-input');
  const recentGrid = root.querySelector('.recent-swatches');

  function flushCommit() {
    if (commitTimer) {
      clearTimeout(commitTimer);
      commitTimer = null;
    }
    pushRecent(currentHex);
    recent = loadRecent();
    renderRecent();
    onColorCommit?.(currentHex);
  }

  function scheduleCommit() {
    if (commitTimer) clearTimeout(commitTimer);
    commitTimer = setTimeout(flushCommit, 150);
  }

  function updateFromHsl({ commit = true } = {}) {
    currentHex = hslToHex(hsl.h, hsl.s, hsl.l);

    previewSwatch.style.background = currentHex;
    previewSwatch.style.boxShadow = `0 0 16px ${currentHex}66`;
    previewHex.textContent = currentHex.toUpperCase();

    pick2dBg.style.backgroundColor = `hsl(${hsl.h}, 100%, 50%)`;
    pick2dCursor.style.left = `${hsl.s}%`;
    pick2dCursor.style.top = `${100 - hsl.l}%`;
    pick2dCursor.style.background = currentHex;

    hueRange.value = hsl.h;
    hRange.value = hsl.h;
    sRange.value = hsl.s;
    lRange.value = hsl.l;
    hVal.textContent = `${hsl.h}°`;
    sVal.textContent = `${hsl.s}%`;
    lVal.textContent = `${hsl.l}%`;
    hexInput.value = currentHex.toUpperCase();

    if (!suppressEvents) {
      onColorChange?.(currentHex);
      if (commit) scheduleCommit();
    }
  }

  function setHsl(next, opts = {}) {
    hsl = {
      h: clamp(Math.round(next.h), 0, 360),
      s: clamp(Math.round(next.s), 0, 100),
      l: clamp(Math.round(next.l), 0, 100),
    };
    updateFromHsl(opts);
  }

  function renderRecent() {
    recentGrid.innerHTML = '';
    if (recent.length === 0) {
      const empty = document.createElement('span');
      empty.className = 'recent-empty';
      empty.textContent = 'Pick a color to save here';
      recentGrid.appendChild(empty);
      return;
    }

    recent.forEach((hex) => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'recent-swatch';
      btn.style.background = hex;
      btn.title = hex.toUpperCase();
      btn.setAttribute('aria-label', hex);
      btn.addEventListener('click', () => {
        suppressEvents = false;
        setHsl(hexToHsl(hex));
      });
      recentGrid.appendChild(btn);
    });
  }

  function pickFrom2d(clientX, clientY) {
    const rect = pick2d.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((clientY - rect.top) / rect.height, 0, 1);
    setHsl({ h: hsl.h, s: Math.round(x * 100), l: Math.round((1 - y) * 100) });
  }

  let dragging2d = false;

  function onPointerDown(e) {
    dragging2d = true;
    pick2d.setPointerCapture(e.pointerId);
    pickFrom2d(e.clientX, e.clientY);
  }

  function onPointerMove(e) {
    if (!dragging2d) return;
    pickFrom2d(e.clientX, e.clientY);
  }

  function onPointerUp(e) {
    if (!dragging2d) return;
    dragging2d = false;
    try {
      pick2d.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
    flushCommit();
  }

  pick2d.addEventListener('pointerdown', onPointerDown);
  pick2d.addEventListener('pointermove', onPointerMove);
  pick2d.addEventListener('pointerup', onPointerUp);
  pick2d.addEventListener('pointercancel', onPointerUp);

  pick2d.addEventListener('keydown', (e) => {
    let { h, s, l } = hsl;
    const step = e.shiftKey ? 10 : 2;
    switch (e.key) {
      case 'ArrowLeft':
        s = clamp(s - step, 0, 100);
        break;
      case 'ArrowRight':
        s = clamp(s + step, 0, 100);
        break;
      case 'ArrowUp':
        l = clamp(l + step, 0, 100);
        break;
      case 'ArrowDown':
        l = clamp(l - step, 0, 100);
        break;
      default:
        return;
    }
    e.preventDefault();
    setHsl({ h, s, l });
  });

  hueRange.addEventListener('input', (e) => {
    setHsl({ ...hsl, h: parseInt(e.target.value, 10) });
  });

  hRange.addEventListener('input', (e) => {
    setHsl({ ...hsl, h: parseInt(e.target.value, 10) });
  });

  sRange.addEventListener('input', (e) => {
    setHsl({ ...hsl, s: parseInt(e.target.value, 10) });
  });

  lRange.addEventListener('input', (e) => {
    setHsl({ ...hsl, l: parseInt(e.target.value, 10) });
  });

  function commitHexInput() {
    const parsed = normalizeHex(hexInput.value);
    if (!parsed) {
      hexInput.value = currentHex.toUpperCase();
      hexInput.classList.add('hex-invalid');
      setTimeout(() => hexInput.classList.remove('hex-invalid'), 400);
      return;
    }
    setHsl(hexToHsl(parsed));
  }

  hexInput.addEventListener('change', commitHexInput);
  hexInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitHexInput();
      hexInput.blur();
    }
  });

  renderRecent();
  suppressEvents = true;
  updateFromHsl({ commit: false });
  suppressEvents = false;

  return {
    getHex: () => currentHex,
    commitNow() {
      flushCommit();
    },
    setHex(hex, { commit = false } = {}) {
      const n = normalizeHex(hex);
      if (!n) return;
      suppressEvents = true;
      setHsl(hexToHsl(n), { commit: false });
      suppressEvents = false;
      onColorChange?.(currentHex);
      if (commit) {
        pushRecent(currentHex);
        recent = loadRecent();
        renderRecent();
        onColorCommit?.(currentHex);
      }
    },
  };
}
