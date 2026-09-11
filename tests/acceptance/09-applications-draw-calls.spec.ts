import { expect, test } from '@playwright/test'

import { LOCALES } from './expected'
import { driveAndSettle, waitForScene } from './harness'

/**
 * TEST 9 — section 07 draw calls.
 *
 * The heaviest scene on the site: six environments, the drum, and the highlighted
 * units. Only the centred environment and its two immediate neighbours are ever
 * mounted, so the budget is checked at three points across the pin rather than at
 * one convenient sample — the whole risk here is a moment mid-rotation where more
 * is on screen than intended.
 *
 * Sampled in-loop through the DevStats handle, like every other count.
 */
const DRAW_CALL_BUDGET = 60

/** 60k per environment, and at most three mounted at once. */
const TRIANGLE_BUDGET = 60_000 * 3

for (const locale of LOCALES) {
  test(`[${locale}] draw calls across the applications drum`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page)

    const samples: Array<{ progress: number; calls: number; triangles: number; programs: number }> =
      []

    for (const progress of [0.02, 0.5, 0.98]) {
      const perf = await driveAndSettle(page, 'applications', 'applications', progress)
      samples.push({
        progress,
        calls: perf.calls,
        triangles: perf.triangles,
        programs: perf.programs,
      })
    }

    console.log(
      [
        '  §07 applications — six environments on a drum, three mounted at a time',
        `  ${'progress'.padEnd(10)} ${'calls'.padStart(7)} ${'tris'.padStart(10)} ${'programs'.padStart(9)}`,
        ...samples.map(
          (s) =>
            `  ${String(s.progress).padEnd(10)} ${String(s.calls).padStart(7)} ${String(
              s.triangles,
            ).padStart(10)} ${String(s.programs).padStart(9)}`,
        ),
      ].join('\n'),
    )

    const worstCalls = Math.max(...samples.map((s) => s.calls))
    const worstTriangles = Math.max(...samples.map((s) => s.triangles))

    expect
      .soft(worstCalls, `worst draw calls across §07 (budget ${DRAW_CALL_BUDGET})`)
      .toBeLessThan(DRAW_CALL_BUDGET)
    expect
      .soft(worstTriangles, `worst triangles across §07 (budget ${TRIANGLE_BUDGET})`)
      .toBeLessThan(TRIANGLE_BUDGET)
    // A zero would mean the sample was taken outside the loop, not that the scene
    // is cheap.
    expect.soft(worstCalls, 'perf sampled in-loop (non-zero)').toBeGreaterThan(0)
  })
}
