'use client'

import { useMemo } from 'react'
import { ContactShadows } from '@react-three/drei'

import { useScene, useVisibleIn } from '@/lib/useScene'
import { radialRamp } from './radialRamp'

/**
 * A floor for the product sections.
 *
 * Objects hanging in a void is the loudest amateur-3D tell there is, and this
 * scene had no floor at all: eleven canisters and a lineup with nothing under
 * them, no contact, no cast, nothing to say where the ground was.
 *
 * TWO PARTS, doing different jobs:
 *
 *   - A CONTACT SHADOW, which is what actually sells the contact. It is soft,
 *     tight to the base, and it is a real render of the silhouette from below
 *     rather than a painted blob, so it changes as the units turn and as the
 *     lineup forms.
 *   - A REFLECTION PLANE, faint. Polished stainless standing on a surface picks up
 *     a little of itself; without it the units read as cut out and pasted on.
 *
 * The plane fades radially to nothing so it never draws a visible horizon line
 * across the frame. That matters more than usual here: the canvas runs alpha:true
 * over a page gradient, so a hard-edged plane would read as a grey rectangle laid
 * over the ground rather than as a floor.
 *
 * Mounted only for the sections that stand a product on it. Sections 02, 03 and 06
 * have their own room with its own floor, and section 07 puts the unit inside an
 * enclosure — a second floor in any of those is a second horizon.
 */

const FLOOR_MODES = ['hero', 'series', 'product'] as const

/** Opacity from the centre of the 7 m disc to its rim. */
const FLOOR_FADE = [
  [0, 0.88],
  [0.12, 0.5],
  [0.3, 0.14],
  [0.6, 0.03],
  [1, 0],
] as const

export function Ground() {
  const visible = useVisibleIn(FLOOR_MODES)
  const tier = useScene((s) => s.tier)
  const lowPower = useScene((s) => s.lowPower)
  const reduced = useScene((s) => s.reduced)

  /**
   * The radial fade. See radialRamp for why it is drawn greyscale — built as
   * white-to-transparent it never faded at all, and the floor's far rim drew a
   * horizon across the frame.
   *
   * Falls away early and reaches nothing well before the edge, weighted to the
   * middle where the products stand. The disc is far wider than the sheen, so the
   * fade finishes long before the rim.
   */
  const fade = useMemo(() => radialRamp(FLOOR_FADE), [])

  // Contact shadows re-render the silhouette every frame. At the compact tier and
  // on low-power devices that is the first thing to go: the floor plane alone
  // still grounds the object, just less precisely.
  const shadows = !lowPower && tier !== 'compact'

  return (
    <group visible={visible}>
      {shadows && (
        <ContactShadows
          // Just above the floor plane, so the shadow is not z-fighting it.
          position={[0, 0.0012, 0]}
          // Wide enough for the eleven-unit lineup at its full spread.
          scale={3.2}
          resolution={512}
          blur={2.6}
          opacity={0.62}
          // Tight: these are small objects and the shadow should stay under them
          // rather than pooling out into a soft disc.
          far={0.42}
          // Frozen under reduced motion, where nothing turns and one bake is
          // exactly right.
          frames={reduced ? 1 : Infinity}
        />
      )}

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        {/* Far wider than the lineup's 2.3 m spread, deliberately: the rim has to
            fall outside the frame and inside the fog, or it draws a horizon. */}
        <circleGeometry args={[7, 64]} />
        <meshStandardMaterial
          // Darker than the page ground, not lighter. A floor that is brighter
          // than the space it sits in reads as an object.
          color="#0b0d10"
          roughness={0.46}
          metalness={0.38}
          // The fade rides the alpha channel, so the disc has no edge.
          alphaMap={fade ?? undefined}
          transparent
          opacity={0.62}
          depthWrite={false}
          envMapIntensity={0.22}
        />
      </mesh>
    </group>
  )
}
