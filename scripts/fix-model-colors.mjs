#!/usr/bin/env node
/**
 * Corrects baseColorFactor in every model under public/models.
 *
 * THE BUG. glTF stores `pbrMetallicRoughness.baseColorFactor` in LINEAR space,
 * and three's GLTFLoader says so explicitly — it does
 * `color.setRGB(f[0], f[1], f[2], LinearSRGBColorSpace)`. The placeholder models
 * were authored by dividing the sRGB hex by 255 and writing that straight into
 * that field. Every material in the kit, without exception:
 *
 *   GF_RedAnodized  [0.8824, 0.1451, 0.1059]  = (225, 37, 27)/255 = #E1251B
 *   GF_Stainless    [0.7804, 0.7922, 0.8078]  = (199, 202, 206)/255 = #C7CACE
 *   GF_BlackPolymer [0.0549, 0.0588, 0.0627]  = (14, 15, 16)/255   = #0E0F10
 *
 * three.js then does exactly what it should: treats them as linear and converts
 * to sRGB on output. 0.8824 linear leaves as ~0.95 sRGB, so the deep brand red
 * rendered as a washed coral #F16A5C and the stainless as a near-white blue-grey
 * #E5E6E8. That is why the products read as blue-grey plastic rather than red
 * anodized metal.
 *
 * The fault is in the ASSET, not the renderer. Checked before touching anything:
 * outputColorSpace 'srgb', ACES tone mapping, exposure 1, environmentIntensity
 * 0.9, no stray BasicMaterial. Nothing on the render side was wrong.
 *
 * assets/products/*.glb is never modified — it stays the authoring source, so the
 * pipeline reproduces this correction from scratch every build.
 *
 * IDEMPOTENT BY STAMP, not by heuristic. Converting twice would crush every
 * colour toward black, and "is this value already linear?" is unanswerable by
 * inspection — 0.0549 is a legitimate linear value as well as a mis-written sRGB
 * one. So a corrected file carries asset.extras.colorSpaceCorrected and is
 * skipped. sync:assets overwrites public/models from source on every build, which
 * clears the stamp along with the bad values.
 */
import { NodeIO } from '@gltf-transform/core'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const DIRS = [join(ROOT, 'public', 'models'), join(ROOT, 'public', 'models', 'parts')]
const STAMP = 'colorSpaceCorrected'

/** sRGB channel (0–1) → linear. The step the authoring tool skipped. */
const srgbToLinear = (c) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4))

const io = new NodeIO()
let converted = 0
let files = 0
let skipped = 0

for (const dir of DIRS) {
  let entries
  try {
    entries = readdirSync(dir).filter((f) => f.endsWith('.glb'))
  } catch {
    continue
  }

  for (const file of entries) {
    const path = join(dir, file)
    const document = await io.read(path)
    const asset = document.getRoot().getAsset()

    if (asset.extras?.[STAMP]) {
      skipped++
      continue
    }

    for (const material of document.getRoot().listMaterials()) {
      const factor = material.getBaseColorFactor()
      if (!factor) continue
      const [r, g, b, a] = factor
      material.setBaseColorFactor([srgbToLinear(r), srgbToLinear(g), srgbToLinear(b), a])
      converted++
    }

    asset.extras = { ...asset.extras, [STAMP]: true }
    await io.write(path, document)
    files++
  }
}

console.log(
  `fix:colors — ${converted} baseColorFactor values sRGB → linear in ${files} files` +
    (skipped ? `, ${skipped} already corrected` : ''),
)
