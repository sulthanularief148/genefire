import { getProduct, high } from './products'

/**
 * The six application environments, as plain data.
 *
 * Deliberately NOT exported from the 'use client' three.js component that draws
 * them. A server component importing a value from a client module gets a client
 * reference proxy, not the value — `ENVIRONMENT_IDS.map is not a function` at
 * build time, which is what happened when this list lived there. Data that both
 * sides need belongs in a module neither side owns.
 */
export interface EnvironmentSpec {
  /** Message key under `app.*`. */
  id: string
  /** Which SKU is installed here, per the sketchup-to-web3d skill's mapping. */
  productId: string
  /** Authored proportions, width : height : depth. Absolute scale is solved. */
  proportions: [number, number, number]
  /** Installed units. */
  unitCount: number
  /** Repeated equipment — instanced, so any number of them is one draw call. */
  propCount: number
  propSize: [number, number, number]
}

export const ENVIRONMENTS: EnvironmentSpec[] = [
  // Vehicle engine bay. Geometry only — no identifiable platform.
  { id: 'military', productId: 'sx100', proportions: [1.6, 1, 1.6], unitCount: 2, propCount: 4, propSize: [0.5, 0.4, 0.7] },
  // CNC enclosure / paint booth.
  { id: 'industry', productId: 'sx300', proportions: [1.5, 1.25, 1], unitCount: 2, propCount: 3, propSize: [0.8, 1.1, 0.7] },
  // MV switchgear cabinet, door open.
  { id: 'power', productId: 'sx25', proportions: [1, 1.25, 1], unitCount: 3, propCount: 6, propSize: [0.7, 0.12, 0.6] },
  // Traction converter housing under a rail car.
  { id: 'railway', productId: 'sx50', proportions: [2, 1.25, 1], unitCount: 2, propCount: 5, propSize: [0.5, 0.5, 0.7] },
  // Two rack rows and a hot aisle.
  { id: 'datacenter', productId: 'sx100', proportions: [1, 2.5, 2], unitCount: 4, propCount: 8, propSize: [0.55, 1.9, 0.9] },
  // Fume hood and solvent cabinet.
  { id: 'laboratory', productId: 'sx5_10', proportions: [1.4, 1, 1.1], unitCount: 2, propCount: 3, propSize: [0.4, 0.5, 0.4] },
]

export const ENVIRONMENT_IDS = ENVIRONMENTS.map((e) => e.id)

/**
 * Absolute dimensions, solved so the enclosure's volume EQUALS the rated
 * protected volume of the unit installed in it.
 *
 * proportions p, target volume V:  k = cbrt(V / (px·py·pz)),  dims = k · p
 *
 * This is the whole reason these blockouts are worth building before the real
 * SketchUp scenes arrive: the coverage story in §06 only holds if a 15 m³ cabinet
 * is actually 15 m³, and that stays true when the geometry is replaced.
 */
export function solveDimensions(env: EnvironmentSpec): {
  dims: [number, number, number]
  volume: number
} {
  const product = getProduct(env.productId)
  const volume = product ? high(product.volume_m3) : 5
  const [px, py, pz] = env.proportions
  const k = Math.cbrt(volume / (px * py * pz))
  return { dims: [px * k, py * k, pz * k], volume }
}

/** Which environment is centred at a given section progress. */
export function environmentIndexAt(progress: number): number {
  const i = Math.round(progress * (ENVIRONMENTS.length - 1))
  return Math.min(ENVIRONMENTS.length - 1, Math.max(0, i))
}

/**
 * Camera framing for whichever environment is at the front of the drum.
 *
 * These enclosures differ by a factor of thirty in volume — a 0.5 m³ fume hood
 * and a 15 m³ paint booth — so ONE fixed distance cannot frame them. At the
 * distance that fits the booth the fume hood is a speck; at the distance that
 * fits the fume hood the booth is off every edge. The distance is therefore
 * solved from the solved dimensions, and the result is that every environment
 * arrives at the same apparent size however big it actually is.
 *
 * fov is 35°, so half the visible height at distance D is tan(17.5°)·D. The
 * constants below fill roughly 80% of the frame vertically and leave the width
 * checked too, because `railway` is twice as wide as it is tall.
 *
 * Interpolated between neighbours rather than stepped, so the dolly moves with
 * the drum instead of jumping when the index changes.
 */
const HALF_HEIGHT_PER_METRE = Math.tan((17.5 * Math.PI) / 180)

/**
 * How much of the frame an environment may fill. The default is the side-by-side
 * layout at 16:9. A portrait phone passes its own aspect and a smaller height
 * share: with a 16:9 width check a 2.4 m booth overflowed a 0.56-aspect frame on
 * both sides and sat behind the copy.
 */
export interface FrameFit {
  aspect: number
  heightShare: number
  widthShare: number
}

const WIDE_FIT: FrameFit = { aspect: 16 / 9, heightShare: 0.8, widthShare: 0.85 }

const DIMS = ENVIRONMENTS.map((env) => solveDimensions(env).dims)

function enclosureFraming(i: number, fit: FrameFit): number {
  const [w, h, d] = DIMS[i]
  const forHeight = h / (fit.heightShare * 2 * HALF_HEIGHT_PER_METRE)
  const forWidth = w / (fit.widthShare * 2 * HALF_HEIGHT_PER_METRE * fit.aspect)
  // Measured from the enclosure centre, so half the depth is added back.
  return Math.max(forHeight, forWidth) + d / 2
}

/** Continuous position along the drum, 0 … N-1. The rotation uses the same map. */
export function frontIndexAt(progress: number): number {
  const p = Math.min(1, Math.max(0, progress))
  return p * (ENVIRONMENTS.length - 1)
}

/** Framing for the environment at the front of the drum at this progress. */
export function applicationsFramingAt(
  progress: number,
  fit: FrameFit = WIDE_FIT,
): {
  distance: number
  centreY: number
} {
  // The drum's own curve, dwell included: the dolly holds while the drum holds,
  // and moves only during the turn.
  const t = drumIndexAt(progress)
  const i = Math.min(DIMS.length - 1, Math.floor(t))
  const j = Math.min(DIMS.length - 1, i + 1)
  const f = t - i
  const da = enclosureFraming(i, fit)
  const db = enclosureFraming(j, fit)
  const ya = DIMS[i][1] / 2
  const yb = DIMS[j][1] / 2
  return {
    distance: da + (db - da) * f,
    centreY: ya + (yb - ya) * f,
  }
}

/**
 * ONE map from scroll progress to "which environment is at the front".
 *
 * There were three, and they disagreed. The drum turned on `p·(N-1)`, the labels
 * lit on `(i+0.5)/N`, and the mounting rounded a third value — so the name in the
 * margin could read "railway" while the drum was pointing thirty degrees away
 * from anything. Everything below is derived from this one definition.
 *
 * Environment k is fronted at progress k/(N-1): the first is centred at the very
 * start of the pin and the last at the very end, so the whole scroll is used.
 */
const LAST = ENVIRONMENTS.length - 1

/**
 * Where each label hands over to the next — the midpoints between the fronted
 * positions. Passed to PinnedSection as its beats, so `data-beat=k` means
 * "environment k is the one facing the camera", and the copy cannot drift from
 * the 3D because both read this array.
 */
export const ENVIRONMENT_BEATS = Array.from({ length: LAST }, (_, j) => (j + 0.5) / LAST)

/**
 * Continuous drum position with a DWELL on each environment.
 *
 * A linear sweep is on-axis only at the single instant it passes each fronted
 * position, and spends the rest of the section aimed at the gap between two
 * enclosures — which is why a shot at the middle of the pin caught nothing but
 * background. This holds each environment square to the camera for the first and
 * last third of its segment and does the turn in the middle third, which is also
 * exactly where the label changes.
 *
 * A pure function of progress: no accumulated state, so scrubbing backwards
 * retraces it precisely.
 */
export function drumIndexAt(progress: number): number {
  const t = Math.min(1, Math.max(0, progress)) * LAST
  const i = Math.floor(Math.min(LAST - 1, t))
  const f = t - i
  // smoothstep(0.35, 0.65, f), inlined to keep this module dependency-free.
  const x = Math.min(1, Math.max(0, (f - 0.35) / 0.3))
  return i + x * x * (3 - 2 * x)
}
