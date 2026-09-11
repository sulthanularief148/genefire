#!/usr/bin/env node
/**
 * Produces TWO builds of every product model, because the site needs both and one
 * file cannot be both.
 *
 *   public/models/<id>.glb        JOINED   — primitives sharing a material merged.
 *                                            Eleven products cost 28 draw calls
 *                                            instead of 68. Used wherever several
 *                                            products are on screen at once: the
 *                                            hero arc (§01) and the series rail
 *                                            (§04).
 *
 *   public/models/parts/<id>.glb  SEPARATE — dedup and prune only. Every part is
 *                                            still its own mesh. Used by the
 *                                            exploded view (§05).
 *
 * The reason for the split, stated plainly so nobody "optimises" it away again:
 * `join` fuses primitives that share a material, and on the industrial canisters
 * the body and the dome are both GF_Stainless. Once joined they are one mesh and
 * NOTHING CAN SEPARATE THEM AGAIN — which is exactly what the exploded view has to
 * do. The draw-call win and the exploded view are in direct conflict, so each view
 * gets the build it needs.
 *
 * `dedup` and `prune` are safe on both: they share identical accessors and drop
 * unreferenced data without touching the node graph. `join` and `flatten` are the
 * two that fuse hierarchy, and they run only on the joined build.
 *
 * assets/products/*.glb is never modified — it is the authoring source.
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, statSync } from 'node:fs'
import { join as joinPath } from 'node:path'

const ROOT = process.cwd()
const MODELS = joinPath(ROOT, 'public', 'models')
const PARTS = joinPath(MODELS, 'parts')

mkdirSync(PARTS, { recursive: true })

const ids = readdirSync(MODELS)
  .filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace(/\.glb$/, ''))
  .sort()

const run = (cmd) => execSync(cmd, { cwd: ROOT, stdio: ['ignore', 'ignore', 'inherit'] })

let joined = 0
let separate = 0

for (const id of ids) {
  const src = joinPath(MODELS, `${id}.glb`)
  const parts = joinPath(PARTS, `${id}.glb`)

  // Separate build FIRST, from the freshly synced source, before the source file
  // is joined in place.
  run(`npx gltf-transform dedup "${src}" "${parts}"`)
  run(`npx gltf-transform prune "${parts}" "${parts}"`)
  separate += statSync(parts).size

  // Joined build, in place.
  run(`npx gltf-transform dedup "${src}" "${src}"`)
  run(`npx gltf-transform join "${src}" "${src}"`)
  run(`npx gltf-transform prune "${src}" "${src}"`)
  joined += statSync(src).size
}

console.log(
  `optimize:models — ${ids.length} models\n` +
    `  joined   → public/models        ${(joined / 1024).toFixed(0)} KB  (arc, rail)\n` +
    `  separate → public/models/parts  ${(separate / 1024).toFixed(0)} KB  (exploded view)`,
)
