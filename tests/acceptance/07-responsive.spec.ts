import { expect, test } from '@playwright/test'

import { COMPACT_PINNED_IDS, EXPECTED_TRIGGER_COUNT, LOCALES, TIER_MATRIX } from './expected'
import { pad, waitForScene } from './harness'

/**
 * TEST 7 — the responsive matrix.
 *
 * Three viewports × two locales. What is being checked at each:
 *
 *   the right tier is selected
 *   every pinned element still fits its viewport
 *   below 768, ONLY §01, §03 and §04 are pinned
 *
 * Arabic is the binding case at 375. It renders at 1.06em with a 1.85 line
 * height, so any section that fits in English at that width may still overflow in
 * Arabic — and an overflowing PINNED section is unreachable, not just untidy.
 */
for (const locale of LOCALES) {
  for (const viewport of TIER_MATRIX) {
    test(`[${locale}] ${viewport.width}x${viewport.height} — ${viewport.tier} tier`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height })
      await page.goto(`/${locale}`)
      await waitForScene(page, { canvas: false })

      // Pins are created after the scroll engine chunk resolves; at compact there
      // are far fewer, so wait for the count to stop moving rather than for a
      // specific number.
      await page.waitForTimeout(2500)
      await page.evaluate(() => window.__scene?.refresh())
      await page.waitForTimeout(600)

      const measured = await page.evaluate(() => {
        const triggers = window.__scene!.triggers()
        const spacers = Array.from(document.querySelectorAll('.pin-spacer')).map((el) => {
          const section = el.querySelector('section[data-section]') as HTMLElement | null
          return {
            id: section?.id ?? '(unknown)',
            elementHeight: section?.getBoundingClientRect().height ?? 0,
          }
        })
        return {
          tier: window.__scene!.tier(),
          triggers: triggers.map((t) => t.id),
          spacers,
          innerHeight: window.innerHeight,
          innerWidth: window.innerWidth,
        }
      })

      const overflowing = measured.spacers.filter((s) => s.elementHeight > measured.innerHeight)

      console.log(
        [
          `  ${viewport.width}x${viewport.height} ${locale} — tier ${measured.tier} (expected ${viewport.tier})`,
          `  pinned sections: ${measured.triggers.length} → ${measured.triggers.join(', ') || '(none)'}`,
          `  ${'section'.padEnd(22)} ${pad('element', 9)} ${pad('viewport', 9)} ${pad('fits', 6)}`,
          ...measured.spacers.map(
            (s) =>
              `  ${s.id.padEnd(22)} ${pad(s.elementHeight.toFixed(0), 9)} ${pad(
                measured.innerHeight,
                9,
              )} ${pad(s.elementHeight <= measured.innerHeight ? 'yes' : 'NO', 6)}`,
          ),
        ].join('\n'),
      )

      expect.soft(measured.tier, `tier at ${viewport.width}px`).toBe(viewport.tier)

      // Every pinned element must fit, at every tier. This is the assertion that
      // an overflowing pinned section is unreachable content.
      expect
        .soft(
          overflowing.map((s) => `${s.id} ${s.elementHeight.toFixed(0)}px`),
          `pinned sections taller than the ${measured.innerHeight}px viewport`,
        )
        .toEqual([])

      if (viewport.tier === 'compact') {
        // Only the three sections that need scroll to say anything keep their pins.
        expect
          .soft([...measured.triggers].sort(), 'sections pinned at the compact tier')
          .toEqual([...COMPACT_PINNED_IDS].sort())
      } else {
        expect
          .soft(measured.triggers.length, `pinned section count at the ${viewport.tier} tier`)
          .toBe(EXPECTED_TRIGGER_COUNT)
      }
    })
  }

  /**
   * The compact tier must not render the six environment names as a six-item
   * list. Checked in Arabic at 375, where those labels are the longest on the
   * site.
   */
  test(`[${locale}] 375px — environment labels do not stack`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 })
    await page.goto(`/${locale}`)
    await waitForScene(page, { canvas: false })
    await page.waitForTimeout(2000)

    const measured = await page.evaluate(() => {
      const section = document.getElementById('applications')
      if (!section) return null
      const names = Array.from(section.querySelectorAll('.env-name')) as HTMLElement[]
      const markers = Array.from(section.querySelectorAll('.env-marker')) as HTMLElement[]
      const wideList = section.querySelector('ul[aria-label]') as HTMLElement | null
      return {
        totalNames: names.length,
        visibleNames: names.filter((n) => getComputedStyle(n).display !== 'none').length,
        markers: markers.length,
        wideListDisplay: wideList ? getComputedStyle(wideList).display : 'absent',
        sectionHeight: section.getBoundingClientRect().height,
        viewport: window.innerHeight,
      }
    })

    console.log(
      [
        `  environment names in DOM      ${measured?.totalNames}`,
        `  visible at once               ${measured?.visibleNames} (expected 1)`,
        `  position markers              ${measured?.markers}`,
        `  wide label list display       ${measured?.wideListDisplay} (expected none)`,
        `  section height                ${measured?.sectionHeight.toFixed(0)} / ${measured?.viewport}`,
      ].join('\n'),
    )

    expect.soft(measured, 'applications section present').not.toBeNull()
    if (!measured) return

    // All six stay in the DOM and in the accessibility tree; only one is shown.
    expect.soft(measured.totalNames, 'all six names present in the DOM').toBe(6)
    expect.soft(measured.visibleNames, 'exactly one environment name visible').toBe(1)
    expect.soft(measured.markers, 'the other five reduced to position markers').toBe(6)
    expect.soft(measured.wideListDisplay, 'the wide label list is hidden at 375').toBe('none')
  })
}
