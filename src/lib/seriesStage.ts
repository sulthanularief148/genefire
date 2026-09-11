/**
 * Section 04's staging: three display plinths, one per series, on a rail.
 *
 * Its own module because the server-rendered Series section (beats), the rail
 * (layout) and the camera rig (framing) all need these numbers and none of them
 * should import another. No 'use client', no three.js — hard rule 11.
 *
 * WHAT CHANGED, AND WHY. The rail used to space every unit 340 mm apart and frame
 * each stage from 2.5–3.3 m away, so a 32 mm bar was about 6% of the frame high —
 * four red specks. And it never stood the units up: the models are authored with
 * the barrel along +Z, so the rail showed every one of them end-on, pointing at
 * the camera. Each series now stands on its own plinth, spaced by the units' real
 * widths, and is framed to fill its half of the screen.
 *
 * Within a plinth the units are at TRUE RELATIVE SCALE: nothing is normalised, and
 * an SX 5/10 stands beside an SX 100 exactly as much smaller as it is. Across
 * plinths each stage is framed on its own, so the 115 mm bars are legible rather
 * than lost in a frame sized for 215 mm canisters.
 *
 * Every dimension is read from assets/products.json or measured from the models
 * via barrels.ts. Nothing is typed here.
 */

import { clamp, smoothstep } from './anim'
import { BARRELS } from './barrels'
import { LIES_FLAT, restingExtent } from './heroStage'
import { series } from './products'

/** Plinth slab, in metres. */
export const SLAB = {
  height: 0.024,
  /** Air at each end of the row. */
  margin: 0.06,
  /** Air in front of and behind the widest unit. */
  depthMargin: 0.07,
  /** Air between neighbouring units. */
  gap: 0.055,
} as const

/** Metres between plinths along the rail. Far enough that a neighbour is never in frame. */
export const STAGE_GAP = 1.8

export interface SeriesSlot {
  id: string
  /** Centre of the unit along the row, from the plinth's centre. */
  x: number
  lying: boolean
  /** Across the row. */
  width: number
  /** Front to back. */
  depth: number
  /** Above the slab. */
  height: number
  /** Where the model's origin sits inside its slot, for the lying unit. */
  offset: [number, number, number]
}

export interface SeriesStageLayout {
  id: 'px' | 'sx_small' | 'sx_industrial'
  index: number
  /** Rail position, unsigned. Direction is applied at read time. */
  railX: number
  slots: SeriesSlot[]
  slabWidth: number
  slabDepth: number
  /** Floor to the top of the tallest unit. */
  height: number
  /** World Y the camera aims at. */
  centreY: number
}

export const SERIES_STAGES: SeriesStageLayout[] = series.map((s, index) => {
  const measured = s.products.map((product) => {
    const barrel = BARRELS[product.id]
    const lying = LIES_FLAT.has(product.id) && Boolean(barrel)
    if (lying && barrel) {
      const rest = restingExtent(product.id, barrel)
      return {
        id: product.id,
        lying,
        width: rest.width,
        depth: product.dia_mm / 1000,
        height: rest.height,
        offset: [-rest.width / 2, rest.base, 0] as [number, number, number],
      }
    }
    return {
      id: product.id,
      lying: false,
      // Catalogue diameter, not the model's bounding radius: px1m's detached cap
      // inflates its bounds fivefold, and it is hidden on display — see dressProduct.
      width: product.dia_mm / 1000,
      depth: product.dia_mm / 1000,
      height: barrel?.length ?? product.length_mm / 1000,
      offset: [0, 0, 0] as [number, number, number],
    }
  })

  const row = measured.reduce((sum, m) => sum + m.width, 0) + SLAB.gap * (measured.length - 1)
  let cursor = -row / 2
  const slots = measured.map((m) => {
    const x = cursor + m.width / 2
    cursor += m.width + SLAB.gap
    return { ...m, x }
  })

  const tallest = Math.max(...slots.map((slot) => slot.height))
  const height = SLAB.height + tallest
  return {
    id: s.id,
    index,
    railX: index * STAGE_GAP,
    slots,
    slabWidth: row + SLAB.margin * 2,
    slabDepth: Math.max(...slots.map((slot) => slot.depth)) + SLAB.depthMargin * 2,
    height,
    centreY: height / 2,
  }
})

/**
 * Copy beats: one third of the pin per series, shared with PinnedSection.
 *
 * The rail is remapped to match (seriesStageAt), so the plinth on screen and the
 * copy beside it always name the same series. The previous rail centred its stages
 * at progress 0, 0.5 and 1 while the copy switched at 1/3 and 2/3, so for a sixth of
 * the scroll either side of each switch the copy described the wrong plinth.
 */
export const SERIES_BEATS = [1 / 3, 2 / 3] as const

/**
 * Which plinth is centred, as a continuous stage index 0 … 2.
 *
 * Each series HOLDS in the middle of its third of the pin and the rail only moves
 * around the switch points, eased — a section with no hold reads as a slideshow.
 * At exactly 1/3 and 2/3 it is halfway between two plinths, which is where the copy
 * cross-fades.
 */
export function seriesStageAt(progress: number): number {
  const last = SERIES_STAGES.length - 1
  const linear = clamp(progress * SERIES_STAGES.length - 0.5, 0, last)
  const k = Math.min(Math.floor(linear), last)
  if (k >= last) return last
  return k + smoothstep(0.18, 0.82, linear - k)
}

/** Camera X for a given progress, signed by reading direction. */
export function seriesRailX(progress: number, sign: 1 | -1): number {
  return sign * seriesStageAt(progress) * STAGE_GAP
}

/** One camera shot of a plinth. */
export interface SeriesShot {
  heightShare: number
  widthShare: number
  /** Fraction of width from the INLINE-START edge. */
  anchorX: number
  anchorY: number
  elevation: number
}

/**
 * SPLIT: the plinth in the inline-end half beside the copy column, as the hero
 * does it. STACKED: under the copy.
 */
export const SERIES_SHOTS: Record<'split' | 'stacked', SeriesShot> = {
  split: { heightShare: 0.46, widthShare: 0.44, anchorX: 0.71, anchorY: 0.56, elevation: 0.17 },
  stacked: { heightShare: 0.28, widthShare: 0.86, anchorX: 0.5, anchorY: 0.76, elevation: 0.17 },
}

/** Half the visible height per metre of distance at the site's 35° vertical fov. */
const HALF_HEIGHT_PER_METRE = Math.tan((17.5 * Math.PI) / 180)

/**
 * Camera distance for one plinth: its projected height from this elevation, or its
 * width, whichever binds.
 */
export function seriesDistanceFor(
  stage: SeriesStageLayout,
  shot: SeriesShot,
  aspect: number,
): number {
  const projected =
    stage.height * Math.cos(shot.elevation) + stage.slabDepth * Math.sin(shot.elevation)
  const forHeight = projected / (shot.heightShare * 2 * HALF_HEIGHT_PER_METRE)
  const forWidth = stage.slabWidth / (shot.widthShare * 2 * HALF_HEIGHT_PER_METRE * aspect)
  return Math.max(forHeight, forWidth)
}
