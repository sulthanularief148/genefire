'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { scroll, useScene } from '@/lib/useScene'
import { radialRamp } from './radialRamp'

/**
 * The switchgear room sections 02 and 03 take place inside.
 *
 * Dimensions are deliberate: 3.0 × 2.5 × 2.0 m is exactly 15 m³, which is the
 * protected volume assets/products.json gives for the SX 300 — the unit that
 * discharges here. The room is the spec figure, made physical. Nothing on screen
 * states a volume, so this is not a claim; it is just the reason a viewer who
 * checks later finds the numbers agree.
 *
 * A cutaway — floor, back wall, side wall — seen from outside, with its volume
 * traced. Three planes, one edge set, one heat glow, and the twenty-eight status
 * LEDs in one instanced call.
 */

const ROOM = { w: 3.0, h: 2.5, d: 2.0 }

/** Racks: two columns against the back wall. */
const RACK = { w: 0.6, h: 2.0, d: 0.8 }
const RACK_X = [-0.72, 0.72]

/** Status LEDs per rack column. */
const LED_ROWS = 14

const LED_VERTEX = /* glsl */ `
  attribute vec3 aSeed;
  varying vec3 vSeed;

  void main() {
    vSeed = aSeed;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`

const LED_FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform float uProblem;      // 0..1 across section 02
  uniform float uActivation;   // 0..1 across section 03
  uniform float uTime;

  varying vec3 vSeed;

  const vec3 COOL = vec3(0.32, 0.86, 0.95);   // healthy cyan
  const vec3 WARM = vec3(1.00, 0.46, 0.12);   // thermal warning

  void main() {
    // Everything below is a pure function of the two progress values plus an
    // additive time term for the flicker. No state carried between frames, so a
    // backwards scrub restores the exact same pattern of dead LEDs.
    float restored = smoothstep(0.80, 1.0, uActivation);

    // Distress rises through section 02 and holds until the unit has done its
    // work; then the room comes back.
    float distress = mix(uProblem, 0.0, restored);

    // Each LED has its own threshold, so they drop out one by one rather than
    // all at once.
    float dropout = step(vSeed.x, distress * 0.85) * (1.0 - restored);

    // Flicker gets faster and deeper as the room heats up.
    float rate = 6.0 + vSeed.y * 26.0;
    float flicker = mix(1.0, 0.25 + 0.75 * abs(sin(uTime * rate + vSeed.z * 30.0)), distress);

    vec3 col = mix(COOL, WARM, distress);
    float on = (1.0 - dropout) * flicker;

    gl_FragColor = vec4(col * on, 1.0);
  }
`

/** One unit box's edges, scaled to the room: the protected volume, traced. */
const ROOM_EDGES = new THREE.EdgesGeometry(new THREE.BoxGeometry(1, 1, 1))

/** Where the fire starts: low in front of the right-hand rack, where the embers rise. */
export const FIRE_ORIGIN: [number, number, number] = [0.34, 0.55, -ROOM.d / 2 + 0.62]

/* Edge colours through the story: healthy steel, fault red, suppressed gold. */
const EDGE_CALM = new THREE.Color('#5d6875')
const EDGE_FAULT = new THREE.Color('#ff4a1c').multiplyScalar(1.3)
const EDGE_SAFE = new THREE.Color('#FF9E4F').multiplyScalar(1.1)

/* The floor: near-black, drifting to a scorched warm tone as the fault develops. */
const FLOOR_CALM = new THREE.Color('#0a0a0d')
const FLOOR_WARM = new THREE.Color('#2a120a')

export function Cabinet() {
  const leds = useRef<THREE.InstancedMesh>(null)
  const ledMaterial = useRef<THREE.ShaderMaterial>(null)
  const roomMaterial = useRef<THREE.MeshStandardMaterial>(null)
  const edgeMaterial = useRef<THREE.LineBasicMaterial>(null)
  const heatMaterial = useRef<THREE.MeshBasicMaterial>(null)
  const heat = useRef<THREE.Mesh>(null)
  const reduced = useScene((s) => s.reduced)
  const heatRamp = useMemo(
    () =>
      radialRamp([
        [0, 0.9],
        [0.3, 0.45],
        [0.65, 0.1],
        [1, 0],
      ]),
    [],
  )

  const ledCount = LED_ROWS * RACK_X.length

  const ledSeeds = useMemo(() => {
    const seeds = new Float32Array(ledCount * 3)
    let seed = 0x1f123bb5
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }
    for (let i = 0; i < ledCount; i++) {
      seeds[i * 3] = rand()
      seeds[i * 3 + 1] = rand()
      seeds[i * 3 + 2] = rand()
    }
    return new THREE.InstancedBufferAttribute(seeds, 3)
  }, [ledCount])

  const ledUniforms = useMemo(
    () => ({
      uProblem: { value: 0 },
      uActivation: { value: 0 },
      uTime: { value: 0 },
    }),
    [],
  )

  // Instance transforms are static, so they are written once rather than per frame.
  useLayoutEffect(() => {
    const mesh = leds.current
    if (!mesh) return
    const m = new THREE.Matrix4()
    let i = 0
    for (const x of RACK_X) {
      for (let row = 0; row < LED_ROWS; row++) {
        const y = 0.28 + (row / (LED_ROWS - 1)) * (RACK.h - 0.45)
        m.makeTranslation(x + RACK.w * 0.28, y, -ROOM.d / 2 + RACK.d + 0.005)
        mesh.setMatrixAt(i++, m)
      }
    }
    mesh.instanceMatrix.needsUpdate = true
  }, [])

  useFrame((state) => {
    const problem = reduced ? 1 : scroll.problem
    const activation = reduced ? 1 : scroll.activation

    if (ledMaterial.current) {
      ledMaterial.current.uniforms.uProblem.value = problem
      ledMaterial.current.uniforms.uActivation.value = activation
      ledMaterial.current.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime
    }

    // The room itself drifts warm as the fault develops and cools once the
    // aerosol has done its work.
    const restored = activation > 0 ? Math.min(1, Math.max(0, (activation - 0.8) / 0.2)) : 0
    const suppressing = Math.min(1, Math.max(0, (activation - 0.35) / 0.3))
    const warm = Math.max(0, problem - restored)
    // Lerped between two sRGB-authored colours. It used to be setRGB(0.02, …),
    // which is LINEAR — about #262629 once encoded, five times the #050506 the
    // floor was authored at, and the key light turned it into a pale grey slab.
    roomMaterial.current?.color.copy(FLOOR_CALM).lerp(FLOOR_WARM, warm)

    // The traced volume tells the same story in one line: steel while the room is
    // healthy, red as the fault develops, gold once the unit has done its work.
    if (edgeMaterial.current) {
      const c = edgeMaterial.current.color
      c.copy(EDGE_CALM).lerp(EDGE_FAULT, Math.min(1, problem * 1.2) * (1 - restored))
      c.lerp(EDGE_SAFE, restored)
    }

    // The heat itself, where it starts: grows through §02, dies as the aerosol
    // floods in §03. Faces the camera, and flickers.
    if (heatMaterial.current) {
      const burn = Math.min(1, problem * 1.3) * (1 - suppressing)
      const flicker = reduced ? 1 : 0.85 + Math.sin(state.clock.elapsedTime * 9.0) * 0.08 + Math.sin(state.clock.elapsedTime * 23.0) * 0.05
      heatMaterial.current.opacity = 0.55 * burn * flicker
    }
    heat.current?.quaternion.copy(state.camera.quaternion)
  })

  return (
    <group>
      {/*
        A CUTAWAY: floor, back wall and the left wall, open at the front, the top
        and the right. The camera now stands outside the room and looks into it
        from the front-right, with the room in the inline-end half of the frame.

        It used to be a closed inverted box with the camera pushed inside it, so
        the two racks filled the whole frame and their LED columns ran straight
        through the copy. Seen from outside, the room reads as a room — a volume
        with a fault in it — and the copy has its own half of the screen.

        One material for all three planes. Near-black on purpose: the studio rig
        exists to light METAL PRODUCTS, and letting it light these walls turns a
        dark switchgear space into a lit brown box. The room is lit by its own
        LEDs and by whatever is burning in it.
      */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.d]} />
        <meshStandardMaterial
          ref={roomMaterial}
          color={FLOOR_CALM}
          roughness={0.92}
          metalness={0.08}
          envMapIntensity={0.14}
        />
      </mesh>
      <mesh position={[0, ROOM.h / 2, -ROOM.d / 2]} receiveShadow>
        <planeGeometry args={[ROOM.w, ROOM.h]} />
        <meshStandardMaterial color="#060608" roughness={0.94} metalness={0.06} envMapIntensity={0.14} />
      </mesh>
      <mesh position={[-ROOM.w / 2, ROOM.h / 2, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
        <planeGeometry args={[ROOM.d, ROOM.h]} />
        <meshStandardMaterial color="#050507" roughness={0.94} metalness={0.06} envMapIntensity={0.14} />
      </mesh>

      {/* The room's 15 m³, traced — see the edge colours above. */}
      <lineSegments geometry={ROOM_EDGES} scale={[ROOM.w, ROOM.h, ROOM.d]} position={[0, ROOM.h / 2, 0]}>
        <lineBasicMaterial ref={edgeMaterial} color={EDGE_CALM} toneMapped={false} />
      </lineSegments>

      {/* The fire's glow, at its origin. Additive, flat to the camera, no edge. */}
      <mesh ref={heat} position={FIRE_ORIGIN} renderOrder={4}>
        <planeGeometry args={[1.3, 1.3]} />
        <meshBasicMaterial
          ref={heatMaterial}
          color="#ff5a1f"
          alphaMap={heatRamp ?? undefined}
          transparent
          opacity={0}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </mesh>

      {/* Rack columns. Two of them, so two plain meshes: instancing is for the
          dozens of repeats in the applications section, not for a pair. */}
      {RACK_X.map((x) => (
        <mesh key={x} position={[x, RACK.h / 2, -ROOM.d / 2 + RACK.d / 2]} castShadow receiveShadow>
          <boxGeometry args={[RACK.w, RACK.h, RACK.d]} />
          <meshStandardMaterial
            color="#0B0D10"
            roughness={0.68}
            metalness={0.5}
            envMapIntensity={0.35}
          />
        </mesh>
      ))}

      {/* Status LEDs. One instanced draw call, all behaviour in the shader. */}
      <instancedMesh ref={leds} args={[undefined, undefined, ledCount]}>
        <planeGeometry args={[0.045, 0.012]}>
          <primitive object={ledSeeds} attach="attributes-aSeed" />
        </planeGeometry>
        <shaderMaterial
          ref={ledMaterial}
          vertexShader={LED_VERTEX}
          fragmentShader={LED_FRAGMENT}
          uniforms={ledUniforms}
          toneMapped={false}
        />
      </instancedMesh>
    </group>
  )
}

export const ROOM_DIMENSIONS = ROOM
