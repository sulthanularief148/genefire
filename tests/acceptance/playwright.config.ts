import { defineConfig, devices } from '@playwright/test'

import { REPO_ROOT } from './paths'

/**
 * Headless acceptance harness.
 *
 * Runs against a PRODUCTION build (see scripts/verify.mjs), never `next dev`.
 * Dev enables React StrictMode, which double-mounts effects and can
 * double-register ScrollTriggers — a suite run there would be measuring an
 * artefact of the dev server rather than the site.
 */
export default defineConfig({
  testDir: '.',
  fullyParallel: false,
  workers: 1,
  // The pin arithmetic is measured in pixels derived from viewport height, and a
  // failure here is a cascade across eleven sections. Retrying would hide flakes
  // that matter.
  retries: 0,
  reporter: [['list']],
  // Generous: the draw-call tests wait for models to resolve through Suspense
  // and then sample repeatedly for a worst case.
  timeout: 240_000,
  expect: { timeout: 20_000 },

  use: {
    baseURL: process.env.VERIFY_BASE_URL ?? 'http://localhost:3210',
    // Fixed. Every expected pixel figure in expected.ts is derived from 720px of
    // viewport height; a variable viewport makes the whole table meaningless.
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1280, height: 720 },
        deviceScaleFactor: 1,
        launchOptions: {
          args: [
            // The first three are the fix for the rAF suspension that made every
            // earlier framebuffer read return a stale frame. A headless page is
            // still a background page without them: no rAF, no useFrame, no
            // renderer.info, and every sample comes back identical.
            '--disable-background-timer-throttling',
            '--disable-renderer-backgrounding',
            '--disable-backgrounding-occluded-windows',
            // Keeps CSS pixels and device pixels 1:1 so measured heights are the
            // numbers the expectation table is written in.
            '--force-device-scale-factor=1',
          ],
        },
      },
    },
  ],

  webServer: {
    command: 'npx next start -p 3210',
    // Without this,  runs in tests/acceptance and reports 'Could not
    // find a production build in the .next directory' — it is looking in the
    // config's folder, not the project's.
    cwd: REPO_ROOT,
    url: 'http://localhost:3210/ar',
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: 'ignore',
    stderr: 'pipe',
  },
})
