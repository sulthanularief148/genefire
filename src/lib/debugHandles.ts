/**
 * Whether the scene exposes its inspection handles on `window`.
 *
 * On in development, and in a build made with NEXT_PUBLIC_VERIFY=1.
 *
 * The second case exists because the acceptance harness has to run against a
 * PRODUCTION build. `next dev` runs React StrictMode, which double-mounts effects
 * and can double-register ScrollTriggers — a suite run against dev would be
 * measuring an artefact of the dev server rather than the site. So the handles
 * need a way to exist under production semantics, behind a flag that an ordinary
 * `npm run build` never sets.
 */
export const DEBUG_HANDLES =
  process.env.NODE_ENV !== 'production' || process.env.NEXT_PUBLIC_VERIFY === '1'
