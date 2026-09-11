'use client'

import { forwardRef, useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import * as THREE from 'three'

import { smoothstep } from '@/lib/anim'
import { PLINTH } from '@/lib/heroStage'
import { useScene } from '@/lib/useScene'
import { radialRamp } from './radialRamp'
import { AMBER, EMBER, NO_SHADOW_LAYER, rimColour } from './stageLight'

/**
 * The turntable the hero PX 5 lies on.
 *
 * A turntable is the oldest and most literal way of saying "look at this object",
 * and the opening frame has one object in it and nothing else. Without a stage the
 * unit hangs in a void, which is the amateur-3D tell Ground.tsx exists to avoid.
 *
 * SIX PARTS, one material and one draw call each:
 *
 *   - the BODY, foot and drum as a single lathe, dark graphite, barely lit, so it
 *     reads as a base and not as a second object competing with the product
 *   - the PLATTER, dark and glossy enough to return the studio environment as a
 *     soft reflection under the product, with a ring of strobe ticks at its edge.
 *     The ticks are the only part of a smooth disc that can SHOW rotation; without
 *     them a turning platter is indistinguishable from a still one
 *   - the RIM, a hairline of warm light round the platter edge. It is the one
 *     bright line in the opening frame and it is what the bloom pass picks up
 *   - the POOL, the rim's light spilling onto the floor, additive
 *   - the BACKDROP, one soft ember glow behind the product, so a red object on a
 *     charcoal page has something warmer than the page to stand in front of
 *   - a CONTACT SHADOW, tight to the platter
 *
 * The platter is a separate forwardRef'd group because Stage.tsx turns it and the
 * product from ONE accumulated angle. Two clock reads drift apart within a minute
 * and the product starts sliding across its own turntable.
 *
 * THE LIGHTS COME ON. The first time the scene is on screen, the rim, its spill and
 * the backdrop ramp up over INTRO_SECONDS rather than being there from the first
 * frame — the same beat as the camera's arrival in CameraRig. It happens once, on
 * a clock rather than on scroll, and not at all under reduced motion.
 */

/** Opacities the pool and backdrop settle at. */
const POOL_OPACITY = 0.2
const BACKDROP_OPACITY = 0.2

/** How long the power-on takes, and how long after first frame it starts. */
const INTRO_DELAY = 0.25
const INTRO_SECONDS = 1.6
/**
 * The platter's strobe ring, as an emissive map.
 *
 * circleGeometry maps its UVs flat across the disc's bounding square, so a square
 * canvas with the ticks drawn round its centre lands on the platter exactly. Black
 * is no emission; the ticks glow faintly in the material's emissive colour.
 *
 * 120 ticks, one every 3°, with every tenth one long: a dial, not a pattern.
 */
function tickRing(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const size = 1024
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const c = size / 2
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#fff'
  ctx.lineCap = 'round'

  for (let i = 0; i < 120; i++) {
    const a = (i / 120) * Math.PI * 2
    const major = i % 10 === 0
    const r0 = c * (major ? 0.84 : 0.885)
    const r1 = c * 0.93
    ctx.globalAlpha = major ? 1 : 0.55
    ctx.lineWidth = major ? 3.2 : 1.8
    ctx.beginPath()
    ctx.moveTo(c + Math.cos(a) * r0, c + Math.sin(a) * r0)
    ctx.lineTo(c + Math.cos(a) * r1, c + Math.sin(a) * r1)
    ctx.stroke()
  }

  // Two hairline circles: one just outside the ticks, one well inside them, so the
  // ring reads as an engraved band rather than as loose marks.
  ctx.globalAlpha = 0.7
  ctx.lineWidth = 1.5
  for (const r of [0.955, 0.8]) {
    ctx.beginPath()
    ctx.arc(c, c, c * r, 0, Math.PI * 2)
    ctx.stroke()
  }

  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}

/**
 * The foot-and-drum profile, revolved.
 *
 * Every corner is written twice so the lathe gives it a hard crease: LatheGeometry
 * smooths normals along the profile, and a single shared point at a 90° corner
 * shades as a rounded bevel that reads as a soft plastic moulding.
 */
function bodyProfile(): THREE.Vector2[] {
  const { footRadius: rf, footHeight: hf, radius: rd, top } = PLINTH
  const bevel = 0.0025
  // The drum is drafted a few degrees wider at its base: a straight-sided cylinder
  // reads as pipe, draft reads as a plinth.
  const rDrumBase = rd * 1.035
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(rf, 0),
    new THREE.Vector2(rf, 0),
    new THREE.Vector2(rf, hf - bevel),
    new THREE.Vector2(rf, hf - bevel),
    new THREE.Vector2(rf - bevel, hf),
    new THREE.Vector2(rf - bevel, hf),
    new THREE.Vector2(rDrumBase, hf),
    new THREE.Vector2(rDrumBase, hf),
    new THREE.Vector2(rd, top),
  ]
}


export const HeroPlinth = forwardRef<THREE.Group>(function HeroPlinth(_, platterRef) {
  const reduced = useScene((s) => s.reduced)
  const camera = useThree((state) => state.camera)

  const rim = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null)
  const pool = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null)
  const backdrop = useRef<THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>>(null)
  const ticksMat = useRef<THREE.MeshStandardMaterial>(null)

  // The light geometry opts out of the depth passes; the camera opts back in.
  useEffect(() => {
    for (const mesh of [rim.current, pool.current, backdrop.current]) {
      mesh?.layers.set(NO_SHADOW_LAYER)
    }
    camera.layers.enable(NO_SHADOW_LAYER)
  }, [camera])

  const profile = useMemo(() => bodyProfile(), [])
  const ticks = useMemo(() => tickRing(), [])
  const poolRamp = useMemo(
    () =>
      radialRamp([
        [0, 0],
        [0.3, 0],
        [0.36, 0.55],
        [0.46, 0.22],
        [0.7, 0.05],
        [1, 0],
      ]),
    [],
  )
  const backdropRamp = useMemo(
    () =>
      radialRamp([
        [0, 0.85],
        [0.25, 0.42],
        [0.55, 0.1],
        [1, 0],
      ]),
    [],
  )

  // Built once: colours cannot be allocated in the render loop.
  const rimFull = useMemo(() => rimColour(), [])

  /** Clock time of the first frame, or -1 until there has been one. */
  const born = useRef(-1)
  /** Latched once the intro has finished, so the loop stops writing materials. */
  const lit = useRef(false)

  useFrame((state) => {
    if (lit.current) return
    if (born.current < 0) born.current = state.clock.elapsedTime
    const on = reduced
      ? 1
      : smoothstep(INTRO_DELAY, INTRO_DELAY + INTRO_SECONDS, state.clock.elapsedTime - born.current)

    // The rim strikes first and fastest; the spill and the backdrop follow it, the
    // way light from a source reaches the things it lights.
    const strike = Math.min(1, on * 1.6)
    rim.current?.material.color.copy(rimFull).multiplyScalar(strike)
    if (pool.current) pool.current.material.opacity = POOL_OPACITY * on
    if (backdrop.current) backdrop.current.material.opacity = BACKDROP_OPACITY * on
    if (ticksMat.current) ticksMat.current.emissiveIntensity = 0.55 * strike

    if (on >= 1) lit.current = true
  })

  return (
    <group>
      {/* Foot and drum. Barely lit on purpose — a base, not a second subject. */}
      <mesh receiveShadow>
        <latheGeometry args={[profile, 96]} />
        <meshStandardMaterial
          color="#0f1115"
          roughness={0.4}
          metalness={0.72}
          envMapIntensity={0.45}
        />
      </mesh>

      {/* The platter. Turned by Stage.tsx through the forwarded ref, together
          with the product lying on it. */}
      <group ref={platterRef} position={[0, PLINTH.top, 0]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <circleGeometry args={[PLINTH.radius, 96]} />
          <meshStandardMaterial
            ref={ticksMat}
            color="#111317"
            roughness={0.24}
            metalness={0.88}
            envMapIntensity={0.85}
            emissive={AMBER}
            emissiveMap={ticks ?? undefined}
            emissiveIntensity={0}
          />
        </mesh>
      </group>

      {/* The rim light: a hairline torus on the platter edge. Starts dark. */}
      <mesh ref={rim} position={[0, PLINTH.top, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[PLINTH.radius + 0.0012, 0.0016, 10, 192]} />
        <meshBasicMaterial color="#000000" toneMapped={false} />
      </mesh>

      {/* The rim's spill on the floor: a ring of warm light round the foot,
          dark at the centre where the plinth stands on it. */}
      <mesh
        ref={pool}
        position={[0, 0.0016, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[1.1, 1.1]} />
        <meshBasicMaterial
          color={AMBER}
          alphaMap={poolRamp ?? undefined}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/*
        The backdrop: one soft ember glow, well behind the product, flat to the
        camera. A radial falloff has no edge anywhere — the previous plinth's haze
        cone was an open cylinder, and its silhouette landed as two hard diagonal
        lines running up through the headline.
      */}
      <mesh ref={backdrop} position={[0, 0.3, -0.55]} renderOrder={1}>
        <planeGeometry args={[1.9, 1.1]} />
        <meshBasicMaterial
          color={EMBER}
          alphaMap={backdropRamp ?? undefined}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>

      {/*
        Tight to the platter, and 1.5 mm ABOVE it. The shadow camera's near plane
        is 0, so a surface sitting exactly on the plane renders at zero depth, which
        the depth material paints at full opacity — the whole disc goes black.
      */}
      <ContactShadows
        position={[0, PLINTH.top + 0.0015, 0]}
        scale={PLINTH.radius * 2}
        resolution={256}
        blur={2.2}
        opacity={0.72}
        far={0.24}
        frames={reduced ? 1 : Infinity}
      />
    </group>
  )
})
