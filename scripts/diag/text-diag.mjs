import { chromium } from '@playwright/test'

const browser = await chromium.launch({
  args: ['--disable-background-timer-throttling','--disable-renderer-backgrounding','--disable-backgrounding-occluded-windows','--force-device-scale-factor=1'],
})
const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 })
await page.goto('http://localhost:3210/ar')
await page.waitForFunction(() => Boolean(window.__scene), null, { timeout: 60000 })
await page.waitForTimeout(4000)

const out = await page.evaluate(() => {
  const ch = (v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4) }
  const lum = (r, g, b) => 0.2126 * ch(r) + 0.7152 * ch(g) + 0.0722 * ch(b)
  const parse = (s) => (s.match(/[\d.]+/g) || []).map(Number)
  const GROUND = lum(14, 15, 17) // --ink #0E0F11

  const rows = []
  const seen = new Set()
  for (const el of document.querySelectorAll('h1,h2,h3,p,span,dt,dd,li,a,th,td,label')) {
    const text = (el.textContent || '').trim()
    if (!text || text.length > 60) continue
    const st = getComputedStyle(el)
    const [r, g, b] = parse(st.color)
    // Effective alpha: element opacity times any ancestor opacity.
    let alpha = 1, node = el
    while (node && node !== document.body) { alpha *= Number(getComputedStyle(node).opacity); node = node.parentElement }
    // Composite the text colour over the page ground at that alpha.
    const cr = r * alpha + 14 * (1 - alpha), cg = g * alpha + 15 * (1 - alpha), cb = b * alpha + 17 * (1 - alpha)
    const L = lum(cr, cg, cb)
    const ratio = (Math.max(L, GROUND) + 0.05) / (Math.min(L, GROUND) + 0.05)
    const key = `${el.closest('section')?.id || 'chrome'}|${st.color}|${alpha.toFixed(2)}|${st.fontSize}`
    if (seen.has(key)) continue
    seen.add(key)
    rows.push({
      section: el.closest('section')?.id || 'chrome',
      tag: el.tagName.toLowerCase(),
      text: text.slice(0, 26),
      color: st.color,
      alpha: +alpha.toFixed(2),
      px: st.fontSize,
      ratio: +ratio.toFixed(2),
    })
  }
  return rows.filter((r) => r.ratio < 4.5).sort((a, b) => a.ratio - b.ratio)
})

console.log(`  ${'section'.padEnd(16)} ${'tag'.padEnd(5)} ${'ratio'.padStart(6)} ${'alpha'.padStart(6)} ${'size'.padStart(6)}  color / text`)
for (const r of out.slice(0, 30)) {
  console.log(`  ${r.section.padEnd(16)} ${r.tag.padEnd(5)} ${String(r.ratio).padStart(6)} ${String(r.alpha).padStart(6)} ${r.px.padStart(6)}  ${r.color}  ${r.text}`)
}
console.log(`\n  ${out.length} distinct text styles below 4.5:1 against #0E0F11`)
await browser.close()
