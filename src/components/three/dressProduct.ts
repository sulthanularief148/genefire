import * as THREE from 'three'

/**
 * Presentation dressing for a product model on DISPLAY — the hero turntable (§01)
 * and the series plinths (§04). Not for §05's exploded view or the §07 installs,
 * where brackets are hardware a specifier needs to see.
 *
 * The product components are gltfjsx output and are never hand-edited, so this is
 * applied from outside, once, to the mounted subtree.
 */

/**
 * The body finish on display, by material name.
 *
 * Lit by the studio rig at full strength, the red bodies sit well up the ACES
 * curve, and ACES desaturates a bright red toward pink: the first hero render had a
 * salmon product with white streaks down it. The streaks are the rig's key and side
 * cards reflected as hard bands, and at the kit's 0.42 roughness a dielectric
 * resolves them sharply. assets/photos/px5.png is a satin moulding with soft, broad
 * highlights. The roughness is a floor; the environment is turned down.
 *
 * Applied to a COPY of the material, per mounted instance, so §05 and §07 keep the
 * kit's own values.
 */
const BODY_FINISH: Record<string, { env: number; roughness: number }> = {
  GF_RedPolymer: { env: 0.42, roughness: 0.58 },
  GF_RedAnodized: { env: 0.5, roughness: 0.4 },
}

/** Metres a part's centre may sit off the barrel axis before it is a fault. */
const OFF_AXIS_TOLERANCE = 0.004

/**
 * Dresses every mesh under `root`. Returns how many meshes it found, so a caller
 * running this from the frame loop can retry until the model has resolved through
 * Suspense — on the pass where an effect would run, the subtree is still empty.
 *
 * Copied materials are pushed onto `owned` for the caller to dispose on unmount.
 */
export function dressProduct(root: THREE.Object3D, owned: THREE.Material[]): number {
  let meshes = 0
  const copies = new Map<THREE.Material, THREE.Material>()

  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    meshes++
    mesh.castShadow = true
    mesh.receiveShadow = true

    const material = mesh.material as THREE.Material | THREE.Material[]
    if (Array.isArray(material)) return
    const named = material?.name

    // Mounting brackets stay off on display: on a plinth there is no wall, and a
    // bracket reads as a grey slab floating beside the unit. Matched on the
    // MATERIAL — the generated components build fresh <mesh> elements that do not
    // inherit the source node's name, while the material keeps its .glb name.
    if (named === 'GF_Bracket') {
      mesh.visible = false
      return
    }

    // Geometry that is not on the product's own axis is a modelling fault, not a
    // part: px1m_cap_3 is modelled DETACHED, 52–88 mm to the side of a barrel 18 mm
    // across, and floats beside the unit as a small dark box. Every other mesh in
    // the range is centred on the axis at exactly 0.0000. Matched on the shape
    // rather than on a node index, so a re-export with the cap seated simply stops
    // matching. Takes the 10 mm collar fused with it, which is worth it.
    //
    // An ABSOLUTE tolerance. The rule this replaced compared the offset with half
    // the mesh's own half-width — and the cap is what makes that half-width large,
    // so the fused collar-and-cap (centre 35 mm off, half-width 88 mm) passed its
    // own test and the box stayed on screen beside the PX1M. Only the kit's GF_
    // materials are tested: the printed markings are one merged mesh laid round
    // the barrel in copies, and need not be centred.
    if (named?.startsWith('GF_')) {
      mesh.geometry.computeBoundingBox()
      const box = mesh.geometry.boundingBox
      if (box && Math.abs((box.min.x + box.max.x) / 2) > OFF_AXIS_TOLERANCE) {
        mesh.visible = false
        return
      }
    }

    const finish = named ? BODY_FINISH[named] : undefined
    if (finish) {
      let own = copies.get(material)
      if (!own) {
        const copy = (material as THREE.MeshStandardMaterial).clone()
        copy.envMapIntensity = finish.env
        copy.roughness = Math.max(copy.roughness, finish.roughness)
        copies.set(material, copy)
        owned.push(copy)
        own = copy
      }
      mesh.material = own
    }
  })

  return meshes
}
