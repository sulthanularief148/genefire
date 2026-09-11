import { NodeIO } from '@gltf-transform/core'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const io = new NodeIO()
const seen = new Map()
for (const dir of ['public/models', 'public/models/parts', 'assets/products']) {
  let list; try { list = readdirSync(dir).filter(f=>f.endsWith('.glb')) } catch { continue }
  for (const f of list) {
    const doc = await io.read(join(dir,f))
    for (const m of doc.getRoot().listMaterials()) {
      const bc = m.getBaseColorFactor()
      const key = dir+'  '+m.getName()+'  ['+bc.map(v=>v.toFixed(4)).join(', ')+']  metal='+m.getMetallicFactor().toFixed(2)+' rough='+m.getRoughnessFactor().toFixed(2)
      seen.set(key, (seen.get(key)||0)+1)
    }
  }
}
for (const [k,v] of [...seen].sort()) console.log(String(v).padStart(3), k)
