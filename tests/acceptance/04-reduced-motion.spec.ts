import { expect, test } from '@playwright/test'

import { LOCALES, PRODUCT_IDS, TOLERANCE } from './expected'
import { waitForScene } from './harness'

/**
 * TEST 4 — reduced motion.
 *
 * An accessibility requirement, not an optimisation: the whole choreography goes
 * away, the page collapses to natural flow, and every beat shows its finished
 * state. Copy that only appears at a late beat — activation.line at 0.80 — is
 * exactly what breaks here, and it must be readable.
 */

for (const locale of LOCALES) {
  test(`[${locale}] reduced motion collapses the choreography`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await page.goto(`/${locale}`)
    await waitForScene(page, { canvas: false })

    // Give the provider a moment to tear the engine down after mount.
    await page.waitForTimeout(1500)

    const measured = await page.evaluate((productIds) => {
      const line = document.querySelector('#activation .display-red') as HTMLElement | null
      const sections = Array.from(document.querySelectorAll('section[data-section]')).map((el) => ({
        id: (el as HTMLElement).id,
        beat: (el as HTMLElement).dataset.beat ?? null,
      }))
      return {
        triggers: window.__scene?.triggers().length ?? -1,
        pinSpacers: document.querySelectorAll('.pin-spacer').length,
        scrollHeight: document.documentElement.scrollHeight,
        // Natural flow, measured in this same run: the page should be the sum of
        // its sections and nothing more. No hardcoded percentage — the earlier
        // 20% guess had no derivation behind it and failed a correct collapse.
        naturalHeight: Array.from(document.querySelectorAll(`main section`)).reduce(
          (sum, el) => sum + (el as HTMLElement).getBoundingClientRect().height,
          0,
        ),
        activationLineOpacity: line ? getComputedStyle(line).opacity : null,
        activationLineText: line?.textContent?.trim() ?? null,
        sections,
        productBeats: productIds.map((id) => {
          const el = document.querySelector(`#product-${id}`) as HTMLElement | null
          return { id, beat: el?.dataset.beat ?? null }
        }),
      }
    }, PRODUCT_IDS as unknown as string[])

    console.log(
      [
        `  triggers                ${measured.triggers} (expected 0)`,
        `  .pin-spacer elements    ${measured.pinSpacers} (expected 0)`,
        `  scrollHeight            ${measured.scrollHeight} (natural flow sums to ${measured.naturalHeight.toFixed(0)})`,
        `  activation.line opacity ${measured.activationLineOpacity} (expected 1)`,
        `  section beats           ${measured.sections.map((s) => `${s.id}=${s.beat}`).join(' ')}`,
        `  product beats           ${measured.productBeats.map((p) => p.beat).join(' ')} (expected all 3)`,
      ].join('\n'),
    )

    expect.soft(measured.triggers, 'ScrollTrigger count under reduced motion').toBe(0)
    expect.soft(measured.pinSpacers, 'pin spacers under reduced motion').toBe(0)
    expect
      .soft(
        Math.abs(measured.scrollHeight - measured.naturalHeight),
        `scrollHeight equals the summed natural section heights (${measured.naturalHeight.toFixed(0)})`,
      )
      .toBeLessThanOrEqual(TOLERANCE.collapsedPx)
    expect.soft(measured.activationLineOpacity, 'activation.line opacity').toBe('1')
    expect.soft(measured.activationLineText, 'activation.line has text').toBeTruthy()

    // Every product pin shows its final beat, so the spec figures and hotspot
    // labels are all visible rather than stuck mid-timeline.
    for (const p of measured.productBeats) {
      expect.soft(p.beat, `product ${p.id} beat`).toBe('3')
    }
  })
}
