// Small colour helpers so shading works on any body colour the player picks.

function parse(hex: string): [number, number, number] {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function toHex([r, g, b]: [number, number, number]): string {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
}

/** Blend `a` toward `b` by `t` (0 = a, 1 = b). */
export function mix(a: string, b: string, t: number): string {
  const x = parse(a)
  const y = parse(b)
  return toHex([x[0] + (y[0] - x[0]) * t, x[1] + (y[1] - x[1]) * t, x[2] + (y[2] - x[2]) * t])
}

/**
 * The one darker shade a body face gets (docs/ART.md). Blending toward a warm
 * rose keeps every body colour cosy: yellow goes apricot, white goes blush,
 * sky goes lavender, instead of the grey-brown a plain darken gives.
 */
export function bodyShade(colour: string): string {
  return mix(colour, '#C2577A', 0.2)
}
