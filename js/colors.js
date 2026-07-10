/** Neon catalog + color label / swatch-type helpers (M3 design system). */

export const NEON_COLORS = [
  { hex: '#ff0000', name: 'Ruby Red', r: 255, g: 0, b: 0 },
  { hex: '#00ff00', name: 'Electric Green', r: 0, g: 255, b: 0 },
  { hex: '#0000ff', name: 'Neon Blue', r: 0, g: 0, b: 255 },
  { hex: '#ffff00', name: 'Sunny Yellow', r: 255, g: 255, b: 0 },
  { hex: '#ff00ff', name: 'Hot Pink', r: 255, g: 0, b: 255 },
  { hex: '#00ffff', name: 'Ice Cyan', r: 0, g: 255, b: 255 },
  { hex: '#a855f7', name: 'Neon Purple', r: 168, g: 85, b: 247 },
  { hex: '#ffffff', name: 'Bright White', r: 255, g: 255, b: 255 },
];

const NEON_BY_HEX = new Map(
  NEON_COLORS.map((c) => [normalizeHex(c.hex), c])
);

export function normalizeHex(hex) {
  if (!hex || typeof hex !== 'string') return '';
  const h = hex.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(h)) return h;
  if (/^[0-9a-f]{6}$/.test(h)) return `#${h}`;
  return h;
}

export function isNeonHex(hex) {
  return NEON_BY_HEX.has(normalizeHex(hex));
}

export function getNeonName(hex) {
  return NEON_BY_HEX.get(normalizeHex(hex))?.name ?? null;
}

export function getSavedPreset(hex, presets = []) {
  const key = normalizeHex(hex);
  return presets.find((p) => normalizeHex(p.hex) === key) ?? null;
}

/** @returns {'neon'|'saved'|'custom'} */
export function getSwatchType(hex, presets = []) {
  if (getSavedPreset(hex, presets)) return 'saved';
  if (isNeonHex(hex)) return 'neon';
  return 'custom';
}

export function getSwatchTypeLabel(hex, presets = []) {
  const type = getSwatchType(hex, presets);
  if (type === 'neon') return 'Neon';
  if (type === 'saved') return 'Saved';
  return 'Custom';
}

export function resolveColorLabel(hex, presets = []) {
  const preset = getSavedPreset(hex, presets);
  if (preset?.label) return preset.label;
  const neon = getNeonName(hex);
  if (neon) return neon;
  return normalizeHex(hex).toUpperCase();
}

export function truncateColorLabel(text, maxLen = 8) {
  if (!text) return '';
  const trimmed = String(text).trim();
  if (trimmed.length <= maxLen) return trimmed;
  return `${trimmed.slice(0, maxLen - 1)}…`;
}

export function swatchTypeClass(hex, presets = []) {
  return `swatch--${getSwatchType(hex, presets)}`;
}
