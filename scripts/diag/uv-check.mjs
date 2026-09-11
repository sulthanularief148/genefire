import { NodeIO } from '@gltf-transform/core'
const io = new NodeIO()
for (const f of ['sx300','px5','sx1500','sx100']) {
  const doc = await io.read(`public/models/parts/${f}.glb`)
  console.log('---', f)
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const semantics = prim.listSemantics()
      const pos = prim.getAttribute('POSITION')
      const mn = pos.getMin([]), mx = pos.getMax([])
      console.log('  ', (mesh.getName()||'(mesh)').padEnd(22),
        prim.getMaterial()?.getName()?.padEnd(16),
        'attrs=['+semantics.join(',')+']',
        'verts='+pos.getCount(),
        'bbox=', mn.map(n=>n.toFixed(3)).join(','), '→', mx.map(n=>n.toFixed(3)).join(','))
    }
  }
}
