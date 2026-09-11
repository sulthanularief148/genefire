import { chromium } from '@playwright/test'
const out = process.argv[2]
const browser = await chromium.launch({ args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/en')
await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60000 })
await page.waitForTimeout(6000)
await page.evaluate(() => {
  const s = window.__scene
  const tr = s.triggers().find((t) => t.id === 'product-sx300')
  s.scrollTo(tr.start + (tr.end - tr.start) * 0.4)
})
await page.waitForTimeout(3500)

const info = await page.evaluate(() => {
  const t = window.__three
  const cam = t.camera
  // Project the product's own extremes through the live camera.
  const V = cam.constructor // not useful; use manual math
  const project = (x, y, z) => {
    // world -> camera space using the camera's inverse matrix
    const m = cam.matrixWorldInverse.elements
    const cx = m[0]*x + m[4]*y + m[8]*z + m[12]
    const cy = m[1]*x + m[5]*y + m[9]*z + m[13]
    const cz = m[2]*x + m[6]*y + m[10]*z + m[14]
    const f = 1 / Math.tan((cam.fov * Math.PI/180) / 2)
    const ndcY = (cy * f) / -cz
    return (1 - ndcY) / 2 * 720
  }
  return {
    cameraPos: [cam.position.x, cam.position.y, cam.position.z].map(v=>+v.toFixed(4)),
    topPx: +project(0, 0.183, 0).toFixed(1),
    basePx: +project(0, 0, 0).toFixed(1),
    trigger: window.__scene.triggers().find(t => t.id === 'product-sx300'),
  }
})
console.log(JSON.stringify(info, null, 2))
await page.screenshot({ path: out + '/diag-product.png' })
await browser.close()
