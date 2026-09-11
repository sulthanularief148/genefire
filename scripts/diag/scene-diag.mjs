import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/ar')
await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60000 })
await page.waitForTimeout(6000)

const out = await page.evaluate(() => {
  const t = window.__three
  const gl = t.gl, scene = t.scene

  // 1. Material colours as loaded from the GLB.
  const mats = new Map()
  scene.traverse((o) => {
    const m = o.material
    if (!m) return
    const list = Array.isArray(m) ? m : [m]
    for (const mat of list) {
      if (!mat.name || mats.has(mat.name)) continue
      mats.set(mat.name, {
        name: mat.name,
        type: mat.type,
        color: mat.color ? '#' + mat.color.getHexString() : null,
        colorLinear: mat.color ? [mat.color.r, mat.color.g, mat.color.b].map(n => +n.toFixed(4)) : null,
        metalness: mat.metalness ?? null,
        roughness: mat.roughness ?? null,
        envMapIntensity: mat.envMapIntensity ?? null,
      })
    }
  })

  // 2. Renderer colour management.
  const renderer = {
    outputColorSpace: gl.outputColorSpace,
    toneMapping: gl.toneMapping,
    toneMappingExposure: gl.toneMappingExposure,
    colorManagementEnabled: window.THREE?.ColorManagement?.enabled ?? 'n/a',
  }

  // 3. Environment.
  const env = {
    sceneEnvironment: Boolean(scene.environment),
    environmentIntensity: scene.environmentIntensity ?? 'unset',
    background: scene.background ? String(scene.background) : null,
  }

  // 4. Which top-level groups are visible, and how many meshes each holds.
  const groups = []
  scene.children.forEach((child, i) => {
    let meshes = 0, visibleMeshes = 0
    child.traverse((o) => { if (o.isMesh) { meshes++; if (o.visible) visibleMeshes++ } })
    groups.push({ i, type: child.type, visible: child.visible, meshes, visibleMeshes, children: child.children.length })
  })

  // 5. Lightformers — are any in the main scene rather than the env scene?
  const lightformers = []
  scene.traverse((o) => {
    if (o.isMesh && o.material && /basic/i.test(o.material.type) && o.visible) {
      lightformers.push({ name: o.name || '(unnamed)', type: o.material.type, pos: o.position.toArray().map(n => +n.toFixed(2)), color: o.material.color ? '#' + o.material.color.getHexString() : null })
    }
  })

  return { materials: [...mats.values()], renderer, env, groups, lightformers, mode: window.__scene.store.getState().mode }
})

console.log(JSON.stringify(out, null, 2))
await browser.close()
