import { expect, test } from '@playwright/test'

import { LOCALES, PRODUCT_IDS } from './expected'
import { auditScrub, waitForScene } from './harness'

// 40 uniforms x 11 samples x 2 directions x 4 targets, each sample rendering real
// frames. Long by nature rather than slow by fault, so the timeout is raised here
// rather than across the suite.
test.describe.configure({ timeout: 600_000 })

/**
 * TEST 3 — path independence.
 *
 * The property the scrub design actually claims: the uniform block at progress P
 * is the same whether you arrived going forward or backward. Uniforms, not
 * pixels — the plume carries a uTime wander term, so two visits to the same
 * progress MUST differ on screen, and a pixel comparison that passed would mean
 * time had accidentally been frozen.
 */

/** First, middle and last of the eleven product pins, plus the discharge. */
const TARGETS = [
  { label: '§03 activation', mode: 'activation', channel: 'activation', active: 'sx300' },
  {
    label: `§05 first (${PRODUCT_IDS[0]})`,
    mode: 'product',
    channel: 'product',
    active: PRODUCT_IDS[0],
  },
  {
    label: `§05 middle (${PRODUCT_IDS[5]})`,
    mode: 'product',
    channel: 'product',
    active: PRODUCT_IDS[5],
  },
  {
    label: `§05 last (${PRODUCT_IDS[10]})`,
    mode: 'product',
    channel: 'product',
    active: PRODUCT_IDS[10],
  },
]

for (const locale of LOCALES) {
  test(`[${locale}] scrub audit — forward vs backward uniforms`, async ({ page }) => {
    await page.goto(`/${locale}`)
    await waitForScene(page)

    const report: string[] = ['  channel / target                 samples  uniforms  drift']

    for (const target of TARGETS) {
      const result = await auditScrub(page, target.channel, target.mode, target.active)

      report.push(
        `  ${target.label.padEnd(30)} ${String(result.samples).padStart(7)} ${String(
          result.uniformsPerSample,
        ).padStart(9)} ${String(result.drift.length).padStart(6)}`,
      )

      for (const d of result.drift.slice(0, 8)) {
        report.push(
          `      DRIFT ${d.material}.${d.uniform} @p=${d.progress}: forward ${d.forward} vs backward ${d.backward} (Δ ${d.delta})`,
        )
      }

      expect
        .soft(result.drift.length, `${target.label}: uniforms that differ forward vs backward`)
        .toBe(0)
      // Guard against a vacuous pass: if nothing was sampled, the audit proved
      // nothing.
      expect
        .soft(result.uniformsPerSample, `${target.label}: uniforms actually sampled`)
        .toBeGreaterThan(0)
    }

    console.log(report.join('\n'))
  })
}
