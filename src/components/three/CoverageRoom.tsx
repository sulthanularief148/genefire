'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useTranslations } from 'next-intl'
import * as THREE from 'three'

import { smoothstep } from '@/lib/anim'
import { stepGrab } from '@/lib/grab'
import { isHeroSplit } from '@/lib/heroLayout'
import { recommendUnit, unitsNeeded } from '@/lib/products'
import { useScene } from '@/lib/useScene'
import { PRODUCT_MODELS } from './products'
import { DecalPoseContext } from './ProductDecals'
import { dressProduct } from './dressProduct'
import { AMBER, NO_SHADOW_LAYER, rimColour } from './stageLight'

/**
 * Section 06 — the enclosure the calculator is sizing, drawn live.
 *
 * A CUTAWAY: floor, back wall and one side wall, open at the front and the top, so
 * the reader looks INTO the volume rather than at the outside of a grey box — which
 * is what the previous inverted cube read as. The whole volume is traced in gold
 * edges, its three dimensions are labelled on those edges, and an amber fill floods
 * it from the floor up every time the size changes: the discharge the calculation
 * is about, drawn at the size being asked about.
 *
 * The recommended unit is on the back wall at TRUE RELATIVE SCALE — standing
 * upright, as installed — with as many as the helper says are required. A 300 g
 * canister in a 15 m³ room is small; that is a fact about the product a number
 * cannot convey, and a pulsing ring round each one is what lets the eye find it.
 *
 * Everything eases toward the entered dimensions, so a typed digit never snaps.
 */

const COVERAGE_MODES = 'coverage'

/** Stands a unit on its base: model +Z onto world +Y. */
const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]

/** One unit box, scaled — any room from the same geometry. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const UNIT_EDGES = new THREE.EdgesGeometry(UNIT_BOX)

/** How long the flood takes, seconds, after the size last changed. */
const FLOOD_SECONDS = 1.6

export function CoverageRoom() {
  const room = useScene((s) => s.room)
  const mode = useScene((s) => s.mode)
  const reduced = useScene((s) => s.reduced)
  const t = useTranslations('unit')

  const volume = room.l * room.w * room.h
  const unit = recommendUnit(volume)
  const count = Math.min(unitsNeeded(volume), 6)
  const Model = PRODUCT_MODELS[unit.id]

  const group = useRef<THREE.Group>(null)
  const scaled = useRef<THREE.Group>(null)
  const floor = useRef<THREE.Mesh>(null)
  const back = useRef<THREE.Mesh>(null)
  const side = useRef<THREE.Mesh>(null)
  const fill = useRef<THREE.Mesh>(null)
  const fillMat = useRef<THREE.MeshBasicMaterial>(null)
  const edges = useRef<THREE.LineSegments>(null)
  const units = useRef<THREE.Group>(null)
  const rings = useRef<Array<THREE.Mesh | null>>([])
  const labelL = useRef<THREE.Group>(null)
  const labelW = useRef<THREE.Group>(null)
  const labelH = useRef<THREE.Group>(null)
  const dressed = useRef<string>('')
  const owned = useRef<THREE.Material[]>([])

  /** The eased dimensions the drawing is at, as opposed to the entered ones. */
  const size = useRef(new THREE.Vector3(room.l, room.h, room.w))
  /** Clock time the entered size last changed — restarts the flood. */
  const changedAt = useRef(-Infinity)
  const lastRoom = useRef(room)

  const edgeColour = useMemo(() => rimColour().multiplyScalar(0.85), [])

  useEffect(() => {
    edges.current?.layers.set(NO_SHADOW_LAYER)
    fill.current?.layers.set(NO_SHADOW_LAYER)
    const materials = owned.current
    return () => materials.forEach((m) => m.dispose())
  }, [])

  // Beside the form only. Stacked, the calculator fills the screen and a room
  // drawn behind its fields is noise, not illustration.
  const split = useThree((s) => isHeroSplit(s.size.width, s.size.height))

  useFrame((state, dt) => {
    const g = group.current
    if (!g) return
    g.visible = mode === COVERAGE_MODES && split
    if (!g.visible) return

    const time = state.clock.elapsedTime
    if (lastRoom.current !== room) {
      lastRoom.current = room
      changedAt.current = time
    }

    // Ease toward the entered dimensions.
    const s = size.current
    const k = reduced ? 1 : 1 - Math.exp(-6 * dt)
    s.x += (room.l - s.x) * k
    s.y += (room.h - s.y) * k
    s.z += (room.w - s.z) * k

    // The reader's turn of the room, sprung slowly back to the designed view.
    g.rotation.y = stepGrab('coverage', dt, { spring: 0.5, limit: 1.3 })

    const [L, H, W] = [s.x, s.y, s.z]
    if (floor.current) floor.current.scale.set(L, W, 1)
    if (back.current) {
      back.current.scale.set(L, H, 1)
      back.current.position.set(0, H / 2, -W / 2)
    }
    if (side.current) {
      side.current.scale.set(W, H, 1)
      side.current.position.set(-L / 2, H / 2, 0)
    }
    if (edges.current) {
      edges.current.scale.set(L, H, W)
      edges.current.position.y = H / 2
    }

    // The flood: the fill rises from the floor over FLOOD_SECONDS after each
    // change, then settles to a faint haze that breathes.
    const since = time - changedAt.current
    const rise = reduced ? 1 : smoothstep(0, FLOOD_SECONDS, since)
    const surge = reduced ? 0 : 1 - smoothstep(FLOOD_SECONDS, FLOOD_SECONDS + 1.2, since)
    if (fill.current && fillMat.current) {
      const fh = Math.max(0.001, H * rise)
      fill.current.scale.set(L * 0.998, fh, W * 0.998)
      fill.current.position.y = fh / 2
      fillMat.current.opacity = 0.06 + surge * 0.1 + (reduced ? 0 : Math.sin(time * 1.4) * 0.012)
    }

    // Units along the back wall, high, spread evenly.
    if (units.current) {
      const kids = units.current.children
      for (let i = 0; i < kids.length; i++) {
        const spacing = L / (kids.length + 1)
        kids[i].position.set(-L / 2 + spacing * (i + 1), H * 0.62, -W / 2 + 0.07)
      }
    }
    for (let i = 0; i < rings.current.length; i++) {
      const ring = rings.current[i]
      if (!ring) continue
      const phase = reduced ? 0.4 : (time * 0.7 + i * 0.25) % 1
      ring.scale.setScalar(1 + phase * 2.4)
      ;(ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) * 0.8
    }

    // Dimension labels at the middle of three edges.
    labelL.current?.position.set(0, 0, W / 2 + 0.12)
    labelW.current?.position.set(L / 2 + 0.12, 0, 0)
    labelH.current?.position.set(L / 2, H / 2, -W / 2)

    if (units.current && dressed.current !== unit.id) {
      if (dressProduct(units.current, owned.current) > 0) dressed.current = unit.id
    }
  })

  const grid = useMemo(() => floorGrid(), [])

  return (
    <group ref={group} visible={false}>
      <group ref={scaled}>
        {/* The floor, gridded in eighths so the size reads as a measurement. */}
        <mesh ref={floor} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial
            color="#14171c"
            emissive="#B08A3E"
            emissiveMap={grid ?? undefined}
            emissiveIntensity={0.45}
            roughness={0.85}
            metalness={0.1}
            envMapIntensity={0.3}
          />
        </mesh>

        {/* Back and side walls — the cutaway. Faintly lit, so the volume has
            something behind it without the walls becoming the subject. */}
        <mesh ref={back} receiveShadow>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#171a20" roughness={0.9} envMapIntensity={0.25} />
        </mesh>
        <mesh ref={side} rotation={[0, Math.PI / 2, 0]} receiveShadow>
          <planeGeometry args={[1, 1]} />
          <meshStandardMaterial color="#13161b" roughness={0.9} envMapIntensity={0.25} />
        </mesh>

        {/* The volume, traced. */}
        <lineSegments ref={edges} geometry={UNIT_EDGES}>
          <lineBasicMaterial color={edgeColour} toneMapped={false} transparent opacity={0.9} />
        </lineSegments>

        {/* The aerosol, filling it. */}
        <mesh ref={fill} geometry={UNIT_BOX} renderOrder={3}>
          <meshBasicMaterial
            ref={fillMat}
            color={AMBER}
            transparent
            opacity={0.08}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* The recommended unit(s), upright on the back wall. */}
        <group ref={units} key={`${unit.id}-${count}`}>
          {Model &&
            Array.from({ length: count }, (_, i) => (
              <group key={i}>
                <group rotation={UPRIGHT}>
                  <DecalPoseContext.Provider value="upright">
                    <Model />
                  </DecalPoseContext.Provider>
                </group>
                <mesh
                  ref={(el) => {
                    rings.current[i] = el
                  }}
                  position={[0, 0.08, 0.02]}
                >
                  <ringGeometry args={[0.07, 0.085, 40]} />
                  <meshBasicMaterial
                    color={AMBER}
                    transparent
                    depthWrite={false}
                    toneMapped={false}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </group>
            ))}
        </group>

        {/* Dimension labels — pictures of the three fields beside the room. */}
        {mode === COVERAGE_MODES && split && (
          <>
            <group ref={labelL}>
              <Html center zIndexRange={[5, 0]} wrapperClass="globe-label-wrap">
                <span className="room-label">
                  <bdi dir="ltr">
                    {room.l} {t('m')}
                  </bdi>
                </span>
              </Html>
            </group>
            <group ref={labelW}>
              <Html center zIndexRange={[5, 0]} wrapperClass="globe-label-wrap">
                <span className="room-label">
                  <bdi dir="ltr">
                    {room.w} {t('m')}
                  </bdi>
                </span>
              </Html>
            </group>
            <group ref={labelH}>
              <Html center zIndexRange={[5, 0]} wrapperClass="globe-label-wrap">
                <span className="room-label">
                  <bdi dir="ltr">
                    {room.h} {t('m')}
                  </bdi>
                </span>
              </Html>
            </group>
          </>
        )}
      </group>
    </group>
  )
}

/**
 * The floor's grid, as an emissive map: eight divisions across the floor whatever\n * its size. Proportional rather than metric — re-tiling it to the room every frame\n * would be wasteful — and eight reads as "measured" at every size the sliders reach.
 */
function floorGrid(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  // Black is no emission; the lines glow faintly in the material's gold.
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, size, size)
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 2
  const divisions = 8
  for (let i = 0; i <= divisions; i++) {
    const p = (i / divisions) * size
    ctx.beginPath()
    ctx.moveTo(p, 0)
    ctx.lineTo(p, size)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, p)
    ctx.lineTo(size, p)
    ctx.stroke()
  }
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = 4
  return texture
}
