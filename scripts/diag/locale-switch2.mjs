import { chromium } from '@playwright/test'
const browser = await chromium.launch()
for (const url of ['/ar', '/ar#coverage', '/ar#contact']) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
  await page.goto('http://localhost:3210' + url)
  await page.waitForLoadState('load')
  await page.waitForTimeout(1500)
  const link = page.locator('nav a[hreflang="en"]')
  const href = await link.getAttribute('href')
  await link.click()
  await page.waitForTimeout(2000)
  console.log(`from ${url.padEnd(16)} href=${String(href).padEnd(16)} -> ${page.url().replace('http://localhost:3210','')}`)
  await page.close()
}
await browser.close()
