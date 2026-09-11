import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/' + (process.argv[2] ?? 'ar'))
await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60000 })
await page.waitForTimeout(4000)

// Scroll to the middle of the applications pin, the same way the shot spec does.
await page.evaluate(() => {
  const s = window.__scene
  const tr = s.triggers().find((t) => t.id === 'applications')
  s.scrollTo(tr.start + (tr.end - tr.start) * 0.4)
})
await page.waitForTimeout(3000)

const out = await page.evaluate(() => {
  const t = window.__three
  const cam = t.camera
  const s = window.__scene

  const groups = []
  t.scene.traverse((o) => {
    if (!o.name && o.type !== 'Group') return
    if (o.type !== 'Group') return
    let meshes = 0
    o.traverse((c) => { if (c.isMesh || c.isInstancedMesh) meshes++ })
    if (meshes === 0) return
    const wp = ({ x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] })
    groups.push({
      name: o.name || '(unnamed)',
      visible: o.visible,
      visibleInTree: (() => { let p = o, v = true; while (p) { v = v && p.visible; p = p.parent } return v })(),
      meshes,
      world: [wp.x, wp.y, wp.z].map((n) => +n.toFixed(2)),
    })
  })

  // Everything actually rendered this frame, with distance from camera.
  const drawn = []
  t.scene.traverse((o) => {
    if (!(o.isMesh || o.isInstancedMesh)) return
    let p = o, v = true
    while (p) { v = v && p.visible; p = p.parent }
    const wp = ({ x: o.matrixWorld.elements[12], y: o.matrixWorld.elements[13], z: o.matrixWorld.elements[14] })
    drawn.push({
      name: o.name || o.type,
      visible: v,
      dist: +Math.hypot(wp.x-cam.position.x, wp.y-cam.position.y, wp.z-cam.position.z).toFixed(2),
      world: [wp.x, wp.y, wp.z].map((n) => +n.toFixed(2)),
      mat: o.material?.name ?? null,
    })
  })

  return {
    mode: s.mode?.() ?? window.__scene.state?.().mode ?? 'n/a',
    scrollApplications: window.__scene.scrollObject?.()?.applications ?? 'n/a',
    camera: {
      pos: [cam.position.x, cam.position.y, cam.position.z].map((n) => +n.toFixed(2)),
      near: cam.near, far: cam.far, fov: cam.fov,
    },
    groups: groups.filter(g=>g.meshes>1),
    visibleMeshes: drawn.filter((d) => d.visible).length,
    totalMeshes: drawn.length,
    nearest: drawn.filter((d) => d.visible).sort((a, b) => a.dist - b.dist).slice(0, 14),
    info: { calls: t.gl.info.render.calls, tris: t.gl.info.render.triangles },
  }
})

console.log(JSON.stringify(out, null, 2))
await browser.close()
