import { chromium } from '@playwright/test'
const label = process.argv[2] ?? 'a'
const out = process.argv[3]
const browser = await chromium.launch({ args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'] })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/en')
await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60000 })
await page.waitForTimeout(9000)
await page.evaluate(() => window.__scene?.refresh())
await page.evaluate(() => {
  const s = window.__scene
  const tr = s.triggers().find((t) => t.id === 'hero')
  if (tr) s.scrollTo(tr.start)
})
await page.waitForTimeout(2500)
await page.screenshot({ path: `${out}/hero-${label}.png` })
console.log('captured', label)
await browser.close()
