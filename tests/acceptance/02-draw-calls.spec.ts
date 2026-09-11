import { expect, test } from '@playwright/test'

import { LOCALES } from './expected'
import { driveAndSettle, waitForScene } from './harness'

/**
 * TEST 2 — draw calls, sampled INSIDE the render loop.
 *
 * Never from an evaluate() reading renderer.info directly: that auto-resets each
 * frame, so a read from outside reports near-zero. This project has already been
 * misled by exactly that, seeing 3 calls / 6 triangles against a true 28 /
 * 21,136 and spending an afternoon hunting a culling bug that did not exist.
 */
const DRAW_CALL_BUDGET = 60

/**
 * Eight unjoined parts, one decal mesh, and the floor.
 *
 * Raised twice, both times for something deliberate:
 *   8  → 9   the printed markings. Wordmark, model number and arrow, every copy,
 *            merge into ONE geometry on ONE shared material precisely so a fully
 *            decalled product costs a single call rather than six.
 *   9  → 13  the ground plane and its contact shadow, which is what stops the
 *            product reading as cut out and pasted onto the page.
 *
 * Measured at 10 in English and 12 in Arabic; the spread is the contact shadow's
 * own pass being caught at different points by the worst-of-8 sampling. Thirteen
 * leaves headroom for that without hiding a real regression — the whole-page
 * budget is 60, and this section draws one product.
 *
 * If this climbs again, the decal merge has come apart or something is mounting a
 * second floor.
 */
const EXPLODED_PRODUCT_BUDGET = 13

/**
 * Section 01: one product on a lit turntable, and nothing else, at both ends.
 *
 * The PX 5 is three joined meshes plus its decal geometry. The turntable is the
 * body lathe, the platter, the rim light, the floor pool, the backdrop glow and its
 * own contact-shadow plane. Ground's floor and contact shadow are on screen too.
 *
 * 16 → 18 when the turntable was rebuilt: the previous plinth's single haze plane
 * became the rim, the pool and the backdrop, which is two more calls for the same
 * job done without a hard edge. Same headroom as before.
 *
 * Checked at BOTH ends of the section — the opening shot beside the copy and the
 * focus shot with the unit centred — because the scene is the same objects at a
 * different framing, and a number that moved between them would mean something had
 * started drawing that should not. The eleven-unit lineup that used to form here is
 * gone; the range at true relative scale is section 04's job.
 */
const HERO_OPENING_BUDGET = 18
const HERO_FOCUS_BUDGET = 18

for (const locale of LOCALES) {
  test(`[${locale}] draw calls across the hero`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page)

    const opening = await driveAndSettle(page, 'hero', 'hero', 0)
    const settled = await driveAndSettle(page, 'hero', 'hero', 0.85)

    console.log(
      [
        `  §01 hero — PX 5 on the turntable, opening shot then focus shot`,
        `  ${'frame'.padEnd(12)} ${'calls'.padStart(7)} ${'tris'.padStart(9)} ${'programs'.padStart(9)}`,
        `  ${'opening'.padEnd(12)} ${String(opening.calls).padStart(7)} ${String(
          opening.triangles,
        ).padStart(9)} ${String(opening.programs).padStart(9)}`,
        `  ${'focus'.padEnd(12)} ${String(settled.calls).padStart(7)} ${String(
          settled.triangles,
        ).padStart(9)} ${String(settled.programs).padStart(9)}`,
      ].join('\n'),
    )

    expect
      .soft(opening.calls, `hero opening draw calls (budget ${HERO_OPENING_BUDGET})`)
      .toBeLessThanOrEqual(HERO_OPENING_BUDGET)
    expect
      .soft(settled.calls, `hero focus draw calls (budget ${HERO_FOCUS_BUDGET})`)
      .toBeLessThanOrEqual(HERO_FOCUS_BUDGET)
    expect
      .soft(settled.calls, `whole-page budget ${DRAW_CALL_BUDGET}`)
      .toBeLessThan(DRAW_CALL_BUDGET)
    expect.soft(opening.calls, 'perf sampled in-loop (non-zero)').toBeGreaterThan(0)
  })

  test(`[${locale}] draw calls at the series rail`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page)

    // Three stages; sample each as it centres, and report the worst.
    const samples: Array<{ progress: number; calls: number; triangles: number; programs: number }> =
      []

    // Not 0: the rail hides itself below progress 0.0001, so a sample there is
    // measuring whatever else is on screen rather than the rail.
    for (const progress of [0.02, 0.5, 0.98]) {
      const perf = await driveAndSettle(page, 'series', 'series', progress)
      samples.push({
        progress,
        calls: perf.calls,
        triangles: perf.triangles,
        programs: perf.programs,
      })
    }

    console.log(
      [
        `  §04 series rail — eleven units at true relative scale`,
        `  ${'progress'.padEnd(10)} ${'calls'.padStart(7)} ${'tris'.padStart(9)} ${'programs'.padStart(9)}`,
        ...samples.map(
          (s) =>
            `  ${String(s.progress).padEnd(10)} ${String(s.calls).padStart(7)} ${String(
              s.triangles,
            ).padStart(9)} ${String(s.programs).padStart(9)}`,
        ),
      ].join('\n'),
    )

    const worst = Math.max(...samples.map((s) => s.calls))
    expect
      .soft(worst, `worst draw calls on the rail (budget ${DRAW_CALL_BUDGET})`)
      .toBeLessThan(DRAW_CALL_BUDGET)
    // A zero here means the sample was taken outside the loop, not that the scene
    // is empty — fail loudly rather than passing a budget check on no data.
    expect.soft(worst, 'perf sampled in-loop (non-zero)').toBeGreaterThan(0)
  })

  test(`[${locale}] draw calls at one exploded product`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page)

    // Progress 0.65 sits inside the exploded-view beat (0.55–0.80).
    const perf = await driveAndSettle(page, 'product', 'product', 0.65, 'sx300')

    console.log(
      [
        `  §05 SX 300, exploded (progress 0.65), from the /parts build`,
        `  calls ${perf.calls}   triangles ${perf.triangles}   programs ${perf.programs}   geometries ${perf.geometries}`,
      ].join('\n'),
    )

    expect
      .soft(
        perf.calls,
        `exploded product draw calls (budget ${EXPLODED_PRODUCT_BUDGET}, /parts build is unjoined)`,
      )
      .toBeLessThanOrEqual(EXPLODED_PRODUCT_BUDGET)
    expect.soft(perf.calls, 'perf sampled in-loop (non-zero)').toBeGreaterThan(0)
  })
}
