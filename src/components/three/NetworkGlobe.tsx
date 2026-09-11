'use client'

import { useEffect, useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import { useTranslations } from 'next-intl'
import * as THREE from 'three'

import { lerp, smoothstep } from '@/lib/anim'
import { stepGrab } from '@/lib/grab'
import { GLOBE_POINTS, LAND_MASK_B64 } from '@/lib/globeMask'
import { isHeroSplit } from '@/lib/heroLayout'
import {
  ARC_WINDOWS,
  CONTACT_FOCUS,
  GLOBE,
  HOME_FOCUS,
  NETWORK_ARCS,
  NETWORK_FOCUS,
  NETWORK_NODES,
  faceTowards,
  fibonacciPoint,
  latLonToUnit,
  type NetworkNodeId,
} from '@/lib/network'
import { isPinnedAtTier } from '@/lib/tier'
import { scroll, useScene, useVisibleIn } from '@/lib/useScene'
import { radialRamp } from './radialRamp'
import { AMBER, NO_SHADOW_LAYER, rimColour } from './stageLight'

/**
 * The About section's globe: GENEFIRE's presences as points of light on a dotted
 * Earth, joined by arcs from the brand to each of them.
 *
 * What is on the map, and on what authority, is in lib/network.ts — nothing here
 * adds to it. Every name the globe shows is also real DOM text in the About
 * section; the labels here are a picture of that list, and the canvas they live in
 * is aria-hidden.
 *
 * ELEVEN DRAW CALLS: the body, the land dots, the graticule, the halo, two arcs,
 * two travelling pulses and three markers. The continents are one Points object —
 * 4 600 dots from a 2 KB bitmask (scripts/gen-globe.mjs), not a texture and not a
 * mesh.
 */

/** About, and again under Contact as a horizon. */
const GLOBE_MODES = ['about', 'contact'] as const

/** Dot colours: steel on the far-off continents, gold where the network is. */
const DOT_BASE = new THREE.Color('#7d8896')
const DOT_WARM = new THREE.Color('#e0a458')

/** Angular radius, radians, of the warm tint round each node. */
const TINT_NEAR = 0.05
const TINT_FAR = 0.26

/** How far the arcs rise off the surface at their middle, as a share of the radius. */
const ARC_LIFT = 0.2

function landPoints() {
  const bytes = Uint8Array.from(atob(LAND_MASK_B64), (c) => c.charCodeAt(0))
  const nodeDirs = NETWORK_NODES.map((n) => new THREE.Vector3(...latLonToUnit(n.lat, n.lon)))
  const positions: number[] = []
  const colours: number[] = []
  const v = new THREE.Vector3()
  const c = new THREE.Color()
  for (let i = 0; i < GLOBE_POINTS; i++) {
    if (!(bytes[i >> 3] & (1 << (i & 7)))) continue
    v.set(...fibonacciPoint(i, GLOBE_POINTS))
    let warm = 0
    for (const dir of nodeDirs) {
      warm = Math.max(warm, 1 - smoothstep(TINT_NEAR, TINT_FAR, v.angleTo(dir)))
    }
    c.copy(DOT_BASE).lerp(DOT_WARM, warm * 0.85)
    positions.push(v.x * GLOBE.radius * 1.002, v.y * GLOBE.radius * 1.002, v.z * GLOBE.radius * 1.002)
    colours.push(c.r, c.g, c.b)
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colours, 3))
  return geometry
}

/** Parallels every 30° and meridians every 30°, as one set of line segments. */
function graticule() {
  const r = GLOBE.radius * 1.001
  const points: number[] = []
  const push = (lat: number, lon: number) => {
    const [x, y, z] = latLonToUnit(lat, lon)
    points.push(x * r, y * r, z * r)
  }
  const step = 3
  for (let lat = -60; lat <= 60; lat += 30) {
    for (let lon = -180; lon < 180; lon += step) {
      push(lat, lon)
      push(lat, lon + step)
    }
  }
  for (let lon = -180; lon < 180; lon += 30) {
    for (let lat = -84; lat < 84; lat += step) {
      push(lat, lon)
      push(lat + step, lon)
    }
  }
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(points, 3))
  return geometry
}

/** The great circle between two nodes, lifted off the surface toward its middle. */
function arcCurve(from: NetworkNodeId, to: NetworkNodeId) {
  const a = NETWORK_NODES.find((n) => n.id === from)!
  const b = NETWORK_NODES.find((n) => n.id === to)!
  const va = new THREE.Vector3(...latLonToUnit(a.lat, a.lon))
  const vb = new THREE.Vector3(...latLonToUnit(b.lat, b.lon))
  const angle = va.angleTo(vb)
  const samples: THREE.Vector3[] = []
  const qa = new THREE.Quaternion()
  const axis = new THREE.Vector3().crossVectors(va, vb).normalize()
  for (let i = 0; i <= 48; i++) {
    const t = i / 48
    qa.setFromAxisAngle(axis, angle * t)
    const lift = 1 + ARC_LIFT * Math.sin(Math.PI * t) * Math.min(1, angle / 1.2)
    samples.push(va.clone().applyQuaternion(qa).multiplyScalar(GLOBE.radius * 1.004 * lift))
  }
  return new THREE.CatmullRomCurve3(samples)
}

/* Scratch. Nothing allocates in the frame loop. */
const worldPos = new THREE.Vector3()
const toCamera = new THREE.Vector3()
const outward = new THREE.Vector3()

export function NetworkGlobe() {
  const visible = useVisibleIn(GLOBE_MODES)
  // Under Contact the globe is a horizon with Riyadh lit on it: no arcs, no other
  // presences, and dimmer, because the contact details sit over it.
  const contact = useScene((s) => s.mode === 'contact')
  const reduced = useScene((s) => s.reduced)
  // Unpinned (below 768) there is no scroll progress to drive the arcs, so the
  // globe shows the finished network — as it does under reduced motion.
  const settled = useScene((s) => s.reduced || !isPinnedAtTier('about', s.tier))
  const camera = useThree((s) => s.camera)
  // Stacked layouts put the copy over the globe (and on phones the section is not
  // pinned, so the copy scrolls across it): there the globe is a dimmed backdrop
  // with no labels — the node list in the DOM already names all three.
  const split = useThree((s) => isHeroSplit(s.size.width, s.size.height))
  const t = useTranslations('about')

  const dots = useMemo(() => landPoints(), [])
  const grid = useMemo(() => graticule(), [])
  const curves = useMemo(() => NETWORK_ARCS.map(([a, b]) => arcCurve(a, b)), [])
  const tubes = useMemo(
    () => curves.map((curve) => new THREE.TubeGeometry(curve, 96, 0.0034, 6, false)),
    [curves],
  )
  // A round sprite for the dots, and the halo's ring just outside the silhouette.
  const disc = useMemo(
    () =>
      radialRamp([
        [0, 1],
        [0.62, 1],
        [0.82, 0],
        [1, 0],
      ], 32),
    [],
  )
  const halo = useMemo(
    () =>
      radialRamp([
        [0, 0],
        [0.7, 0],
        [0.77, 0.9],
        [0.84, 0.3],
        [1, 0],
      ]),
    [],
  )
  const glow = useMemo(() => rimColour(), [])
  // The arcs behind stacked copy: a trace, not a light — full strength they cut
  // straight across the figures and the node list on a phone.
  const trace = useMemo(() => rimColour().multiplyScalar(0.3), [])
  const facing = useMemo(
    () =>
      NETWORK_NODES.map((node) =>
        new THREE.Quaternion().setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          new THREE.Vector3(...latLonToUnit(node.lat, node.lon)),
        ),
      ),
    [],
  )

  useEffect(
    () => () => {
      dots.dispose()
      grid.dispose()
      tubes.forEach((tube) => tube.dispose())
    },
    [dots, grid, tubes],
  )

  const spin = useRef<THREE.Group>(null)
  const haloMesh = useRef<THREE.Mesh>(null)
  const arcMeshes = useRef<Array<THREE.Mesh | null>>([])
  const pulses = useRef<Array<THREE.Mesh | null>>([])
  const rings = useRef<Array<THREE.Mesh | null>>([])
  const markers = useRef<Array<THREE.Group | null>>([])
  const labels = useRef<Array<HTMLDivElement | null>>([])

  useEffect(() => {
    haloMesh.current?.layers.set(NO_SHADOW_LAYER)
    camera.layers.enable(NO_SHADOW_LAYER)
  }, [camera])

  const start = useMemo(() => faceTowards(HOME_FOCUS.lat, HOME_FOCUS.lon), [])
  const end = useMemo(() => faceTowards(NETWORK_FOCUS.lat, NETWORK_FOCUS.lon), [])
  const riyadh = useMemo(() => faceTowards(CONTACT_FOCUS.lat, CONTACT_FOCUS.lon), [])
  /** The globe's base turn, eased, so About → Contact is a turn and not a cut. */
  const base = useRef<[number, number] | null>(null)

  useFrame((state, dt) => {
    if (!visible) return
    const p = settled ? 1 : scroll.about
    // The reader's own spin, sprung slowly home so the network drifts back into
    // view after they let go.
    const spun = stepGrab('globe', dt, { spring: 0.35 })
    const time = state.clock.elapsedTime

    // Turn from Riyadh-facing toward the whole network as the arcs draw, with a
    // slow drift on top so the globe is never quite still.
    //
    // PLUS the camera's own bearing from the globe. The globe sits off to one side
    // of a camera looking straight down -Z, so the reader sees it obliquely and the
    // point facing them is not longitude "0" but one rotated toward the camera —
    // west in English, east in Arabic, where the globe is on the other side. Without
    // this the network sat off-centre in one direction and Riyadh slid round the
    // limb, label and all, in the other.
    const turn = smoothstep(0.2, 0.75, p)
    const drift = reduced ? 0 : Math.sin(time * 0.12) * 0.06
    if (spin.current) {
      spin.current.getWorldPosition(worldPos)
      const bearing = Math.atan2(
        state.camera.position.x - worldPos.x,
        state.camera.position.z - worldPos.z,
      )
      const tx = contact ? riyadh[0] : lerp(start[0], end[0], turn)
      const ty = contact ? riyadh[1] : lerp(start[1], end[1], turn)
      if (!base.current || reduced) base.current = [tx, ty]
      const k = 1 - Math.exp(-3.5 * dt)
      base.current[0] += (tx - base.current[0]) * k
      base.current[1] += (ty - base.current[1]) * k
      spin.current.rotation.x = base.current[0]
      spin.current.rotation.y = base.current[1] + drift + bearing + spun
    }

    // The halo always faces the camera.
    haloMesh.current?.quaternion.copy(state.camera.quaternion)

    // Arcs draw in over their windows; a pulse runs along each once it is drawn.
    for (let i = 0; i < tubes.length; i++) {
      const [a, b] = ARC_WINDOWS[i] ?? [0, 1]
      const drawn = reduced ? 1 : smoothstep(a, b, p)
      const count = tubes[i].index?.count ?? 0
      tubes[i].setDrawRange(0, Math.floor((count * drawn) / 6) * 6)
      const arc = arcMeshes.current[i]
      if (arc) arc.visible = !contact && drawn > 0.001

      const pulse = pulses.current[i]
      if (pulse) {
        pulse.visible = split && !contact && !reduced && drawn >= 1
        if (pulse.visible) pulse.position.copy(curves[i].getPointAt((time * 0.28 + i * 0.5) % 1))
      }
    }

    // Marker rings breathe outward; the home ring is the strongest.
    for (let i = 0; i < NETWORK_NODES.length; i++) {
      const ring = rings.current[i]
      if (ring) {
        const phase = reduced ? 0.35 : (time * 0.6 + i * 0.33) % 1
        ring.scale.setScalar(1 + phase * 2.2)
        const mat = ring.material as THREE.MeshBasicMaterial
        mat.opacity = (1 - phase) * (NETWORK_NODES[i].home ? 0.9 : 0.6) * (split ? 1 : 0.4)
      }

      // Under Contact only Riyadh is shown.
      const marker = markers.current[i]
      const shown = !contact || Boolean(NETWORK_NODES[i].home)
      if (marker) marker.visible = shown

      // Labels fade out as their node turns away round the limb.
      const label = labels.current[i]
      if (marker && label) {
        marker.getWorldPosition(worldPos)
        outward.copy(worldPos).sub(spin.current!.getWorldPosition(toCamera)).normalize()
        toCamera.copy(state.camera.position).sub(worldPos).normalize()
        // No labels under Contact: the address is written out in full beside it,
        // and a label on the horizon only collided with the cards over it.
        const front = shown && !contact ? smoothstep(0.1, 0.35, outward.dot(toCamera)) : 0
        label.style.opacity = front.toFixed(3)
      }
    }
  })

  return (
    <group position={[0, GLOBE.centreY, 0]} visible={visible}>
      {/* The halo: a ring of warm light just outside the silhouette. */}
      <mesh ref={haloMesh} renderOrder={-1}>
        <planeGeometry args={[GLOBE.radius * 2.6, GLOBE.radius * 2.6]} />
        <meshBasicMaterial
          color={AMBER}
          alphaMap={halo ?? undefined}
          transparent
          opacity={split ? 0.32 : 0.16}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          fog={false}
        />
      </mesh>

      <group ref={spin}>
        {/* The body: dark and opaque, so the far side's dots are hidden behind it
            instead of showing through as a second, mirrored continent. */}
        <mesh>
          <sphereGeometry args={[GLOBE.radius, 64, 48]} />
          <meshBasicMaterial color="#0c0e12" />
        </mesh>

        <lineSegments geometry={grid}>
          <lineBasicMaterial color="#8a96a6" transparent opacity={0.1} depthWrite={false} />
        </lineSegments>

        <points geometry={dots}>
          <pointsMaterial
            size={0.022}
            sizeAttenuation
            vertexColors
            alphaMap={disc ?? undefined}
            transparent
            depthWrite={false}
            opacity={!split ? 0.38 : contact ? 0.55 : 0.95}
          />
        </points>

        {tubes.map((tube, i) => (
          <mesh
            key={i}
            ref={(el) => {
              arcMeshes.current[i] = el
            }}
            geometry={tube}
          >
            <meshBasicMaterial color={split ? glow : trace} toneMapped={false} />
          </mesh>
        ))}

        {curves.map((_, i) => (
          <mesh
            key={i}
            ref={(el) => {
              pulses.current[i] = el
            }}
          >
            <sphereGeometry args={[0.0075, 12, 8]} />
            <meshBasicMaterial color="#fff1dc" toneMapped={false} />
          </mesh>
        ))}

        {NETWORK_NODES.map((node, i) => {
          const [x, y, z] = latLonToUnit(node.lat, node.lon)
          const r = GLOBE.radius * 1.006
          return (
            <group
              key={node.id}
              ref={(el) => {
                markers.current[i] = el
              }}
              position={[x * r, y * r, z * r]}
              // Rings face outward from the centre, in the globe's own frame —
              // not lookAt, which takes world coordinates and would tilt them
              // the moment the globe turned.
              quaternion={facing[i]}
            >
              <mesh>
                <circleGeometry args={[node.home ? 0.011 : 0.008, 24]} />
                <meshBasicMaterial color={node.home ? '#ffffff' : '#ffe2bd'} toneMapped={false} />
              </mesh>
              <mesh
                ref={(el) => {
                  rings.current[i] = el
                }}
              >
                <ringGeometry args={[0.013, 0.016, 40]} />
                <meshBasicMaterial
                  color={glow}
                  transparent
                  depthWrite={false}
                  toneMapped={false}
                  side={THREE.DoubleSide}
                />
              </mesh>
              {visible && split && (
                // wrapperClass: drei positions the label's wrapper assuming a
                // left-to-right page; under dir="rtl" its centring resolved from
                // the other edge and every label sat beside its marker. The
                // wrapper is LTR; the text inside still runs in its own direction.
                <Html
                  center
                  zIndexRange={[5, 0]}
                  position={[0, 0, 0.03]}
                  wrapperClass="globe-label-wrap"
                >
                  <div
                    ref={(el) => {
                      labels.current[i] = el
                    }}
                    className="globe-label"
                    data-home={node.home ? '' : undefined}
                  >
                    <span className="globe-label-name">
                      <bdi>{t(`node.${node.id}.name`)}</bdi>
                    </span>
                    <span className="globe-label-place">{t(`node.${node.id}.place`)}</span>
                  </div>
                </Html>
              )}
            </group>
          )
        })}
      </group>
    </group>
  )
}
