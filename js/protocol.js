/** Build wire-format color command (green/blue swapped for FloRo LED wiring). */
export function colorCommand(r, g, b) {
  return `C=${r},${b},${g};\n`;
}

/** key=value commands from floro_page.dart (B=, S=, C=) terminate with ;\\n */
export function kvCommand(key, value) {
  return `${key}=${value};\n`;
}

/** Map UI speed (0% slow, 100% fast) to sign wire value (higher = slower). */
export function uiSpeedToBle(uiSpeed) {
  return 100 - uiSpeed;
}

/**
 * Animation mode (Neon Attack demo111): interpolate "M" + mode + "\\n".
 * No equals sign or semicolon: e.g. M32\\n not M=32;
 */
export function modeCommand(mode) {
  return `M${mode}\n`;
}

/** Normalize a command body to the wire bytes the firmware expects. */
export function wrapWireCommand(body) {
  const trimmed = body.trim();
  if (/^M\d+$/i.test(trimmed)) {
    return `${trimmed}\n`;
  }
  if (trimmed.endsWith(';\n')) return trimmed;
  if (trimmed.endsWith(';')) return `${trimmed}\n`;
  return `${trimmed};\n`;
}

/** Full scene: brightness, speed, color, then mode. */
export function buildSceneCommand({ brightness, speed, r, g, b, mode }) {
  const wireSpeed = uiSpeedToBle(speed);
  return `${kvCommand('B', brightness)}${kvCommand('S', wireSpeed)}${colorCommand(r, g, b)}${modeCommand(mode)}`;
}

export function hexToRgb(hex) {
  const normalized = typeof hex === 'string' ? hex.trim() : '';
  if (!/^#[0-9a-fA-F]{6}$/.test(normalized)) {
    return { r: 255, g: 0, b: 0 };
  }
  return {
    r: parseInt(normalized.substring(1, 3), 16),
    g: parseInt(normalized.substring(3, 5), 16),
    b: parseInt(normalized.substring(5, 7), 16),
  };
}
