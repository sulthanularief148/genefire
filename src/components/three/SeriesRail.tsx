'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { RoundedBox } from '@react-three/drei'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

import { smoothstep } from '@/lib/anim'
import { SERIES_STAGES, SLAB, seriesStageAt, type SeriesStageLayout } from '@/lib/seriesStage'
import { grab, stepGrab } from '@/lib/grab'
import { scroll, useScene, useVisibleIn } from '@/lib/useScene'
import { PRODUCT_MODELS } from './products'
import { DecalPoseContext } from './ProductDecals'
import { dressProduct } from './dressProduct'
import { radialRamp } from './radialRamp'
import { AMBER, NO_SHADOW_LAYER, rimColour } from './stageLight'

/**
 * Section 04 — the three series, each on its own display plinth, on a rail.
 *
 * Layout, beats and framing live in lib/seriesStage.ts. This file draws them.
 *
 * The plinths are the hero turntable's furniture in a longer form — the same dark
 * body, the same hairline of amber light along the front edge, the same warm spill
 * on the floor — so §01 and §04 read as one set.
 *
 * The units STAND UP here. The models are authored with the barrel along +Z (which
 * contradicts hard rule 9), and the rail used to mount them as authored: every unit
 * pointed at the camera and read as a red dot. The PX 5 is the exception and lies
 * down, as it does on the turntable — see LIES_FLAT.
 */

/** This scene belongs to section 04 and nowhere else. */
const SERIES_MODES = ['series'] as const

/** Stands a unit on its base: model +Z (the barrel) onto world +Y. */
const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]
/** Lays a unit along world +X with its handle on top. */
const LYING: [number, number, number] = [0, Math.PI / 2, 0]

/** How far a plinth sits below the floor before it rises into place. */
const SUNK = 0.14

/** The soft dark shadow each unit leaves on the slab. */
const BLOB = radialRampOnce([
  [0, 0.9],
  [0.35, 0.55],
  [0.7, 0.12],
  [1, 0],
])

/** The rim's warm spill on the floor in front of the plinth. */
const SPILL = radialRampOnce([
  [0, 0.7],
  [0.4, 0.28],
  [0.75, 0.06],
  [1, 0],
])

/** Module-level memo: the textures are the same for every plinth. */
function radialRampOnce(stops: ReadonlyArray<readonly [number, number]>) {
  let texture: THREE.CanvasTexture | null | undefined
  return () => {
    if (texture === undefined) texture = radialRamp(stops)
    return texture
  }
}

export function SeriesRail({ sign }: { sign: 1 | -1 }) {
  // Owned by the active section: scroll.series stays at 1 once passed, so gating
  // on it would leave the whole rail on screen through sections 05 and 06.
  const visible = useVisibleIn(SERIES_MODES)

  // The reader's turn of the plinth on show: limited, and sprung back so the row
  // always comes home to face the copy. Stepped once here; each plinth reads it.
  useFrame((_, dt) => {
    stepGrab('series', dt, { spring: 1.4, limit: 0.9 })
  })

  return (
    <group visible={visible}>
      {SERIES_STAGES.map((stage) => (
        <Plinth key={stage.id} stage={stage} sign={sign} />
      ))}
    </group>
  )
}

function Plinth({ stage, sign }: { stage: SeriesStageLayout; sign: 1 | -1 }) {
  const reduced = useScene((s) => s.reduced)
  const camera = useThree((s) => s.camera)

  const group = useRef<THREE.Group>(null)
  const units = useRef<Array<THREE.Group | null>>([])
  const products = useRef<THREE.Group>(null)
  const edge = useRef<THREE.Mesh>(null)
  const spill = useRef<THREE.Mesh>(null)
  const blobs = useRef<THREE.Mesh>(null)
  const edgeMat = useRef<THREE.MeshBasicMaterial>(null)
  const spillMat = useRef<THREE.MeshBasicMaterial>(null)
  const dressed = useRef(false)
  const owned = useRef<THREE.Material[]>([])

  useEffect(() => {
    for (const mesh of [edge.current, spill.current, blobs.current]) {
      mesh?.layers.set(NO_SHADOW_LAYER)
    }
    camera.layers.enable(NO_SHADOW_LAYER)
    const materials = owned.current
    return () => materials.forEach((m) => m.dispose())
  }, [camera])

  /**
   * Every unit's shadow on the slab, as ONE geometry.
   *
   * Not a ContactShadows: that is a full depth render of the scene plus two blur
   * passes, every frame, per instance. The units only sway in place, so a soft
   * blob under each footprint is indistinguishable at this size and costs one draw
   * call for the whole plinth.
   */
  const blobGeometry = useMemo(() => {
    const planes = stage.slots.map((slot) => {
      const plane = new THREE.PlaneGeometry(slot.width * 1.9 + 0.02, slot.depth * 1.9 + 0.02)
      plane.rotateX(-Math.PI / 2)
      plane.translate(slot.x, SLAB.height + 0.0008, 0)
      return plane
    })
    const merged = mergeGeometries(planes)
    planes.forEach((p) => p.dispose())
    return merged
  }, [stage])

  useEffect(() => () => blobGeometry?.dispose(), [blobGeometry])

  const edgeColour = useMemo(() => rimColour(), [])

  useFrame((state) => {
    const g = group.current
    if (!g) return

    if (!dressed.current && products.current) {
      dressed.current = dressProduct(products.current, owned.current) > 0
    }

    const s = reduced ? stage.index : seriesStageAt(scroll.series)
    // How centred this plinth is, 0 … 1. Pure function of progress.
    const nearness = Math.max(0, 1 - Math.abs(s - stage.index))
    g.visible = nearness > 0.02

    // The plinth rises out of the floor as it arrives and sinks as it leaves.
    const rise = smoothstep(0, 0.7, nearness)
    g.position.y = (1 - rise) * -SUNK
    // Only the plinth on show turns under the reader's hand.
    g.rotation.y = grab.series.yaw * nearness

    // The units arrive one after another, left to right in the row's own order,
    // growing up from the slab — each from its own base, so nothing passes
    // through the plinth on the way.
    const count = stage.slots.length
    const time = state.clock.elapsedTime
    for (let j = 0; j < count; j++) {
      const unit = units.current[j]
      if (!unit) continue
      const start = 0.3 + (count > 1 ? (j / (count - 1)) * 0.3 : 0)
      const pop = reduced ? 1 : smoothstep(start, start + 0.4, nearness)
      unit.scale.setScalar(Math.max(0.001, pop))
      // A slow sway about the presentation angle rather than a full turn: a unit
      // that revolves spends half its time showing the camera its blank back, and
      // this row is read flat-on.
      unit.rotation.y = reduced ? 0 : Math.sin(time * 0.35 + j * 1.3 + stage.index) * 0.32
    }

    // The edge light strikes as the plinth settles.
    const glow = smoothstep(0.55, 1, nearness)
    edgeMat.current?.color.copy(edgeColour).multiplyScalar(glow)
    if (spillMat.current) spillMat.current.opacity = 0.16 * glow
  })

  return (
    <group ref={group} position={[sign * stage.railX, -SUNK, 0]}>
      {/* The slab. */}
      <RoundedBox
        args={[stage.slabWidth, SLAB.height, stage.slabDepth]}
        radius={0.006}
        smoothness={3}
        position={[0, SLAB.height / 2, 0]}
        receiveShadow
      >
        <meshStandardMaterial color="#101216" roughness={0.3} metalness={0.78} envMapIntensity={0.55} />
      </RoundedBox>

      {/* The hairline of light along the front top edge. */}
      <mesh
        ref={edge}
        position={[0, SLAB.height - 0.0014, stage.slabDepth / 2 + 0.0004]}
      >
        <boxGeometry args={[stage.slabWidth - 0.014, 0.0022, 0.0022]} />
        <meshBasicMaterial ref={edgeMat} color="#000000" toneMapped={false} />
      </mesh>

      {/* Its warm spill on the floor, in front of the plinth. */}
      <mesh
        ref={spill}
        position={[0, 0.0015, stage.slabDepth / 2 + 0.05]}
        rotation={[-Math.PI / 2, 0, 0]}
        renderOrder={2}
      >
        <planeGeometry args={[stage.slabWidth * 1.5, stage.slabDepth * 2.2]} />
        <meshBasicMaterial
          ref={spillMat}
          color={AMBER}
          alphaMap={SPILL() ?? undefined}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* The units' shadows on the slab. */}
      {blobGeometry && (
        <mesh ref={blobs} geometry={blobGeometry} renderOrder={1}>
          <meshBasicMaterial
            color="#000000"
            alphaMap={BLOB() ?? undefined}
            transparent
            opacity={0.62}
            depthWrite={false}
          />
        </mesh>
      )}

      <group ref={products}>
        {stage.slots.map((slot, j) => {
          const Model = PRODUCT_MODELS[slot.id]
          if (!Model) return null
          return (
            <group key={slot.id} position={[slot.x, SLAB.height, 0]}>
              {/* Sway and growth on this group; attitude on the one inside it —
                  THREE.Euler 'XYZ' composes as Rx·Ry·Rz, so the two must never
                  share an object. */}
              <group
                ref={(el) => {
                  units.current[j] = el
                }}
                scale={0.001}
              >
                <group position={slot.offset} rotation={slot.lying ? LYING : UPRIGHT}>
                  <DecalPoseContext.Provider value={slot.lying ? 'lying' : 'upright'}>
                    <Model />
                  </DecalPoseContext.Provider>
                </group>
              </group>
            </group>
          )
        })}
      </group>
    </group>
  )
}
