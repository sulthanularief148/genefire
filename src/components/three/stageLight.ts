import * as THREE from 'three'

/**
 * The display-furniture light shared by the hero turntable (§01) and the series
 * plinths (§04), so the two read as the same set.
 */

/** Warm amber — rim lights and their spill. Gold's lit cousin, not the brand red. */
export const AMBER = '#FF9E4F'

/** Ember — backdrop glows. Warmer and redder than the rim, and much fainter. */
export const EMBER = '#FF5A2A'

/**
 * A rim light's colour: above 1 on purpose, drawn with tone mapping off, because it
 * is a light and the bloom threshold is 0.86. Modest, though — at 2.4 the amber
 * clipped every channel but blue and the ring rendered as a thick yellow-green band
 * rather than as a line of warm light.
 */
export const RIM_GAIN = 1.35

export function rimColour(): THREE.Color {
  return new THREE.Color(AMBER).multiplyScalar(RIM_GAIN)
}

/**
 * Geometry on this layer is drawn by the camera and by NOTHING ELSE.
 *
 * ContactShadows re-renders the whole scene with `scene.overrideMaterial` set to a
 * depth material. It has no include list and it does not consult `castShadow`, so
 * every visible mesh inside its frustum casts — glows included, which put dark
 * smears across the platter and the floor. What it does respect is the shadow
 * camera's layer mask, and drei leaves that camera on layer 0. Moving light
 * geometry off layer 0 takes it out of every contact-shadow pass and out of nothing
 * else. The camera enables this layer once, in HeroPlinth.
 */
export const NO_SHADOW_LAYER = 1
