import { expect, test } from '@playwright/test'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { LOCALES } from './expected'
import { REPO_ROOT } from './paths'

/**
 * TEST 6 — the calculator, driven by keyboard only.
 *
 * This is the site's only interactive verb and its conversion mechanism, so it
 * has to work without a mouse, state its answer as TEXT rather than only in 3D,
 * and carry the disclaimer as visible copy.
 *
 * The disclaimer check is the important one: on a life-safety product in a
 * regulated market, indicative sizing presented without its qualifier is a legal
 * problem, not a copy problem. A tooltip, a <details>, or a title attribute all
 * fail — the text must be in the layout.
 */

const kit = JSON.parse(
  readFileSync(join(REPO_ROOT, 'assets', 'products.json'), 'utf8'),
) as {
  design_rule: { coverage_per_gram_m3: number }
  series: Array<{ products: Array<{ id: string; name: string; volume_m3: number | number[] }> }>
}

const messages = {
  ar: JSON.parse(readFileSync(join(REPO_ROOT, 'messages', 'ar.json'), 'utf8')),
  en: JSON.parse(readFileSync(join(REPO_ROOT, 'messages', 'en.json'), 'utf8')),
} as Record<string, { calc: { disclaimer: string } }>

const hi = (v: number | number[]) => (Array.isArray(v) ? v[1] : v)
const allProducts = kit.series
  .flatMap((s) => s.products)
  .sort((a, b) => hi(a.volume_m3) - hi(b.volume_m3))

/** The recommendation the site should reach, computed from the file, not the UI. */
function expectedSku(volume: number) {
  return allProducts.find((p) => hi(p.volume_m3) >= volume) ?? allProducts[allProducts.length - 1]
}

for (const locale of LOCALES) {
  test(`[${locale}] calculator is keyboard operable and states its result as text`, async ({
    page,
  }) => {
    await page.goto(`/${locale}#coverage`)
    await page.waitForLoadState('load')

    const section = page.locator('#coverage')
    await section.scrollIntoViewIfNeeded()

    const inputs = section.locator('input[type="number"]')
    await expect(inputs).toHaveCount(3)

    // Reach the first input by keyboard alone, then tab between them.
    await inputs.first().focus()
    // Asymmetric on purpose. With 2x2x2 any mis-ordering of the three fields
    // still multiplies to 8, so the test could not tell L, W and H apart — and
    // the visual order of the inputs reverses between the two directions.
    // 3 x 2 x 1.5 = 9 m³, and only the right assignment gives 9.
    const dims = [3, 2, 1.5]
    for (let i = 0; i < dims.length; i++) {
      const focused = await page.evaluate(() => document.activeElement?.getAttribute('type'))
      expect.soft(focused, `input ${i} reachable by keyboard`).toBe('number')
      await page.keyboard.press('Control+A')
      await page.keyboard.type(String(dims[i]))
      if (i < dims.length - 1) await page.keyboard.press('Tab')
    }

    const volume = dims[0] * dims[1] * dims[2]
    const sku = expectedSku(volume)

    // The result region, and what it says.
    const live = section.locator('[aria-live="polite"]')
    await expect(live).toHaveCount(1)
    await expect(live).toContainText(sku.name, { timeout: 10_000 })

    const liveText = (await live.innerText()).replace(/\s+/g, ' ')

    // The disclaimer must be visible text inside the result region.
    const disclaimer = messages[locale].calc.disclaimer
    const disclaimerLocator = section.getByText(disclaimer, { exact: false })
    await expect(disclaimerLocator).toBeVisible()

    const placement = await page.evaluate((text): {
      found: boolean
      insideDetails: boolean
      inTitleAttr: boolean
      display: string
      visibility: string
      opacity: string
      insideLiveRegion: boolean
    } => {
      const el = Array.from(document.querySelectorAll('#coverage *')).find(
        (n) => n.textContent?.trim() === text,
      ) as HTMLElement | undefined
      if (!el)
        return {
          found: false,
          insideDetails: false,
          inTitleAttr: false,
          display: "",
          visibility: "",
          opacity: "",
          insideLiveRegion: false,
        }
      const style = getComputedStyle(el)
      return {
        found: true,
        insideDetails: Boolean(el.closest('details, summary')),
        inTitleAttr: Boolean(el.closest('[title]')),
        display: style.display,
        visibility: style.visibility,
        opacity: style.opacity,
        insideLiveRegion: Boolean(el.closest('[aria-live]')),
      }
    }, disclaimer)

    console.log(
      [
        `  entered ${dims.join(' × ')} = ${volume} m³`,
        `  expected SKU (from products.json): ${sku.name}`,
        `  aria-live text: ${liveText.slice(0, 160)}`,
        `  disclaimer: found=${placement.found} inDetails=${placement.insideDetails} inTitle=${placement.inTitleAttr} display=${placement.display} opacity=${placement.opacity} insideResultRegion=${placement.insideLiveRegion}`,
      ].join('\n'),
    )

    expect.soft(liveText, 'result stated as text').toContain(sku.name)
    expect.soft(placement.found, 'disclaimer present as its own text node').toBe(true)
    expect.soft(placement.insideDetails, 'disclaimer NOT inside <details>/<summary>').toBe(
      false,
    )
    expect.soft(placement.inTitleAttr, 'disclaimer NOT hidden in a title attribute').toBe(
      false,
    )
    expect.soft(placement.display, 'disclaimer displayed').not.toBe('none')
    expect.soft(placement.visibility, 'disclaimer visible').toBe('visible')
    expect.soft(placement.insideLiveRegion, 'disclaimer adjacent to the result').toBe(true)
  })
}
