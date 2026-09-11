'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'

import { smoothstep } from '@/lib/anim'
import { getProduct } from '@/lib/products'
import { UPRIGHT } from '@/lib/framing'
import { scroll, useScene, useVisibleIn } from '@/lib/useScene'
import { ProductDecals } from './ProductDecals'

/**
 * Section 05 — one product at a time, with the exploded view.
 *
 * This loads from public/models/parts/, NOT public/models/. The models under
 * /models are joined by material to save draw calls, which fuses the body and the
 * dome on every stainless canister — and you cannot separate what join has merged.
 * The /parts build keeps every part its own mesh for exactly this component. See
 * scripts/optimize-models.mjs.
 *
 * Only the ACTIVE product is mounted. Eleven unjoined products at once would be
 * ~68 draw calls; one is at most eight, which is how the separate build pays for
 * itself.
 *
 * The explode is derived from geometry rather than authored per model: parts are
 * ordered along the model's long axis and pushed outward from its centre. That
 * keeps working when the parametric placeholders are replaced by real CAD with a
 * different part count, which a hand-authored offset table would not.
 */

/**
 * Hotspot roles, in the order the brief names them. Assigned by rule rather than
 * by node name, because the placeholder models carry generic names
 * (sx300_body_0…4) and inventing semantic names for them would be fiction.
 */
export type HotspotRole = 'actuator' | 'charge' | 'outlet' | 'bracket'

/** This scene belongs to section 05 and nowhere else. */
const PRODUCT_MODES = ['product'] as const

interface LoadedPart {
  geometry: THREE.BufferGeometry
  material: THREE.Material
  /**
   * Signed offset of this part's centroid from the model's centre, ALONG +Z.
   *
   * Z, not Y. These models lay their barrel along +Z — every part spans z = a..b
   * and is centred on y = 0, where its Y extent is the RADIUS. Measuring the
   * "long axis" on Y therefore returned ~0 for every part of every product, so
   * the sort below was ordering on noise and the explode was multiplying zero by
   * a progress curve. Section 05 has been playing an exploded view that never
   * separated: the parts sat inside one another and only the leader lines moved.
   */
  axisOffset: number
  role: HotspotRole
}

function classify(name: string, index: number, count: number): HotspotRole {
  // Bracket parts are the one thing the placeholder names do say.
  if (/bracket/i.test(name)) return 'bracket'
  // Otherwise: base end is the actuator, the bulk is the charge, the top is the
  // aerosol outlet.
  const t = count <= 1 ? 0.5 : index / (count - 1)
  if (t < 0.34) return 'actuator'
  if (t < 0.72) return 'charge'
  return 'outlet'
}

export function ProductStage() {
  const active = useScene((s) => s.active)
  const reduced = useScene((s) => s.reduced)

  const product = active ? getProduct(active) : undefined
  if (!product) return null

  // Keyed on the id so switching product remounts cleanly rather than trying to
  // reconcile two different part counts.
  return <ProductParts key={product.id} id={product.id} reduced={reduced} />
}

function ProductParts({ id, reduced }: { id: string; reduced: boolean }) {
  // Owned by the active section, not by scroll.product having ever been non-zero.
  const visible = useVisibleIn(PRODUCT_MODES)
  const gltf = useGLTF(`/models/parts/${id}.glb`)
  // Refs are owned here, not passed in: mutating a ref that arrived as a prop is
  // mutating someone else's state, and the linter is right to refuse it.
  const group = useRef<THREE.Group>(null)
  const partRefs = useRef<Array<THREE.Group | null>>([])

  const parts = useMemo<LoadedPart[]>(() => {
    const found: Array<{ mesh: THREE.Mesh; centre: number }> = []
    let min = Infinity
    let max = -Infinity
    gltf.scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox!
      min = Math.min(min, box.min.z)
      max = Math.max(max, box.max.z)
      found.push({ mesh, centre: (box.min.z + box.max.z) / 2 })
    })

    // Outlet end last, so the explode order matches the physical stack.
    found.sort((a, b) => a.centre - b.centre)

    // Offsets are measured from the MODEL's centre, not from its origin. The
    // origin sits at the base, so offsetting from it would telescope every part
    // in one direction and leave the base welded in place; from the centre the
    // stack opens out both ways, which is what reads as an exploded view.
    const modelCentre = (min + max) / 2

    return found.map(({ mesh, centre }, i) => ({
      geometry: mesh.geometry,
      material: mesh.material as THREE.Material,
      axisOffset: centre - modelCentre,
      role: classify(mesh.name, i, found.length),
    }))
  }, [gltf])

  useFrame(() => {
    const p = reduced ? 0.65 : scroll.product
    const g = group.current
    if (!g) return

    // 0.00–0.30 arrive and turn · 0.30–0.55 specs · 0.55–0.80 explode ·
    // 0.80–1.00 reassemble and recede. Every term below is f(progress).
    const arrive = smoothstep(0, 0.3, p)
    const explode = smoothstep(0.55, 0.78, p) * (1 - smoothstep(0.82, 0.97, p))
    const recede = smoothstep(0.88, 1, p)

    g.position.z = (1 - arrive) * -0.6 - recede * 0.9
    g.position.y = (1 - arrive) * -0.12

    // Turntable through the hold, slowing for the exploded view so the leader
    // lines stay readable.
    //
    // ASSIGNED from progress, never integrated. `rotation.y += rate * dt` would
    // accumulate, and an accumulated angle cannot retrace itself when the user
    // drags the section backwards — the product would end up at a different
    // attitude every time they passed the same scroll position. The subtracted
    // smoothstep flattens the turn rate across the explode window while keeping
    // the whole expression monotonic, so it still unwinds correctly in reverse.
    const turn = p - 0.15 * smoothstep(0.55, 0.82, p)

    // A full turntable, which is only safe because the unit now stands upright.
    //
    // While these were lying along +Z — the camera's view axis — rotation.y = 0
    // pointed the cylinder straight at the lens, and a 288° sweep passed through
    // that attitude twice. The second pass landed almost exactly on the exploded
    // beat: at p = 0.68 the product sat at 189°, showing its end cap, which hid
    // the printed markings AND the explosion itself, since the parts separate
    // along the axis and an axis aimed at the camera has nowhere to separate into.
    // Standing the unit up removes the failure mode rather than steering around it.
    g.rotation.y = turn * Math.PI * 1.6

    for (let i = 0; i < parts.length; i++) {
      const part = partRefs.current[i]
      if (!part) continue
      // Push each part away from the model's centre along the barrel axis,
      // scaled by how far it already sits from that centre. Pure function of
      // progress.
      part.position.z = parts[i].axisOffset * 1.9 * explode
    }
  })

  return (
    <group ref={group} visible={visible}>
      {/*
        Stood on its base, so rotation.y on the parent is a TURNTABLE about the
        product's own axis rather than an end-over-end swing. That is what lets
        the sweep below go back to a full revolution: an upright cylinder never
        presents its end cap however far it turns, so every side of the printing
        comes round and the separated parts stay legible throughout.
      */}
      <group rotation={UPRIGHT}>
      {parts.map((part, i) => (
        <group
          key={i}
          ref={(el) => {
            partRefs.current[i] = el
          }}
        >
          <mesh geometry={part.geometry} material={part.material} castShadow receiveShadow />
        </group>
      ))}
      {/* The printed markings. This stage builds its meshes straight from the
          parts .glb rather than mounting the generated product component, so the
          decals have to be added here too — they do not arrive with the parts. */}
      <ProductDecals id={id} />
      </group>
    </group>
  )
}
