import type { Page } from '@playwright/test'

/**
 * Shared plumbing for the acceptance suite.
 *
 * Two rules run through all of it:
 *
 *  1. WebGL state is only valid INSIDE the render call. Draw calls, triangle
 *     counts and framebuffer contents read from an ordinary evaluate() are read
 *     after the frame ended — renderer.info has auto-reset and the drawing buffer
 *     is undefined. Everything here samples through the in-loop handle instead.
 *
 *  2. Nothing is measured until the layout has settled. Fonts change line boxes,
 *     which changes every `end: '+=N%'`, so ScrollTrigger has to have refreshed
 *     after the fonts resolved or the pin arithmetic is measured against the
 *     wrong page height.
 */

/** Waits for the DOM-side scroll handle and the in-canvas handle to both exist. */
export async function waitForScene(page: Page, { canvas = true } = {}): Promise<void> {
  await page.waitForFunction(() => Boolean(window.__scene), null, { timeout: 60_000 })
  if (canvas) {
    await page.waitForFunction(() => Boolean(window.__three), null, { timeout: 60_000 })
  }
}

/**
 * Waits for fonts, forces a ScrollTrigger refresh, and waits for the trigger
 * count to stop changing. Only then is a pin measurement meaningful.
 */
export async function settleLayout(page: Page, expectedTriggers: number): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  await page.waitForFunction(
    (expected) => window.__scene?.triggers().length === expected,
    expectedTriggers,
    { timeout: 60_000 },
  )

  await page.evaluate(() => window.__scene?.refresh())

  // A refresh re-measures every pin; give layout a frame to apply it.
  await page.waitForTimeout(500)
}

/**
 * Drives the scene to a given section and progress, then renders real frames.
 *
 * `advance` is what makes any subsequent sample valid: it runs R3F's loop
 * synchronously, so useFrame executes and the numbers being read are the ones a
 * frame actually produced.
 */
/**
 * Channel order down the page. Driving a section means every channel BEFORE it is
 * finished and every channel after it has not started — which is what real
 * scrolling produces, and what decides whether earlier scenes are still visible.
 *
 * Without this the hero arc is still on screen at progress 0 while section 05 is
 * being measured, and its draw calls land in the product's budget.
 */
const CHANNEL_ORDER = [
  'hero',
  'about',
  'problem',
  'activation',
  'series',
  'product',
  'coverage',
  'applications',
]

export async function driveTo(
  page: Page,
  mode: string,
  channel: string,
  progress: number,
  active: string | null = null,
): Promise<void> {
  await page.evaluate(
    ({ mode, channel, progress, active, order }) => {
      const scene = window.__scene!
      scene.store.getState().setFrameloop('always')
      scene.store.getState().setMode(mode, active)

      // Put every other channel where real scrolling would have left it.
      const target = order.indexOf(channel)
      order.forEach((name, i) => {
        if (i < target) scene.scroll[name] = 1
        else if (i > target) scene.scroll[name] = 0
      })
      scene.scroll[channel] = progress
    },
    { mode, channel, progress, active, order: CHANNEL_ORDER },
  )
}

/**
 * Drives to a section and waits until the renderer numbers STOP CHANGING.
 *
 * First-non-zero is not enough. Models resolve through Suspense at different
 * times, damped camera moves are still travelling, and section visibility ramps
 * with progress, so the first frame that draws anything is usually drawing only
 * whatever loaded first. That is how a measurement of the exploded product comes
 * back as the cabinet: 4 calls, 2340 triangles, repeatably, and wrong.
 *
 * Three consecutive agreeing samples, then report.
 */
export async function driveAndSettle(
  page: Page,
  mode: string,
  channel: string,
  progress: number,
  active: string | null = null,
): Promise<PerfSample> {
  await driveTo(page, mode, channel, progress, active)

  // 1. Wait for the section's assets to resolve. Until something draws, every
  //    number is a number about an empty scene.
  //
  //    The page renders itself: the launch flags keep requestAnimationFrame alive
  //    in headless, so frameloop 'always' runs at full rate and DevStats samples
  //    from inside it. Stepping frames by hand with advance() also works but costs
  //    a full render plus the post stack per call, which made this take minutes.
  const loadDeadline = Date.now() + 45_000
  let perf = await readPerf(page)
  while (perf.calls === 0 && Date.now() < loadDeadline) {
    await page.waitForTimeout(500)
    perf = await readPerf(page)
  }

  // 2. Sample for a while and keep the WORST reading.
  //
  //    Not "wait until samples agree": the counts genuinely wobble by a frame or
  //    two as damped values settle, so that loop never converges. A budget is a
  //    ceiling, so the honest measurement is the maximum observed rather than a
  //    lucky quiet frame.
  const worst = { ...perf }
  for (let i = 0; i < 8; i++) {
    await page.waitForTimeout(300)
    const sample = await readPerf(page)
    if (sample.calls > worst.calls) Object.assign(worst, sample)
  }
  return worst
}

export interface PerfSample {
  fps: number
  calls: number
  triangles: number
  programs: number
  geometries: number
  textures: number
}

/**
 * Reads the perf snapshot DevStats writes from INSIDE useFrame.
 *
 * Deliberately not `renderer.info.render.calls`: that auto-resets each frame, so
 * reading it from here reports near-zero. This project has already been bitten by
 * exactly that — 3 calls / 6 triangles reported against a true 28 / 21,136.
 */
export async function readPerf(page: Page): Promise<PerfSample> {
  return page.evaluate(() => ({ ...window.__three!.perf }))
}

export interface ScrubDrift {
  material: string
  uniform: string
  progress: number
  forward: number
  backward: number
  delta: number
}

export interface ScrubResult {
  channel: string
  samples: number
  uniformsPerSample: number
  drift: ScrubDrift[]
  ok: boolean
}

/** Runs the uniform-snapshot path-independence audit for one channel. */
export async function auditScrub(
  page: Page,
  channel: string,
  mode: string,
  active: string | null = null,
  samples = 11,
): Promise<ScrubResult> {
  return page.evaluate(
    ({ channel, mode, active, samples }) => {
      window.__scene!.store.getState().setFrameloop('always')
      window.__scene!.store.getState().setMode(mode, active)
      return window.__three!.auditScrub(channel, samples)
    },
    { channel, mode, active, samples },
  )
}

/** Pads a label so the reported tables line up in the terminal. */
export function pad(value: string | number, width: number): string {
  return String(value).padStart(width)
}
