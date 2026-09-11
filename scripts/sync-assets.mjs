#!/usr/bin/env node
/**
 * sync:assets — copies the kit's authored assets into public/.
 *
 *   assets/products/<id>.glb            → public/models/<id>.glb
 *   assets/products/<id>_views/*.png    → public/renders/<file>.png
 *
 * assets/ stays the authoring source; public/ is what ships. Re-run after any
 * model is re-exported. Phase 6 runs the optimizer over public/models in place.
 */
import { cpSync, existsSync, mkdirSync, readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'assets', 'products')
const MODELS = join(ROOT, 'public', 'models')
const RENDERS = join(ROOT, 'public', 'renders')

if (!existsSync(SRC)) {
  console.error(`sync:assets — no ${SRC}`)
  process.exit(1)
}

mkdirSync(MODELS, { recursive: true })
mkdirSync(RENDERS, { recursive: true })

let glb = 0
let png = 0

for (const entry of readdirSync(SRC)) {
  const full = join(SRC, entry)
  if (entry.endsWith('.glb')) {
    cpSync(full, join(MODELS, entry))
    glb++
  } else if (entry.endsWith('_views')) {
    for (const view of readdirSync(full)) {
      if (view.endsWith('.png') || view.endsWith('.svg')) {
        cpSync(join(full, view), join(RENDERS, view))
        png++
      }
    }
  }
}

console.log(`sync:assets — ${glb} models → public/models, ${png} views → public/renders`)
