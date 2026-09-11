import { chromium } from '@playwright/test'
const out = process.argv[2]
const browser = await chromium.launch({ args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/en')
await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60000 })
await page.waitForTimeout(8000)
await page.evaluate(() => window.__scene?.refresh())
await page.waitForTimeout(500)

const go = async (id, at) => {
  await page.evaluate(({ id, at }) => {
    const s = window.__scene
    const tr = s.triggers().find((t) => t.id === id)
    if (tr) s.scrollTo(tr.start + (tr.end - tr.start) * at)
  }, { id, at })
  await page.waitForFunction(({ id, at }) => {
    const tr = window.__scene?.triggers().find((t) => t.id === id)
    return !tr || Math.abs(tr.progress - at) < 0.005
  }, { id, at }, { timeout: 15000 }).catch(()=>{})
  await page.waitForTimeout(1200)
}

// Replicate the shot order up to the product shot.
for (const [id, at] of [['hero',0],['hero',0.75],['problem',0.6],['activation',0.45],['activation',0.9],['series',0.5],['product-sx300',0.4]]) {
  await go(id, at)
}

console.log(JSON.stringify(await page.evaluate(() => {
  const t = window.__three, cam = t.camera
  const st = window.__scene.store.getState()
  let n = 0, minY = 1e9, maxY = -1e9
  t.scene.traverse((o) => {
    if (!o.isMesh) return
    let p = o, vis = true
    while (p) { vis = vis && p.visible; p = p.parent }
    if (!vis) return
    o.geometry.computeBoundingBox()
    const b = o.geometry.boundingBox.clone().applyMatrix4(o.matrixWorld)
    if (Math.abs(b.min.x) > 3) return
    n++; minY = Math.min(minY, b.min.y); maxY = Math.max(maxY, b.max.y)
  })
  return {
    cameraPos: [cam.position.x, cam.position.y, cam.position.z].map(v=>+v.toFixed(4)),
    active: st.active, mode: st.mode,
    scrollProduct: +window.__scene.scroll.product.toFixed(3),
    visibleMeshes: n,
    worldY: [+minY.toFixed(4), +maxY.toFixed(4)],
  }
}), null, 2))
await page.screenshot({ path: out + '/diag-product2.png' })
await browser.close()
