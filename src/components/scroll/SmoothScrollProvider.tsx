'use client'

import { useEffect } from 'react'

import { DEBUG_HANDLES } from '@/lib/debugHandles'
import {
  detectCapabilities,
  detectTier,
  detectWebgl,
  scroll as scrollChannels,
  settleScroll,
  useScene,
} from '@/lib/useScene'

/**
 * Owns the lifetime of Lenis and of every ScrollTrigger on the page.
 *
 * GSAP and Lenis are imported inside the effect, not at module scope: a static
 * import puts ~50 KB of scroll engine into the initial script set, and nothing in
 * the first paint needs it. The page scrolls natively until this resolves.
 *
 * React 19 StrictMode inherits from the parent renderer, so in dev this effect
 * runs, tears down, and runs again. The teardown is therefore load-bearing rather
 * than hygiene: initSmoothScroll() destroys any previous instance before creating
 * one, and the cleanup removes the exact ticker callback it added.
 */
export function SmoothScrollProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    const { setReduced, setLowPower, setWebgl, setFrameloop, setTier } = useScene.getState()

    const { lowPower } = detectCapabilities()
    setLowPower(lowPower)
    setWebgl(detectWebgl())
    setTier(detectTier())

    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    let cancelled = false
    let teardown: (() => void) | null = null

    import('@/lib/smoothScroll').then((engine) => {
      if (cancelled) return

      /** Rebuild or tear down the choreography to match the current preference. */
      const apply = () => {
        const reduced = motionQuery.matches
        setReduced(reduced)

        if (reduced) {
          // Not an optimisation — an accessibility requirement. Native scroll
          // comes back, the timeline dies, and the scene shows its final framing
          // so the page stays fully readable and navigable.
          engine.disableChoreography()
          settleScroll(1)
          setFrameloop('demand')
          return
        }

        settleScroll(0)
        setFrameloop('always')
        engine.initSmoothScroll()

        // Fonts change line box heights, which changes every `end: '+=200%'`.
        document.fonts?.ready.then(engine.refreshScrollTriggers).catch(() => {})
      }

      // Stop rendering entirely when the tab is in the background.
      const onVisibility = () => {
        const { reduced } = useScene.getState()
        if (document.hidden) setFrameloop('never')
        else setFrameloop(reduced ? 'demand' : 'always')
      }

      apply()
      // Apply the current visibility too, not just changes to it — a page opened
      // in a background tab would otherwise render at full rate until the first
      // visibilitychange event.
      onVisibility()
      motionQuery.addEventListener('change', apply)
      document.addEventListener('visibilitychange', onVisibility)

      // Dev handle. Verifying a scroll-driven canvas from the outside is
      // otherwise guesswork — this is how trigger count, pin state and the
      // per-frame channels get inspected without a rebuild.
      if (DEBUG_HANDLES) {
        ;(window as unknown as { __scene?: unknown }).__scene = {
          store: useScene,
          scroll: scrollChannels,
          triggers: () => engine.ScrollTrigger.getAll().map((t) => ({
            id: (t.trigger as HTMLElement)?.id,
            start: Math.round(t.start),
            end: Math.round(t.end),
            pinned: Boolean(t.pin),
            progress: Number(t.progress.toFixed(3)),
          })),
          refresh: engine.refreshScrollTriggers,
          tier: () => useScene.getState().tier,
          // Programmatic scrolling has to go through Lenis: it owns the scroll
          // position, so window.scrollTo moves the page without moving the value
          // ScrollTrigger reads, and every trigger stays where it was.
          scrollTo: (y: number) => engine.scrollToPosition(y),
        }
      }

      // The tier is viewport-derived, so it has to follow a resize. Debounced:
      // a drag across a breakpoint would otherwise rebuild every pin per frame.
      let resizeTimer = 0
      const onResize = () => {
        window.clearTimeout(resizeTimer)
        resizeTimer = window.setTimeout(() => {
          const next = detectTier()
          if (next !== useScene.getState().tier) {
            setTier(next)
            engine.refreshScrollTriggers()
          }
        }, 200)
      }
      window.addEventListener('resize', onResize)

      teardown = () => {
        window.clearTimeout(resizeTimer)
        window.removeEventListener('resize', onResize)
        motionQuery.removeEventListener('change', apply)
        document.removeEventListener('visibilitychange', onVisibility)
        engine.destroySmoothScroll()
      }
    })

    return () => {
      cancelled = true
      teardown?.()
    }
  }, [])

  return <>{children}</>
}
