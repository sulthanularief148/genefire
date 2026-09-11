import { test } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { LOCALES } from './expected'
import { REPO_ROOT } from './paths'
import { waitForScene } from './harness'

/**
 * Visual capture, for human review. Asserts nothing.
 *
 * The suite was blind to appearance: thirty tests passed on a hero whose product
 * was the wrong colour and half off-frame. Draw calls, pin arithmetic and uniform
 * drift are all measurable and none of them can see that.
 *
 * Fixed scroll positions, so two runs are comparable. Pinned sections are sampled
 * at a fraction of their pin rather than at a DOM offset — with sixteen spacers
 * on the page an offset lands nowhere near the section.
 */

const OUT = join(REPO_ROOT, 'tests', 'screenshots')

interface Shot {
  id: string
  /** Fraction through the pin, for pinned sections. */
  at: number
  /** File-name suffix when a section is captured more than once. */
  label?: string
}

/** Sections, and where in each to take the picture. */
const SHOTS: Shot[] = [
  { id: 'hero', at: 0.0 },
  { id: 'hero', at: 0.75, label: 'hero-settled' },
  { id: 'problem', at: 0.6 },
  { id: 'activation', at: 0.45, label: 'activation-discharge' },
  { id: 'activation', at: 0.9, label: 'activation-after' },
  { id: 'series', at: 0.5 },
  { id: 'product-sx300', at: 0.4, label: 'product-specs' },
  { id: 'product-sx300', at: 0.68, label: 'product-exploded' },
  // The smallest unit in the range, kept as the proof that section 05 frames each
  // product from its own bounds: at a shared world scale this one was a few pixels
  // wide on top of the 'Dimensions' row.
  { id: 'product-sx5_10', at: 0.4, label: 'product-smallest' },
  { id: 'coverage', at: 0 },
  // 0.5 is the exact midpoint between two environments — the one progress value
  // at which the drum is mid-turn and square to nothing. Sample where an
  // enclosure is actually fronted.
  { id: 'applications', at: 0.4 },
  { id: 'comparison', at: 0 },
  { id: 'certifications', at: 0 },
  { id: 'contact', at: 0 },
]

for (const locale of LOCALES) {
  test(`[${locale}] capture section screenshots`, async ({ page }) => {
    test.setTimeout(300_000)
    mkdirSync(OUT, { recursive: true })

    await page.goto(`/${locale}`)
    await waitForScene(page, { canvas: false })
    // Let the canvas and its models resolve, so the captures show the real scene.
    await page.waitForTimeout(8000)
    await page.evaluate(() => window.__scene?.refresh())
    await page.waitForTimeout(500)

    for (const shot of SHOTS) {
      const name = shot.label ?? shot.id

      const placed = await page.evaluate(
        ({ id, at }) => {
          const scene = window.__scene
          if (!scene) return false
          const trigger = scene.triggers().find((t) => t.id === id)
          if (trigger) {
            scene.scrollTo(trigger.start + (trigger.end - trigger.start) * at)
            return true
          }
          const el = document.getElementById(id)
          if (!el) return false
          scene.scrollTo(el.getBoundingClientRect().top + window.scrollY)
          return true
        },
        { id: shot.id, at: shot.at },
      )

      if (!placed) continue

      // Wait for the scroll to ACTUALLY arrive, then let the camera damp.
      //
      // Waiting on the trigger's own progress rather than on a flat timeout, so a
      // long jump cannot be photographed part-way through its own entry — a shot
      // taken early does not look like a timing problem, it looks like a
      // composition problem, and it is read as one.
      //
      // This wait did not, on its own, fix the case that exposed it: section 05
      // captured at 28.5% of frame height while its camera solver was provably
      // asking for 62%. That turned out to be a site bug, not a harness one — the
      // shared `product` channel was stale at 0, so the product sat 0.6 m back on
      // its arrival curve while the camera framed where it should have been. See
      // publish() in PinnedSection. The wait stays because it removes the other
      // half of the ambiguity.
      await page
        .waitForFunction(
          ({ id, at }) => {
            const trigger = window.__scene?.triggers().find((t) => t.id === id)
            return !trigger || Math.abs(trigger.progress - at) < 0.005
          },
          { id: shot.id, at: shot.at },
          { timeout: 15_000 },
        )
        .catch(() => {})
      // Camera damping is a display filter over the settled target.
      await page.waitForTimeout(1200)
      await page.screenshot({
        path: join(OUT, `${locale}-${name}.png`),
        animations: 'disabled',
      })
    }
  })
}
