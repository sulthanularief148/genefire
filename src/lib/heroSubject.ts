/**
 * The one unit the hero presents.
 *
 * Its own module because the scene (which mounts it), the camera rig (which frames
 * it) and the Hero section (which names it and prints its figures) all need to
 * agree, and none of them should import another.
 *
 * docs/03-site-structure-spec.md §01 specifies the SX 300. A stainless canister
 * against a charcoal ground has almost no separation, and the palette moment the
 * hero is for is red against charcoal under gold type — which also says "fire
 * safety" in the first half-second without a word being read.
 *
 * IT IS THE PX 5. It is the only unit in the range with a hero-grade model (see
 * scripts/model-px5.mjs; the other ten are still the client's kit geometry), and
 * the one whose purpose is legible on sight. The hero no longer goes on to the rest
 * of the range: section 04 compares all eleven at true relative scale, and does it
 * properly.
 *
 * SWAPPING THIS IS A ONE-LINE CHANGE and it stays that way. The camera solves its
 * distance from whichever unit is named here, the turntable lays it down only if it
 * is one that lies down (lib/heroStage.ts), and the Hero section reads its name,
 * series and figures from products.json.
 */
export const HERO_SUBJECT = 'px5'
