#!/usr/bin/env node
/**
 * Measures the labelled barrel of every product and emits src/lib/barrels.ts.
 *
 * The decals need to sit ON the cylinder, which means knowing its radius and its
 * extent along the axis. Both are read out of the .glb rather than typed in — a
 * decal floating half a millimetre off the surface, or sunk into it, is the kind
 * of thing that only shows up at exploded scale and only after someone has
 * hand-copied a number.
 *
 * Two facts about these models, both measured, neither what the naming suggests:
 *
 *   - The barrel axis is +Z, not +Y. Every body runs z = 0 to z = length, with x
 *     and y as the radial pair.
 *   - `<id>_body_0` is consistently the main pressure vessel, and it carries the
 *     product's base material — GF_RedAnodized, GF_RedPolymer or GF_Stainless.
 *     The black bands are separate parts (body_1, body_2) sitting proud of it,
 *     which is why the label band has to avoid them.
 *
 * The black bands matter: on the real units in assets/photos/ the printed label
 * sits between them, never across them. So this records the bands too, and the
 * decal placement keeps clear.
 */
import { NodeIO } from '@gltf-transform/core'
import { readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const io = new NodeIO()
const MODELS = 'public/models'

/** Materials that identify the painted or polished body a label is printed on. */
const BODY_MATERIALS = new Set(['GF_RedAnodized', 'GF_RedPolymer', 'GF_Stainless'])
const BAND_MATERIALS = new Set(['GF_BlackPolymer'])

const ids = readdirSync(MODELS)
  .filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace(/\.glb$/, ''))
  .sort()

const rows = []

for (const id of ids) {
  // The parts build, because the joined build has already fused body and dome
  // where they share a material and the barrel can no longer be measured alone.
  const doc = await io.read(join(MODELS, 'parts', `${id}.glb`))

  let barrel = null
  const bands = []
  // Full model bounds, every part included — the framing needs the whole object,
  // not just the labelled cylinder. The dome and the bracket both stick out past
  // the barrel.
  let modelMin = Infinity
  let modelMax = -Infinity
  let modelRadius = 0
  // Extent across the axis in Y, signed and NOT assumed symmetric. Ten of the
  // eleven are bodies of revolution and this is simply ±radius for them; the PX 5
  // carries a handle on one side only, so its cross-section runs -80 mm to
  // +156 mm. The hero lays that unit down, and framing a lying product needs the
  // real top and bottom rather than a radius that pretends the handle is mirrored.
  let crossMin = Infinity
  let crossMax = -Infinity

  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const material = prim.getMaterial()?.getName() ?? ''
      const pos = prim.getAttribute('POSITION')
      if (!pos) continue
      const min = pos.getMin([])
      const max = pos.getMax([])
      const radius = Math.max(max[0], max[1], -min[0], -min[1])
      const entry = { name: mesh.getName(), material, radius, z0: min[2], z1: max[2] }

      // Brackets are excluded from the framing bounds deliberately: on the larger
      // units the bracket reaches 130-250 mm to the side, so including it frames
      // mostly empty space beside the product.
      if (!/bracket/i.test(mesh.getName())) {
        modelMin = Math.min(modelMin, min[2])
        modelMax = Math.max(modelMax, max[2])
        modelRadius = Math.max(modelRadius, radius)
        crossMin = Math.min(crossMin, min[1])
        crossMax = Math.max(crossMax, max[1])
      }

      if (BODY_MATERIALS.has(material)) {
        // The barrel is the longest run along the axis in a body material.
        const length = entry.z1 - entry.z0
        if (!barrel || length > barrel.z1 - barrel.z0) barrel = entry
      } else if (BAND_MATERIALS.has(material)) {
        bands.push(entry)
      }
    }
  }

  if (!barrel) {
    console.warn(`gen:barrels — ${id} has no body material, skipped`)
    continue
  }

  // Bands that actually cross the barrel, sorted along the axis.
  const crossing = bands
    .filter((b) => b.z1 > barrel.z0 && b.z0 < barrel.z1 && b.radius >= barrel.radius * 0.9)
    .map((b) => [Math.max(b.z0, barrel.z0), Math.min(b.z1, barrel.z1)])
    .sort((a, b) => a[0] - b[0])

  rows.push({
    id,
    material: barrel.material,
    radius: +barrel.radius.toFixed(5),
    z0: +barrel.z0.toFixed(5),
    z1: +barrel.z1.toFixed(5),
    bands: crossing.map(([a, b]) => [+a.toFixed(5), +b.toFixed(5)]),
    length: +(modelMax - modelMin).toFixed(5),
    modelRadius: +modelRadius.toFixed(5),
    crossY: [+crossMin.toFixed(5), +crossMax.toFixed(5)],
  })
}

const body = rows
  .map(
    (r) =>
      `  ${r.id}: { material: '${r.material}', radius: ${r.radius}, z0: ${r.z0}, z1: ${r.z1}, bands: ${JSON.stringify(r.bands)}, length: ${r.length}, modelRadius: ${r.modelRadius}, crossY: ${JSON.stringify(r.crossY)} },`,
  )
  .join('\n')

writeFileSync(
  'src/lib/barrels.ts',
  `// GENERATED by scripts/gen-barrels.mjs — do not edit by hand.
//
// The labelled cylinder of each product, measured from public/models/parts/*.glb.
// Axis is +Z; radius is the radial extent in X/Y; bands are the z-ranges where a
// black collar sits proud of the barrel and no label may be printed.

export interface Barrel {
  /** The body material, which decides whether the mark is white or dark. */
  material: string
  radius: number
  z0: number
  z1: number
  /** Black collars crossing the barrel, as [z0, z1] pairs, ordered along the axis. */
  bands: [number, number][]
  /** Full model extent along the axis, brackets excluded. Its height when stood up. */
  length: number
  /** Widest radius of the model, brackets excluded. Its half-width when stood up. */
  modelRadius: number
  /**
   * Extent across the axis in Y as [min, max], brackets excluded, and NOT assumed
   * symmetric. Bodies of revolution give [-radius, +radius]; the PX 5 carries its
   * handle on one side only. This is the unit's height when it is laid down.
   */
  crossY: [number, number]
}

export const BARRELS: Record<string, Barrel> = {
${body}
}
`,
)

console.log(`gen:barrels — ${rows.length} barrels measured -> src/lib/barrels.ts`)
for (const r of rows) {
  console.log(
    `  ${r.id.padEnd(8)} ${r.material.padEnd(15)} r=${r.radius.toFixed(4)} ` +
      `z=${r.z0.toFixed(3)}..${r.z1.toFixed(3)} (L=${(r.z1 - r.z0).toFixed(3)}) bands=${r.bands.length}`,
  )
}
