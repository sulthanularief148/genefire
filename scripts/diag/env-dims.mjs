import { readFileSync } from 'node:fs'
const j = JSON.parse(readFileSync('assets/products.json','utf8'))
const list = j.series.flatMap(s => s.products ?? s.models ?? [])
const get = (id) => list.find(p => p.id === id)
const high = (v) => (Array.isArray(v) ? v[v.length-1] : v)
const ENV = [
  ['military','sx100',[1.6,1,1.6]],['industry','sx300',[1.5,1.25,1]],
  ['power','sx25',[1,1.25,1]],['railway','sx50',[2,1.25,1]],
  ['datacenter','sx100',[1,2.5,2]],['laboratory','sx5_10',[1.4,1,1.1]],
]
console.log('ids:', list.map(p=>p.id).join(' '))
for (const [id,pid,[px,py,pz]] of ENV) {
  const p = get(pid)
  const V = p ? high(p.volume_m3) : 5
  const k = Math.cbrt(V/(px*py*pz))
  const d = [px*k,py*k,pz*k]
  console.log(id.padEnd(11), 'V='+String(V).padEnd(7), 'w×h×d =', d.map(n=>n.toFixed(2)).join(' × '), ' half-depth='+ (d[2]/2).toFixed(2))
}
