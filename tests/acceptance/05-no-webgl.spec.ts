import { expect, test } from '@playwright/test'

import { LOCALES, PRODUCT_IDS } from './expected'

/**
 * TEST 5 — WebGL disabled entirely.
 *
 * `--disable-gpu` is NOT sufficient: Chromium falls back to SwiftShader and still
 * hands out a context, so the canvas path stays alive and the fallback is never
 * exercised. Overriding getContext is the only way to actually take WebGL away.
 *
 * The requirement it protects: the canvas is illustration. Every headline, spec
 * and product name is real DOM text, and the page has to be readable without a
 * single WebGL call.
 */
const KILL_WEBGL = `
  const original = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (type, ...rest) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') return null;
    return original.call(this, type, ...rest);
  };
`

for (const locale of LOCALES) {
  test(`[${locale}] page is readable with WebGL disabled`, async ({ page }) => {
    const errors: string[] = []
    // Capture the failing URL and status, not just 'a 404 happened'. A bare
    // console error tells you something is missing and refuses to say what.
    const failedRequests: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    page.on('response', (r) => {
      if (r.status() >= 400) failedRequests.push(`${r.status()} ${r.url()}`)
    })
    page.on('requestfailed', (r) => {
      failedRequests.push(`FAILED ${r.failure()?.errorText ?? '?'} ${r.url()}`)
    })
    page.on('console', (m) => {
      const text = m.text()
      if (m.type() !== 'error') return
      if (text.includes('hydrat')) return
      // Resource 404s are reported through failedRequests, with their URL.
      if (text.includes('Failed to load resource')) return
      errors.push(text)
    })

    await page.addInitScript(KILL_WEBGL)
    await page.goto(`/${locale}`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(2500)

    const measured = await page.evaluate(() => {
      const sectionText = (sel: string) =>
        (document.querySelector(sel) as HTMLElement | null)?.innerText?.trim().length ?? 0
      // Matched by what it IS, not by which fixed container happens to come
      // first in the document.
      const fallback = document.querySelector('img[src*="_hero.png"]') as HTMLImageElement | null
      return {
        webglContext: (() => {
          try {
            return document.createElement('canvas').getContext('webgl2')
          } catch {
            return null
          }
        })(),
        canvases: document.querySelectorAll('canvas').length,
        fallbackSrc: fallback?.getAttribute('src') ?? null,
        fallbackLoaded: fallback ? fallback.complete && fallback.naturalWidth > 0 : false,
        hero: sectionText('#hero'),
        problem: sectionText('#problem'),
        activation: sectionText('#activation'),
        series: sectionText('#series'),
        coverage: sectionText('#coverage'),
        firstProduct: sectionText('#product-sx5_10'),
        h1: (document.querySelector('h1') as HTMLElement | null)?.innerText?.trim() ?? '',
      }
    })

    console.log(
      [
        `  webgl2 context          ${measured.webglContext === null ? 'null (disabled) ✓' : 'STILL AVAILABLE'}`,
        `  <canvas> elements       ${measured.canvases} (expected 0)`,
        `  fallback still          ${measured.fallbackSrc} loaded=${measured.fallbackLoaded}`,
        `  copy length per section hero=${measured.hero} problem=${measured.problem} activation=${measured.activation} series=${measured.series} products[0]=${measured.firstProduct} coverage=${measured.coverage}`,
        `  page errors             ${errors.length}${errors.length ? ': ' + errors.slice(0, 3).join(' | ') : ''}`,
        `  failed requests         ${failedRequests.length}`,
        ...failedRequests.map((entry) => `      ${entry}`),
      ].join('\n'),
    )

    expect.soft(measured.webglContext, 'WebGL truly unavailable').toBeNull()
    expect.soft(measured.canvases, 'no canvas mounted').toBe(0)
    expect.soft(measured.fallbackSrc, 'pre-rendered fallback used').toContain('_hero.png')
    expect.soft(measured.fallbackLoaded, 'fallback image actually loaded').toBe(true)

    for (const [name, length] of [
      ['hero', measured.hero],
      ['problem', measured.problem],
      ['activation', measured.activation],
      ['series', measured.series],
      ['coverage', measured.coverage],
      ['product-sx5_10', measured.firstProduct],
    ] as const) {
      expect.soft(length, `${name} renders copy`).toBeGreaterThan(20)
    }

    expect.soft(errors, 'no uncaught errors without WebGL').toEqual([])
    expect.soft(failedRequests, 'every request resolves').toEqual([])
  })

  test(`[${locale}] spec sheets need no WebGL at all`, async ({ page }) => {
    await page.addInitScript(KILL_WEBGL)
    for (const id of [PRODUCT_IDS[0], PRODUCT_IDS[10]]) {
      await page.goto(`/${locale}/products/${id}`)
      const canvases = await page.locator('canvas').count()
      const heading = await page.locator('h1').innerText()
      expect.soft(canvases, `${id} sub-route canvas count`).toBe(0)
      expect.soft(heading.trim().length, `${id} sub-route heading`).toBeGreaterThan(0)
    }
  })
}
