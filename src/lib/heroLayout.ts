/**
 * Which of the hero's two compositions the viewport gets.
 *
 * SPLIT — copy in the inline-start column, the turntable in the inline-end half,
 * both vertically centred. Landscape screens at least 1024 wide.
 *
 * STACKED — copy across the top, the turntable underneath it. Phones, portrait
 * tablets, and anything too narrow for a 34rem copy column beside a product.
 *
 * The DOM and the camera must pick the SAME one, or the product lands on the copy.
 * The DOM decides through a Tailwind screen (`split:`) built from the query below,
 * and the camera decides through isHeroSplit() from the same two numbers, so the
 * rule is written once. Its own module, owned by neither side — tailwind.config.ts
 * imports it too, which rules out anything with a 'use client' directive or a
 * three.js import (hard rule 11).
 */

export const SPLIT_MIN_WIDTH = 1024

/**
 * Landscape by a margin. A 1024 x 1366 portrait iPad is wide enough for the column
 * but a product beside it would be a sliver at mid height with a void above and
 * below; stacked uses that height properly.
 */
export const SPLIT_MIN_ASPECT = 1.15

/** Raw media query for the `split:` Tailwind screen. */
export const SPLIT_QUERY = `(min-width: ${SPLIT_MIN_WIDTH}px) and (min-aspect-ratio: 23/20)`

export function isHeroSplit(width: number, height: number): boolean {
  return width >= SPLIT_MIN_WIDTH && width / Math.max(1, height) >= SPLIT_MIN_ASPECT
}
