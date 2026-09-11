import { NodeIO } from '@gltf-transform/core'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
const io = new NodeIO()
for (const dir of ['public/models', 'public/models/parts']) {
  console.log('---', dir)
  for (const f of readdirSync(dir).filter(x=>x.endsWith('.glb')).sort()) {
    const doc = await io.read(join(dir,f))
    let min=[1e9,1e9,1e9], max=[-1e9,-1e9,-1e9]
    for (const mesh of doc.getRoot().listMeshes())
      for (const prim of mesh.listPrimitives()) {
        const pos = prim.getAttribute('POSITION')
        if (!pos) continue
        const mn = pos.getMin([]), mx = pos.getMax([])
        for (let i=0;i<3;i++){ min[i]=Math.min(min[i],mn[i]); max[i]=Math.max(max[i],mx[i]) }
      }
    const size = max.map((v,i)=>v-min[i])
    console.log(f.replace('.glb','').padEnd(9),
      'y:', min[1].toFixed(3),'→',max[1].toFixed(3),
      ' size(w,h,d):', size.map(n=>n.toFixed(3)).join(', '),
      ' midY=', ((min[1]+max[1])/2).toFixed(3))
  }
}
