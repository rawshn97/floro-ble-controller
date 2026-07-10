const STORAGE_KEY_SCENE = 'floro_scene_state';

const SCENE_DEFAULTS = {
  displayView: 'animation',
  isPoweredOn: true,
  brightness: 8,
  speed: 50,
  color: '#ff0000',
  activeMode: 1,
  lastAnimationMode: 32,
};

let saveTimer = null;

export function getSceneDefaults() {
  return { ...SCENE_DEFAULTS };
}

export function loadSceneState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_SCENE);
    if (!raw) return getSceneDefaults();

    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return getSceneDefaults();

    const state = { ...SCENE_DEFAULTS, ...parsed };
    state.brightness = clampInt(state.brightness, 1, 8, SCENE_DEFAULTS.brightness);
    state.speed = clampInt(state.speed, 0, 100, SCENE_DEFAULTS.speed);
    state.activeMode = clampInt(state.activeMode, 1, 200, SCENE_DEFAULTS.activeMode);
    state.lastAnimationMode = clampInt(state.lastAnimationMode, 2, 200, SCENE_DEFAULTS.lastAnimationMode);
    state.displayView = state.displayView === 'animation' ? 'animation' : 'solid';
    state.isPoweredOn = Boolean(state.isPoweredOn);
    state.color = typeof state.color === 'string' && /^#[0-9a-f]{6}$/i.test(state.color)
      ? state.color.toLowerCase()
      : SCENE_DEFAULTS.color;

    if (state.displayView === 'solid') {
      state.activeMode = 1;
    } else if (state.activeMode === 1) {
      state.activeMode = state.lastAnimationMode;
    }

    return state;
  } catch {
    return getSceneDefaults();
  }
}

export function saveSceneState(snapshot) {
  try {
    localStorage.setItem(STORAGE_KEY_SCENE, JSON.stringify(snapshot));
  } catch {
    /* storage full or private mode */
  }
}

export function scheduleSceneSave(getSnapshot, delayMs = 150) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    saveTimer = null;
    saveSceneState(getSnapshot());
  }, delayMs);
}

export function flushSceneSave(getSnapshot) {
  if (saveTimer) {
    clearTimeout(saveTimer);
    saveTimer = null;
  }
  saveSceneState(getSnapshot());
}

function clampInt(value, min, max, fallback) {
  const num = Number(value);
  if (!Number.isFinite(num)) return fallback;
  return Math.min(max, Math.max(min, Math.round(num)));
}
