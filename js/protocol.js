/** Build wire-format color command (green/blue swapped for FloRo LED wiring). */
export function colorCommand(r, g, b) {
  return `C=${r},${b},${g};`;
}

/** Full scene — firmware applies brightness, speed, color, then activates flow mode. */
export function buildSceneCommand({ brightness, speed, r, g, b, mode }) {
  return `B=${brightness};S=${speed};${colorCommand(r, g, b)}M=${mode};`;
}

export function hexToRgb(hex) {
  return {
    r: parseInt(hex.substring(1, 3), 16),
    g: parseInt(hex.substring(3, 5), 16),
    b: parseInt(hex.substring(5, 7), 16),
  };
}
