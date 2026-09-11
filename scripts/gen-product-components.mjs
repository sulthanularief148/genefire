#!/usr/bin/env node
/**
 * Generates src/components/three/products/*.tsx from public/models/*.glb.
 *
 * The components are gltfjsx output, not hand-written — a hand-written component
 * silently drifts from the file the moment a model is re-exported. Re-run this
 * after any .glb changes:  node scripts/gen-product-components.mjs
 *
 * gltfjsx@6 still emits React-18-era types, so its output is post-processed for
 * @react-three/fiber v9:
 *   JSX.IntrinsicElements['group']  →  ThreeElements['group']
 *   a stray `animations: GLTFAction[]` on models that have no animations
 *   an unused React import, and a model path missing its /models prefix
 */
import { execSync } from 'node:child_process'
import { mkdirSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const MODELS = join(ROOT, 'public', 'models')
const OUT = join(ROOT, 'src', 'components', 'three', 'products')

mkdirSync(OUT, { recursive: true })

const ids = readdirSync(MODELS)
  .filter((f) => f.endsWith('.glb'))
  .map((f) => f.replace(/\.glb$/, ''))
  .sort()

/** px1m → PX1M, sx5_10 → SX5_10. Matches the printed model names. */
const componentName = (id) => id.toUpperCase()

function generate(id) {
  // `shell: true` — npx is a .cmd shim on Windows and cannot be spawned directly.
  const raw = execSync(`npx --yes gltfjsx@6 "public/models/${id}.glb" --types --console`, {
    cwd: ROOT,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore'],
  })

  const name = componentName(id)

  let out = raw
    // gltfjsx resolves the model path relative to the file it was given.
    .replaceAll(`'/${id}.glb'`, `'/models/${id}.glb'`)
    // R3F v9: element prop types moved off the global JSX namespace.
    .replace(
      `export function Model(props: JSX.IntrinsicElements['group'])`,
      `export function ${name}(props: ThreeElements['group'])`,
    )
    // Emitted even when the model has no animation track; the type is undefined.
    .replace(/^\s*animations: GLTFAction\[\]\n/m, '')
    // Automatic JSX runtime — the import is unused and trips the linter.
    .replace(/^import React from 'react'\n/m, '')
    .replace(/^import \* as THREE from 'three'\n/m, `import * as THREE from 'three'\n`)

  // Header: say where this came from and that it is not to be edited.
  out = out.replace(
    /^\/\*[\s\S]*?\*\/\n/,
    `/*
  GENERATED — do not edit.
  Source: public/models/${id}.glb
  Regenerate: node scripts/gen-product-components.mjs

  Origin is base centre, +Y up, metres. No scale correction belongs in JSX.
*/
`,
  )

  // ThreeElements comes from fiber, not from drei or three.
  out = out.replace(
    `import { useGLTF } from '@react-three/drei'`,
    `import { useGLTF } from '@react-three/drei'\nimport type { ThreeElements } from '@react-three/fiber'`,
  )

  // drei's return type is the generic GLTF, so the cast needs the unknown hop.
  out = out.replace(
    `useGLTF('/models/${id}.glb') as GLTFResult`,
    `useGLTF('/models/${id}.glb') as unknown as GLTFResult`,
  )

  // The printed markings, injected as the last child of the product group so they
  // travel with it everywhere — the hero arc, the series rail, the pinned product
  // and the installed units inside the §07 environments — rather than being
  // remembered at each of the four call sites.
  out = out.replace(
    `import { useGLTF } from '@react-three/drei'`,
    `import { useGLTF } from '@react-three/drei'`,
  )
  out = out.replace(
    /^import \{ GLTF \} from 'three-stdlib'$/m,
    `import { GLTF } from 'three-stdlib'\n\nimport { ProductDecals } from '../ProductDecals'`,
  )
  out = out.replace(/(\n\s*)<\/group>/, `$1  <ProductDecals id="${id}" />$1</group>`)

  writeFileSync(join(OUT, `${name}.tsx`), out)
  return name
}

const names = ids.map((id) => {
  const name = generate(id)
  console.log(`  ${id}.glb → products/${name}.tsx`)
  return { id, name }
})

/* An id-keyed registry so sections can address a product by its products.json id
   without importing eleven components by hand. */
const index = `/*
  GENERATED — do not edit.
  Regenerate: node scripts/gen-product-components.mjs
*/
import type { ComponentType } from 'react'
import type { ThreeElements } from '@react-three/fiber'

${names.map(({ name }) => `import { ${name} } from './${name}'`).join('\n')}

export type ProductModelProps = ThreeElements['group']

/** Keyed by the product id in assets/products.json. */
export const PRODUCT_MODELS: Record<string, ComponentType<ProductModelProps>> = {
${names.map(({ id, name }) => `  ${id}: ${name},`).join('\n')}
}

export { ${names.map(({ name }) => name).join(', ')} }
`

writeFileSync(join(OUT, 'index.ts'), index)
console.log(`\ngen:models — ${names.length} components + registry written to src/components/three/products/`)
