/**
 * Section 01's staging: the turntable, the pose the PX 5 takes on it, the two
 * camera shots the section moves between, and the beats the copy is keyed to.
 *
 * Its own module because the scene (which builds the turntable), the camera rig
 * (which frames it) and the server-rendered Hero section (which reveals copy on the
 * same beats) all need these numbers, and none of them should import another. No
 * 'use client', no three.js — hard rule 11.
 *
 * ONE PRODUCT. The hero used to pull back from the PX 5 to the whole eleven-unit
 * range in a row. At hero scale that row put ten units at ~9% of the frame height
 * under the CTAs, and it stood the PX 5 upright among them, where it reads as a
 * mug. Comparing the range at true relative scale is section 04's job, and it does
 * it properly. The hero now does one thing: present one unit, well lit, on a
 * turntable, then name it and give its three figures that matter.
 *
 * THE PX 5 LIES DOWN. It is a 300 mm handheld with a carry handle along its top and
 * a bell nozzle on one end; standing it on its base puts the handle out to one side
 * at mid height, which is a mug's silhouette. Lying down is the attitude it is used
 * in and the attitude assets/photos/px5.png shows.
 */

import type { Barrel } from './barrels'

/**
 * The turntable, in metres.
 *
 * Two tiers: a wide low FOOT on the floor and a taller DRUM on top of it, with the
 * platter as the drum's top face. A single straight drum reads as a section of
 * pipe; a stepped base reads as a piece of display furniture.
 *
 * The drum radius has to clear half the unit's length (150 mm) so nothing
 * overhangs the platter as it turns, with enough margin that the bell never looks
 * as though it is about to fall off: 172 mm leaves 22 mm.
 */
export const PLINTH = {
  footRadius: 0.2,
  footHeight: 0.012,
  radius: 0.172,
  /** Platter height above the floor — the surface the product rests on. */
  top: 0.062,
} as const

/** Idle turntable rate, radians per second. One revolution every ~29 s. */
export const PLINTH_SPIN = 0.22

/**
 * Extra rotation the scroll adds over the whole pin, on top of the idle spin.
 *
 * A pure function of progress, so it winds back when the reader scrolls back up.
 * Just under half a turn: enough that the move toward the focus shot reads as the
 * product being turned to face the reader, not so much that it spins.
 */
export const SCROLL_SPIN = Math.PI * 0.85

/**
 * Progress thresholds for the copy, shared with PinnedSection's data-beat.
 *
 *   beat 0  (0 – 0.2)     the statement: eyebrow, headline, sub, product aside
 *   beat 1  (0.2 – 0.55)  the copy clears and the camera brings the unit centre
 *   beat 2  (0.55 – 1)    the unit is named and measured around the product
 */
export const HERO_BEATS = [0.2, 0.55] as const

/** Where the camera move from the opening shot to the focus shot runs. */
export const HERO_MOVE: readonly [number, number] = [0.16, 0.6]

/**
 * Products whose natural presentation attitude is horizontal.
 *
 * Exactly one. Nine of the eleven are canisters or rods that mount vertically in
 * the space they protect, and the PX1E is a wand. Gated rather than assumed so that
 * swapping HERO_SUBJECT to a canister stands it on the platter instead of laying a
 * 200 mm rod on its side.
 */
export const LIES_FLAT: ReadonlySet<string> = new Set(['px5'])

/**
 * A product's silhouette resting on a surface, in metres: width across the camera,
 * height above the surface. Shared with the series plinths (§04), which lay the
 * PX 5 down for the same reason the turntable does.
 *
 * Every number is MEASURED from the model via barrels.ts rather than typed here.
 */
export function restingExtent(id: string, subject: Barrel) {
  if (!LIES_FLAT.has(id)) {
    return { width: subject.modelRadius * 2, height: subject.length, base: 0 }
  }
  // Laid flat, the model's +Z runs along world +X, so its length becomes the width
  // and its Y cross-section becomes the height.
  return {
    width: subject.length,
    height: subject.crossY[1] - subject.crossY[0],
    /** How far the origin sits above the surface the unit rests on. */
    base: -subject.crossY[0],
  }
}

/**
 * Where the subject's origin sits on the platter, relative to the turntable axis.
 *
 * Laid flat, the origin — the centre of the unit's base — moves back half the
 * length to centre the object on the axis, and up by however far the widest part
 * of its underside hangs below it, so THAT is what touches the platter. On the PX 5
 * the bell lip is 80 mm and the barrel 75.5 mm, so the barrel clears the platter by
 * 4.5 mm exactly as it would on a bench.
 */
export function lyingOffsetFor(id: string, subject: Barrel): [number, number, number] {
  const { width, base } = restingExtent(id, subject)
  if (!LIES_FLAT.has(id)) return [0, PLINTH.top, 0]
  return [-width / 2, PLINTH.top + base, 0]
}

/**
 * One camera shot: how much of the frame the turntable-and-product takes, where on
 * screen it sits, and the angle the camera looks at it from.
 */
export interface HeroShot {
  /** Share of the frame HEIGHT the whole group — foot to top of product — fills. */
  heightShare: number
  /** Most of the frame WIDTH it may take before width binds instead. */
  widthShare: number
  /** Horizontal centre, fraction of width from the INLINE-START edge. */
  anchorX: number
  /** Vertical centre, fraction of height from the top. */
  anchorY: number
  /** Camera elevation above the platter plane, radians. */
  elevation: number
  /** Camera swing about the turntable axis, radians. The world is never mirrored. */
  azimuth: number
}

/**
 * The two shots, for each of the two layouts in lib/heroLayout.ts.
 *
 * SPLIT, OPEN — the product in the inline-end half beside the copy column. 0.73
 * with a 42% width share puts it between 52% and 94% of the width, and the copy
 * column ends at 49%.
 *
 * SPLIT, FOCUS — centred, a touch larger and from a lower angle, with the name on
 * one flank and the figures on the other. The narrower width share is the centre
 * column those two flanks leave.
 *
 * STACKED — copy across the top, the product under it; then centred between the
 * name above and the row of figures below. On a portrait phone the width binds
 * long before the height share does, which is the right answer: the unit merely
 * fits rather than running off both edges.
 *
 * The elevation is what shows the platter as an ellipse with its lit rim, rather
 * than as a flat band seen edge-on. It drops for the focus shot, because a lower
 * camera makes an object read as bigger and more deliberate.
 */
export const HERO_SHOTS: Record<'split' | 'stacked', { open: HeroShot; focus: HeroShot }> = {
  split: {
    open: {
      heightShare: 0.68,
      widthShare: 0.42,
      anchorX: 0.73,
      anchorY: 0.54,
      elevation: 0.26,
      azimuth: 0,
    },
    focus: {
      heightShare: 0.68,
      widthShare: 0.36,
      anchorX: 0.5,
      anchorY: 0.53,
      elevation: 0.14,
      azimuth: -0.22,
    },
  },
  stacked: {
    open: {
      heightShare: 0.44,
      widthShare: 0.84,
      anchorX: 0.5,
      anchorY: 0.77,
      elevation: 0.26,
      azimuth: 0,
    },
    // Between the name block (to ~35% of a 375 × 667 frame) and the figures row
    // (from ~80%). At 0.5 / 0.88 / 0.53 the handle ran up into the series line.
    focus: {
      heightShare: 0.4,
      widthShare: 0.8,
      anchorX: 0.5,
      anchorY: 0.6,
      elevation: 0.14,
      azimuth: -0.22,
    },
  },
}

/** Half the visible height per metre of distance at the site's 35° vertical fov. */
const HALF_HEIGHT_PER_METRE = Math.tan((17.5 * Math.PI) / 180)

/**
 * The size of the whole group the camera frames: turntable foot to product top.
 *
 * Framed as ONE object, because it is one object on screen. Framing the product
 * alone left the turntable to fall wherever it fell, which is how the previous hero
 * lost the bottom of its pedestal off the frame.
 */
export function heroGroupFor(id: string, subject: Barrel) {
  const { width, height } = restingExtent(id, subject)
  return {
    // The PLATTER, not the foot. The foot is the widest thing in the group but it
    // is also the lowest, below the band the flanking copy sits in; what has to
    // stay inside its column is the product and the platter it turns on.
    width: Math.max(width, PLINTH.radius * 2),
    height: PLINTH.top + height,
    /** World Y the camera aims at: the group's vertical middle. */
    centreY: (PLINTH.top + height) / 2,
  }
}

/**
 * Camera distance for one shot, solved against both axes: the LARGER wins, so the
 * group fills its height share wherever there is room and merely fits where there
 * is not.
 *
 * The height is the group's PROJECTED height from this shot's elevation, not its
 * side-on height. Looking down, the turntable's foot becomes an ellipse whose near
 * edge drops below the foot itself — solving side-on put the first render's foot
 * straight off the bottom of the frame.
 */
export function heroDistanceFor(
  group: { width: number; height: number },
  shot: HeroShot,
  /** Viewport aspect, width / height. */
  aspect: number,
): number {
  const projected =
    group.height * Math.cos(shot.elevation) + PLINTH.footRadius * 2 * Math.sin(shot.elevation)
  const forHeight = projected / (shot.heightShare * 2 * HALF_HEIGHT_PER_METRE)
  const forWidth = group.width / (shot.widthShare * 2 * HALF_HEIGHT_PER_METRE * aspect)
  return Math.max(forHeight, forWidth)
}
