'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * The fine aerosol haze the hero opens in. Ambient atmosphere only.
 *
 * This is NOT the discharge — that is Phase 3's AerosolField, a GPU particle
 * system driven from a uProgress uniform. This one never changes shape: the
 * points are placed once and the whole cloud is rotated and drifted as a single
 * object, so there is zero per-particle work and zero per-frame allocation.
 *
 * Additive blending with depthWrite off. depthWrite left on for additive points
 * is what produces black squares around every sprite — it is always the cause.
 */
export function AerosolDrift({ count = 900 }: { count?: number }) {
  const points = useRef<THREE.Points>(null)

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    // Deterministic placement — a seeded sequence keeps the hero identical
    // between server render and client, and between reloads.
    let seed = 0x9e3779b9
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (rand() - 0.5) * 3.2
      positions[i * 3 + 1] = rand() * 1.4 - 0.25
      positions[i * 3 + 2] = (rand() - 0.5) * 2.2
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [count])

  useFrame((state) => {
    const p = points.current
    if (!p) return
    const t = state.clock.elapsedTime
    // One object transform, not 900 particle updates.
    p.rotation.y = t * 0.012
    p.position.y = Math.sin(t * 0.09) * 0.03
  })

  if (count === 0) return null

  return (
    <points ref={points} geometry={geometry} frustumCulled={false}>
      <pointsMaterial
        size={0.006}
        sizeAttenuation
        color="#9FB4C7"
        transparent
        opacity={0.5}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
