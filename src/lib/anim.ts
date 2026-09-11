/**
 * Scrub-safe animation helpers.
 *
 * THE RULE for every scroll-driven visual on this site: it must be a PURE
 * FUNCTION OF PROGRESS. The sections are scrubbed, so the user will drag them
 * backwards, and anything that accumulates between frames — an integrated
 * velocity, a trail, a physics step, a "last value" — cannot retrace its own path
 * and will desynchronise the moment the scroll reverses.
 *
 * If you are about to store a value between frames in order to animate something,
 * the design is wrong. Express it as f(progress) instead.
 *
 * The one permitted exception is an additive `uTime` wander term: it is reversible
 * in the sense that it never feeds back into itself, and it only ever perturbs a
 * position that progress already determined.
 *
 * Camera damping is the other deliberate exception — it is a display filter over a
 * target that is itself a pure function of progress, so it converges to the same
 * place from either scroll direction.
 */

/** Hermite interpolation between two edges. Matches GLSL smoothstep. */
export function smoothstep(edge0: number, edge1: number, x: number): number {
  const t = clamp((x - edge0) / (edge1 - edge0 || 1e-6), 0, 1)
  return t * t * (3 - 2 * t)
}

export function clamp(x: number, min: number, max: number): number {
  return x < min ? min : x > max ? max : x
}

/** Linear remap of `x` from [inMin,inMax] onto [outMin,outMax], clamped. */
export function remap(
  x: number,
  inMin: number,
  inMax: number,
  outMin = 0,
  outMax = 1,
): number {
  return outMin + clamp((x - inMin) / (inMax - inMin || 1e-6), 0, 1) * (outMax - outMin)
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t
}

/**
 * A narrow bell centred on `at`. Used for the bloom spike at the discharge.
 *
 * `width` is in PROGRESS, not milliseconds, because the section is scrubbed and
 * has no timeline of its own. Section 03 is 250 vh, so on a 900 px viewport its
 * full progress spans ~2250 px; a width of 0.035 is therefore ~80 px of scroll
 * either side of the peak, which at an ordinary flick reads as the ~200 ms spike
 * the brief asks for. Expressed this way it survives a backwards scrub, which a
 * time-based spike would not.
 */
export function spike(x: number, at: number, width: number): number {
  const d = (x - at) / width
  return Math.exp(-d * d)
}

/**
 * Index of the current beat, given ascending thresholds.
 * beatIndex(0.42, [0.2, 0.35, 0.55, 0.8]) === 2
 */
export function beatIndex(progress: number, thresholds: readonly number[]): number {
  let i = 0
  while (i < thresholds.length && progress >= thresholds[i]) i++
  return i
}
