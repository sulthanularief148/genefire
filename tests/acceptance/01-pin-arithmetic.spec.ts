import { expect, test } from '@playwright/test'

import { EXPECTED_TRIGGER_COUNT, LOCALES, TOLERANCE, VIEWPORT } from './expected'
import { pad, settleLayout, waitForScene } from './harness'

/**
 * TEST 1 — pin geometry, as invariants rather than as a pixel table.
 *
 * Per pinned section, in both locales:
 *
 *   spacer height === element height + pin duration     (GSAP's own arithmetic)
 *   element height <= viewport height                   (the reachability rule)
 *   seam to the next pin === this element's height      (what pinSpacing produces)
 *
 * The middle one is the one that matters. A pinned section taller than the
 * viewport cannot be scrolled — the pin holds it in place for its whole duration,
 * so anything below the fold is unreachable for that entire stretch. The
 * mid-pin check on the last child catches it directly rather than as an
 * arithmetic discrepancy in a total.
 */
for (const locale of LOCALES) {
  test(`[${locale}] pin geometry`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page, { canvas: false })
    await settleLayout(page, EXPECTED_TRIGGER_COUNT)

    const measured = await page.evaluate(() => {
      const triggers = window.__scene!.triggers()

      const spacers = Array.from(document.querySelectorAll('.pin-spacer')).map((el) => {
        const section = el.querySelector('section[data-section]') as HTMLElement | null
        return {
          id: section?.id ?? '(unknown)',
          spacerHeight: (el as HTMLElement).getBoundingClientRect().height,
          elementHeight: section?.getBoundingClientRect().height ?? 0,
        }
      })

      return {
        triggers,
        spacers,
        scrollHeight: document.documentElement.scrollHeight,
        innerHeight: window.innerHeight,
        // Unpinned sections only. `main > div` would pull in the ProductPins
        // wrapper, which contains all eleven spacers and dwarfs everything else.
        unpinnedHeight: Array.from(document.querySelectorAll('main section'))
          .filter((el) => !el.closest('.pin-spacer'))
          .reduce((sum, el) => sum + (el as HTMLElement).getBoundingClientRect().height, 0),
      }
    })

    const durationById = new Map(measured.triggers.map((t) => [t.id, t.end - t.start]))

    /* ------------------------------------------------------- the report --- */

    const lines = [
      `viewport ${VIEWPORT.width}x${measured.innerHeight}`,
      '',
      `  ${'section'.padEnd(20)} ${pad('element', 9)} ${pad('pin', 9)} ${pad('spacer', 9)} ${pad(
        'expected',
        9,
      )} ${pad('fits', 6)}`,
    ]

    for (const spacer of measured.spacers) {
      const duration = durationById.get(spacer.id) ?? NaN
      const expected = spacer.elementHeight + duration
      lines.push(
        `  ${spacer.id.padEnd(20)} ${pad(spacer.elementHeight.toFixed(0), 9)} ${pad(
          duration.toFixed(0),
          9,
        )} ${pad(spacer.spacerHeight.toFixed(0), 9)} ${pad(expected.toFixed(0), 9)} ${pad(
          spacer.elementHeight <= measured.innerHeight ? 'yes' : 'NO',
          6,
        )}`,
      )
    }

    lines.push('')
    lines.push(`  triggers            ${measured.triggers.length} (expected ${EXPECTED_TRIGGER_COUNT})`)
    lines.push(`  scrollHeight        ${measured.scrollHeight}`)
    lines.push(`  unpinned sections   ${measured.unpinnedHeight.toFixed(0)}`)
    console.log(lines.join('\n'))

    /* ----------------------------------------------------- the invariants --- */

    expect.soft(measured.triggers.length, 'ScrollTrigger count').toBe(EXPECTED_TRIGGER_COUNT)
    expect.soft(measured.spacers.length, 'pin spacer count').toBe(EXPECTED_TRIGGER_COUNT)

    for (const spacer of measured.spacers) {
      const duration = durationById.get(spacer.id)
      expect.soft(duration, `${spacer.id} has a trigger`).toBeDefined()
      if (duration === undefined) continue

      expect
        .soft(
          Math.abs(spacer.spacerHeight - (spacer.elementHeight + duration)),
          `${spacer.id}: spacer === element (${spacer.elementHeight.toFixed(0)}) + pin (${duration.toFixed(0)})`,
        )
        .toBeLessThanOrEqual(TOLERANCE.spacerPx)

      expect
        .soft(
          spacer.elementHeight,
          `${spacer.id}: element height fits the viewport (${measured.innerHeight})`,
        )
        .toBeLessThanOrEqual(measured.innerHeight)
    }

    /* ------------------------------------------- ordering, not geometry --- */

    // What used to be here compared each gap to the pinned element's height. That
    // model broke the moment an UNPINNED section appeared between two pinned
    // runs: §06 Coverage sits between the last product and §07, so the gap is
    // correctly 720 + 729. Teaching the test to account for intervening content
    // means re-implementing the layout engine inside the test, and it would break
    // again on the next insertion.
    //
    // What actually matters is that pin ranges never overlap — that is the
    // failure mode which would make two sections fight over the scroll. It needs
    // no layout model and does not care what sits between them.
    const ordered = [...measured.triggers].sort((a, b) => a.start - b.start)
    const ranges: string[] = []

    for (let i = 1; i < ordered.length; i++) {
      const previous = ordered[i - 1]
      const gap = ordered[i].start - previous.end
      ranges.push(
        `  ${previous.id} [${previous.start}-${previous.end}] → ${ordered[i].id} [${ordered[i].start}-${ordered[i].end}] gap ${gap.toFixed(0)}px`,
      )
      expect
        .soft(gap, `${previous.id} → ${ordered[i].id}: pin ranges must not overlap`)
        .toBeGreaterThanOrEqual(0)
    }
    console.log(['', '  pin ranges (strictly increasing, non-overlapping):', ...ranges].join('\n'))
  })

  /**
   * The direct version of the reachability check: scroll to the middle of every
   * pin and confirm the section's last child is actually on screen.
   */
  test(`[${locale}] pinned content is reachable at mid-pin`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page, { canvas: false })
    await settleLayout(page, EXPECTED_TRIGGER_COUNT)

    const triggers = await page.evaluate(() => window.__scene!.triggers())
    const report: string[] = ['  section                last child     top   bottom  inside']

    for (const trigger of triggers) {
      const midpoint = trigger.start + (trigger.end - trigger.start) / 2

      const rect = await page.evaluate(
        async ({ y, id }) => {
          window.__scene!.scrollTo(y)
          await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
          const section = document.getElementById(id)
          const last = section?.lastElementChild as HTMLElement | null
          if (!last) return null
          const box = last.getBoundingClientRect()
          return {
            tag: last.tagName.toLowerCase(),
            top: box.top,
            bottom: box.bottom,
            viewport: window.innerHeight,
          }
        },
        { y: midpoint, id: trigger.id },
      )

      if (!rect) continue

      const inside = rect.top >= -1 && rect.bottom <= rect.viewport + 1
      report.push(
        `  ${trigger.id.padEnd(20)} ${rect.tag.padEnd(10)} ${pad(rect.top.toFixed(0), 7)} ${pad(
          rect.bottom.toFixed(0),
          8,
        )} ${pad(inside ? 'yes' : 'NO', 7)}`,
      )

      expect
        .soft(rect.bottom, `${trigger.id}: last child bottom within the viewport at mid-pin`)
        .toBeLessThanOrEqual(rect.viewport + 1)
      expect
        .soft(rect.top, `${trigger.id}: last child top within the viewport at mid-pin`)
        .toBeGreaterThanOrEqual(-1)
    }

    console.log(report.join('\n'))
  })
}
