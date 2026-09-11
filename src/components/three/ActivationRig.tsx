'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { remap, smoothstep } from '@/lib/anim'
import { scroll, useScene, useVisibleIn } from '@/lib/useScene'
import { SX300 } from './products'
import { AerosolField, AEROSOL_PRESET } from './fx/AerosolField'
import { ROOM_DIMENSIONS } from './Cabinet'

/**
 * Section 03 — the SX 300 on its bracket, its thermal cord, and the discharge.
 *
 * Beat timing, exactly as specified:
 *   0.00–0.20  the unit slides into frame on its bracket, mounted in the cabinet
 *   0.20–0.35  the thermal cord glows, bloom begins to lift
 *   0.35–0.55  DISCHARGE — the aerosol floods outward and upward
 *   0.55–0.80  the volume fills, heat haze collapses, embers die
 *   0.80–1.00  LEDs return cyan, the aerosol clears, the unit sits there
 *              looking unremarkable
 *
 * Every value below is f(progress). Nothing is stored between frames.
 */

/** The unit belongs to section 03. */
const ACTIVATION_MODES = ['activation'] as const

/** Where the unit is mounted: high on the back wall, between the two racks. */
const MOUNT: [number, number, number] = [0, 1.86, -ROOM_DIMENSIONS.d / 2 + 0.16]

/** The mount, for the camera's opening shot in section 03. */
export const ACTIVATION_MOUNT = MOUNT

/** How far it slides in from, along the inline axis. */
const SLIDE_FROM = 1.15

export function ActivationRig({ particleCount }: { particleCount: number }) {
  const unit = useRef<THREE.Group>(null)
  const cord = useRef<THREE.MeshStandardMaterial>(null)
  const reduced = useScene((s) => s.reduced)
  const active = useVisibleIn(ACTIVATION_MODES)

  useFrame(() => {
    const p = reduced ? 1 : scroll.activation

    if (unit.current) {
      // 0.00–0.20 — slides in and settles onto the bracket.
      const arrive = smoothstep(0, 0.2, p)
      unit.current.position.x = MOUNT[0] + (1 - arrive) * SLIDE_FROM
      unit.current.position.y = MOUNT[1] + (1 - arrive) * 0.12
      unit.current.position.z = MOUNT[2]
      // A slight settle rotation, gone by the time it is mounted.
      unit.current.rotation.z = (1 - arrive) * -0.22
      // Gated by the active section first; the progress term only handles the
      // slide-in at the very start of section 03.
      unit.current.visible = active && (p > 0.001 || reduced)
    }

    if (cord.current) {
      // 0.20–0.35 — the thermal cord glows, and keeps a residual heat through the
      // discharge before cooling off entirely by the end.
      const ignite = remap(p, 0.2, 0.35, 0, 1)
      const cool = 1 - smoothstep(0.55, 0.86, p)
      cord.current.emissiveIntensity = ignite * cool * 1.9
    }
  })

  return (
    <group>
      <group ref={unit} position={MOUNT}>
        <SX300 />
        {/* Thermal cord: the initiator that fires the generator. A thin ring
            around the head, emissive only — it is a light source, not a surface. */}
        <mesh position={[0, 0.166, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.038, 0.0035, 6, 24]} />
          <meshStandardMaterial
            ref={cord}
            color="#2A0B05"
            emissive="#FF5A1F"
            emissiveIntensity={0}
            roughness={0.5}
            toneMapped={false}
          />
        </mesh>
      </group>

      {/*
        The discharge. Emission origin is the generator outlet, not the floor:
        the aerosol comes out of the unit and fills the room from there.

        It must read as FLOODING A VOLUME, never as spraying a jet at something —
        condensed aerosol is not a fire hose, and that distinction is the entire
        commercial argument. The preset carries the wide radial spread and the
        restrained buoyancy that produce it.
      */}
      <AerosolField
        count={particleCount}
        preset={AEROSOL_PRESET}
        channel="activation"
        position={[MOUNT[0], MOUNT[1] - 0.02, MOUNT[2] + 0.06]}
        // 0.80–1.00 — the aerosol clears and the room is ordinary again.
        clear={(p) => smoothstep(0.82, 1, p)}
      />
    </group>
  )
}
