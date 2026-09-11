'use client'

import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { smoothstep } from '@/lib/anim'
import {
  ENVIRONMENTS,
  drumIndexAt,
  environmentIndexAt,
  solveDimensions,
  type EnvironmentSpec,
} from '@/lib/environments'
import { grab, stepGrab } from '@/lib/grab'
import { scroll, useScene, useVisibleIn } from '@/lib/useScene'
import { PRODUCT_MODELS } from './products'
import { DecalPoseContext } from './ProductDecals'
import { dressProduct } from './dressProduct'
import { AMBER, rimColour } from './stageLight'

/**
 * Section 07 — six environments on a slowly rotating drum.
 *
 * Until real SketchUp scenes exist these are blocked out from primitives. That is
 * a deliberate stage in the pipeline, not a shortcut: the sketchup-to-web3d skill
 * says dimensions matter more than detail here, because the coverage story in §06
 * only holds if a 15 m³ cabinet is actually 15 m³. So every enclosure below is
 * SIZED FROM assets/products.json — the proportions are authored, the absolute
 * scale is solved so the volume matches the rated volume of the unit inside it.
 * Swap in real geometry later and the numbers still reconcile.
 *
 * The environments are the stage and the red product is the actor. Their albedo
 * is low and their materials desaturated; nothing here is brightened to compete.
 */

/** This scene belongs to section 07 and nowhere else. */
const APPLICATION_MODES = ['applications'] as const

/**
 * Where each environment sits in the stack, for a given fronted position.
 *
 * A STACK, not a drum. They used to sit round a ring 9 m in radius, which left the
 * camera looking at nine metres of nothing for the middle third of every turn —
 * the section went blank at each change of application. A tighter ring swung the
 * outgoing environment sideways straight across the copy column. Stacked, the
 * outgoing enclosure rises out of frame as the next rises in, both in the
 * inline-end half where the copy is not: an elevator, not a carousel.
 *
 * The gap between two neighbours is THEIR OWN heights, not a constant. The
 * enclosures run from 1.25 m to 2.5 m tall and the camera frames each to fit, so a
 * fixed 4.5 m gap put both of two small ones outside the frame mid-change. Half of
 * each plus a little air keeps the pair in frame together as they pass.
 */
const HEIGHTS = ENVIRONMENTS.map((env) => solveDimensions(env).dims[1])
const gapAfter = (k: number) => (HEIGHTS[k] + HEIGHTS[k + 1]) / 2 + 0.7

function stackOffset(index: number, at: number): number {
  const last = ENVIRONMENTS.length - 1
  const k = Math.min(Math.max(Math.floor(at), 0), last - 1)
  const f = at - k
  if (index === k) return f * gapAfter(k)
  if (index === k + 1) return -(1 - f) * gapAfter(k)
  if (index < k) {
    let y = f * gapAfter(k)
    for (let j = index; j < k; j++) y += gapAfter(j)
    return y
  }
  let y = -(1 - f) * gapAfter(k)
  for (let j = k + 1; j < index; j++) y -= gapAfter(j)
  return y
}

/**
 * Screen anchors for section 07. Distance and centre height are NOT here: they
 * are solved per environment in lib/environments.ts, because these enclosures
 * differ by a factor of thirty in volume and one fixed distance cannot frame
 * both a 0.5 m³ fume hood and a 15 m³ paint booth.
 */
export const APPLICATIONS_FRAMING = {
  anchorY: 0.56,
  // The inline-END half: the copy column sits at the inline-start edge.
  anchorX: 0.71,
} as const

export function Applications() {
  const visible = useVisibleIn(APPLICATION_MODES)
  const reduced = useScene((s) => s.reduced)
  const lowPower = useScene((s) => s.lowPower)

  // The heaviest scene on the site. Only the fronted environment and its two
  // neighbours are MOUNTED — the other three do not exist in the scene graph, so
  // they cost nothing to cull and nothing to skin.
  //
  // Driven from the SAME progress as the stack, not from the store's coarse
  // `progress`, which is written on scrub-complete only. Mounting needs React, so
  // it cannot be per-frame; the frame loop computes the bucket and calls setState
  // only when the integer CHANGES — five times across the whole section.
  const [activeIndex, setActiveIndex] = useState(0)

  useFrame((_, dt) => {
    // The reader's turn of the fronted environment: stepped once here, read by
    // each stage. Sprung back so it always comes home square to the camera.
    stepGrab('applications', dt, { spring: 1.2, limit: 0.9 })
    const next = environmentIndexAt(reduced ? 0 : scroll.applications)
    if (next !== activeIndex) setActiveIndex(next)
  })

  const mounted = useMemo(
    () =>
      ENVIRONMENTS.map((env, i) => ({ env, index: i, mounted: Math.abs(i - activeIndex) <= 1 })),
    [activeIndex],
  )

  return (
    <group visible={visible}>
      {mounted.map(({ env, index, mounted: isMounted }) =>
        isMounted ? (
          <EnvironmentStage key={env.id} env={env} index={index} lowPower={lowPower} reduced={reduced} />
        ) : null,
      )}
    </group>
  )
}

/** One unit box, scaled — every enclosure's edges and aerosol from one geometry. */
const UNIT_BOX = new THREE.BoxGeometry(1, 1, 1)
const UNIT_EDGES = new THREE.EdgesGeometry(UNIT_BOX)

/** Stands a unit on its base: model +Z (the barrel) onto world +Y. */
const UPRIGHT: [number, number, number] = [-Math.PI / 2, 0, 0]

/**
 * One environment, as a CUTAWAY: floor, back wall and one side wall, open at the
 * front and the top.
 *
 * It used to be a single inverted box, and what the camera saw was the outside of
 * a grey cube with three red dots floating in it — the units were mounted as
 * authored, barrel along +Z, so they pointed straight at the camera. Now the reader
 * looks into the volume, the volume is traced in gold, the units stand upright on
 * the back wall as installed, and an amber fill floods the space as the
 * environment comes round to face the camera: the discharge, at the size of the
 * enclosure it protects.
 *
 * No lights. Every environment that mounts or unmounts would change the scene's
 * light count, and a changed light count recompiles every material on the page —
 * a stall mid-scroll, which is exactly what this section cannot afford.
 */
function EnvironmentStage({
  env,
  index,
  lowPower,
  reduced,
}: {
  env: EnvironmentSpec
  index: number
  lowPower: boolean
  reduced: boolean
}) {
  const { dims } = useMemo(() => solveDimensions(env), [env])
  const [w, h, d] = dims
  const Model = PRODUCT_MODELS[env.productId]

  const props = useRef<THREE.InstancedMesh>(null)
  const group = useRef<THREE.Group>(null)
  const turn = useRef<THREE.Group>(null)
  const units = useRef<THREE.Group>(null)
  const fill = useRef<THREE.Mesh>(null)
  const fillMat = useRef<THREE.MeshBasicMaterial>(null)
  const edgeMat = useRef<THREE.LineBasicMaterial>(null)
  const dressed = useRef(false)
  const owned = useRef<THREE.Material[]>([])
  const edgeColour = useMemo(() => rimColour(), [])

  // Instance transforms are static; written once, never per frame.
  const matrices = useMemo(() => {
    const scratch = new THREE.Matrix4()
    const propList: THREE.Matrix4[] = []
    for (let i = 0; i < env.propCount; i++) {
      const t = env.propCount === 1 ? 0.5 : i / (env.propCount - 1)
      scratch.makeTranslation(
        (t - 0.5) * (w - env.propSize[0] * 1.2),
        env.propSize[1] / 2,
        -d / 2 + env.propSize[2] / 2 + 0.05,
      )
      propList.push(scratch.clone())
    }
    return propList
  }, [env, w, d])

  useLayoutEffect(() => {
    const mesh = props.current
    if (!mesh) return
    matrices.forEach((m, i) => mesh.setMatrixAt(i, m))
    mesh.instanceMatrix.needsUpdate = true
  }, [matrices])

  useLayoutEffect(() => {
    const materials = owned.current
    return () => materials.forEach((m) => m.dispose())
  }, [])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    if (!dressed.current && units.current) {
      dressed.current = dressProduct(units.current, owned.current) > 0
    }

    // Settle the environment as it comes square to the camera. Measured in drum
    // index, not raw progress, so it tracks the dwell. Pure function of progress.
    const at = drumIndexAt(reduced ? 0 : scroll.applications)
    const nearness = 1 - Math.min(1, Math.abs(at - index))
    g.scale.setScalar(0.82 + smoothstep(0, 1, nearness) * 0.18)
    // Earlier environments above, later ones below; the stack rises through the
    // frame as the section scrolls.
    g.position.y = stackOffset(index, at)
    // Neighbours only while a change is under way. At rest the one above would
    // hang over the fronted enclosure's open top, seen from the camera's height.
    g.visible = nearness > 0.01

    // Only the environment facing the camera turns under the reader's hand.
    if (turn.current) turn.current.rotation.y = grab.applications.yaw * nearness

    // The flood rises as it arrives, and the edges light with it.
    const rise = smoothstep(0.45, 1, nearness)
    if (fill.current && fillMat.current) {
      const fh = Math.max(0.001, h * rise)
      fill.current.scale.set(w * 0.996, fh, d * 0.996)
      fill.current.position.y = fh / 2
      fillMat.current.opacity = 0.07 * rise + Math.sin(state.clock.elapsedTime * 1.3 + index) * 0.01 * rise
    }
    edgeMat.current?.color.copy(edgeColour).multiplyScalar(0.25 + 0.75 * rise)
  })

  return (
    <group ref={group}>
      <group ref={turn}>
        {/* Floor, back wall, side wall. Low albedo: the stage, not the actor. */}
        <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow={!lowPower}>
          <planeGeometry args={[w, d]} />
          <meshStandardMaterial color="#15181d" roughness={0.9} metalness={0.08} envMapIntensity={0.3} />
        </mesh>
        <mesh position={[0, h / 2, -d / 2]} receiveShadow={!lowPower}>
          <planeGeometry args={[w, h]} />
          <meshStandardMaterial color="#181b21" roughness={0.92} envMapIntensity={0.28} />
        </mesh>
        <mesh position={[-w / 2, h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow={!lowPower}>
          <planeGeometry args={[d, h]} />
          <meshStandardMaterial color="#13161b" roughness={0.92} envMapIntensity={0.28} />
        </mesh>

        {/* The protected volume, traced. */}
        <lineSegments geometry={UNIT_EDGES} scale={[w, h, d]} position={[0, h / 2, 0]}>
          <lineBasicMaterial ref={edgeMat} color="#000000" toneMapped={false} />
        </lineSegments>

        {/* Repeated equipment — racks, shelves, seats, converter blocks. Instanced,
            so dozens of them are one draw call. Lighter than the walls, so the
            shapes of the space read. */}
        <instancedMesh ref={props} args={[undefined, undefined, env.propCount]} castShadow={!lowPower}>
          <boxGeometry args={env.propSize} />
          <meshStandardMaterial color="#23272e" roughness={0.6} metalness={0.45} envMapIntensity={0.45} />
        </instancedMesh>

        {/* The aerosol, flooding the volume. */}
        <mesh ref={fill} geometry={UNIT_BOX} renderOrder={3}>
          <meshBasicMaterial
            ref={fillMat}
            color={AMBER}
            transparent
            opacity={0}
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </mesh>

        {/* The installed units, at TRUE SCALE, upright on the back wall and high,
            as they would be installed. */}
        <group ref={units}>
          {Array.from({ length: env.unitCount }, (_, i) => {
            const t = env.unitCount === 1 ? 0.5 : i / (env.unitCount - 1)
            return (
              <group key={i} position={[(t - 0.5) * w * 0.6, h * 0.66, -d / 2 + 0.07]}>
                <group rotation={UPRIGHT}>
                  <DecalPoseContext.Provider value="upright">
                    <Model />
                  </DecalPoseContext.Provider>
                </group>
              </group>
            )
          })}
        </group>
      </group>
    </group>
  )
}
