import { chromium } from '@playwright/test'
const browser = await chromium.launch()
for (const locale of ['ar', 'en']) {
  const other = locale === 'ar' ? 'en' : 'ar'
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  const nav = []
  page.on('framenavigated', (f) => { if (f === page.mainFrame()) nav.push(f.url()) })
  await page.goto(`http://localhost:3210/${locale}#coverage`)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
  const link = page.locator(`nav a[hreflang="${other}"]`)
  const href = await link.getAttribute('href')
  const box = await link.boundingBox()
  console.log(`${locale} -> ${other}: href=${href} box=${box ? Math.round(box.x)+','+Math.round(box.y)+' '+Math.round(box.width)+'x'+Math.round(box.height) : 'NONE'}`)
  await link.click()
  await page.waitForTimeout(2500)
  console.log(`   after: ${page.url()}`)
  console.log(`   navigations: ${nav.slice(1).join(' | ') || '(none)'}`)
  await page.close()
}
await browser.close()
