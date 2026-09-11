import * as THREE from 'three'

/**
 * Screen-space anchoring.
 *
 * A subject's projected position is held at a fixed fraction of the viewport for
 * the whole of a camera move, instead of being whatever the dolly happens to
 * produce. Author the DISTANCE across the scroll; the anchor decides where the
 * subject lands on screen at every point in between.
 *
 * Framing the two ends by hand and interpolating leaves every value between them
 * unchecked — which is how the hero product ended up drifting into the CTA row
 * around progress 0.3 while both 0.0 and 1.0 looked fine.
 *
 * Side effect worth having: the camera path stops being a straight line and
 * becomes a gentle curve, because the offset grows with distance. That is a crane
 * move, and it reads better than the straight line did.
 */

export interface Framing {
  /** Distance from the subject plane, in metres. */
  distance: number
  /**
   * Where the subject's centre sits vertically, as a fraction of viewport height
   * from the top. 0.5 centres it; 0.72 puts it in the lower third under copy.
   */
  anchorY: number
  /**
   * Where the subject sits horizontally, as a fraction of viewport width from the
   * inline-start edge. 0.5 centres it. Multiplied by the direction sign, so the
   * same number means "a third in from the reading edge" in both directions.
   */
  anchorX: number
}

export interface FramingResult {
  camX: number
  camY: number
  camZ: number
  lookX: number
  lookY: number
  /** Half the visible height at this distance, in world units. Useful for scale checks. */
  halfHeight: number
  halfWidth: number
}

const result: FramingResult = {
  camX: 0,
  camY: 0,
  camZ: 0,
  lookX: 0,
  lookY: 0,
  halfHeight: 0,
  halfWidth: 0,
}

/**
 * Resolve a camera position that puts `subject` at the requested screen anchor.
 *
 * Returns a MODULE-SCOPE object, deliberately: this runs every frame and must not
 * allocate. Read the fields immediately; do not hold the reference.
 *
 * The look target sits on the same X and Y as the camera, so the view axis stays
 * parallel to -Z. Aiming it at the subject would rotate the camera back and
 * cancel the anchoring entirely.
 */
export function anchorSubject(
  camera: THREE.PerspectiveCamera,
  subjectX: number,
  subjectY: number,
  framing: Framing,
  /** +1 in LTR, -1 in RTL. */
  sign: 1 | -1,
): FramingResult {
  const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * framing.distance
  const halfWidth = halfHeight * camera.aspect

  // Screen offsets from centre, converted to world units at this distance.
  // Positive vertical offset means the subject sits BELOW centre, so the camera
  // rides above it by the same amount.
  const offsetY = (framing.anchorY - 0.5) * 2 * halfHeight
  const offsetX = (framing.anchorX - 0.5) * 2 * halfWidth * sign

  result.camX = subjectX - offsetX
  result.camY = subjectY + offsetY
  result.camZ = framing.distance
  result.lookX = result.camX
  result.lookY = result.camY
  result.halfHeight = halfHeight
  result.halfWidth = halfWidth

  return result
}

/** Interpolate between two framings. Distance and both anchors move together. */
export function lerpFraming(a: Framing, b: Framing, t: number, out: Framing): Framing {
  out.distance = a.distance + (b.distance - a.distance) * t
  out.anchorY = a.anchorY + (b.anchorY - a.anchorY) * t
  out.anchorX = a.anchorX + (b.anchorX - a.anchorX) * t
  return out
}

/**
 * Stands a product on its base.
 *
 * The models are authored with their barrel along +Z, which contradicts hard rule
 * 9 (+Y up) and points the cylinder at the camera until something turns it.
 *
 * Applied as its own nested group, never as a rotation on the same object that
 * carries the turntable: THREE.Euler 'XYZ' composes as Rx·Ry·Rz, so putting both
 * on one object spins the unit about a radial axis instead of about its own.
 */
export const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]

/** Half the visible height per metre of distance at the site's 35° vertical fov. */
const HALF_HEIGHT_PER_METRE = Math.tan((17.5 * Math.PI) / 180)

/**
 * Distance and subject height for ONE product, solved from its own bounds.
 *
 * Section 05 is where a specifier looks at a single unit, and every unit should
 * arrive filling its frame the same way. Framing them all from one shared world
 * scale does the opposite: at true relative scale the SX 5/10 is a 115 mm bar and
 * the SX 1500 a 215 mm drum eight times its volume, so a distance that suits the
 * drum renders the bar as a speck — which is exactly what it was doing, a few
 * pixels wide on top of the "Dimensions" row.
 *
 * True relative scale is section 04's job, where comparison is the whole point.
 * Here the job is legibility of one object.
 *
 * Solved against BOTH axes: `railway`-shaped products are wider than they are
 * tall, and fitting only the height pushes them off the sides.
 */
export function productFramingFor(
  /** Full extent along the barrel axis — the height once stood upright. */
  length: number,
  /** Widest radius, brackets excluded — the half-width once stood upright. */
  radius: number,
  /** Viewport aspect, width / height. */
  aspect: number,
  /** Share of the frame height the product may fill. Stacked layouts pass less. */
  heightShare = 0.62,
  /** Share of the frame width. */
  widthShare = 0.42,
): { distance: number; centreY: number } {
  const forHeight = length / (heightShare * 2 * HALF_HEIGHT_PER_METRE)
  const forWidth = (radius * 2) / (widthShare * 2 * HALF_HEIGHT_PER_METRE * aspect)
  return { distance: Math.max(forHeight, forWidth), centreY: length / 2 }
}
