import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

/**
 * Lenis + ScrollTrigger, wired once.
 *
 * Lenis replaces native scroll with an interpolated value, so ScrollTrigger has to
 * be told about it or every trigger fires at the wrong pixel. Three lines do the
 * entire integration:
 *
 *   1. Lenis pushes its interpolated position into ScrollTrigger.update
 *   2. GSAP's ticker drives Lenis's rAF — one clock, not two. Two loops drift and
 *      produce micro-jitter.
 *   3. lagSmoothing(0) — GSAP's default skips ahead after a stall, which teleports
 *      a scrubbed camera.
 *
 * No scrollerProxy: that is only needed when Lenis wraps a custom element, and
 * here it wraps the window.
 */
export interface SmoothScroll {
  lenis: Lenis
  destroy: () => void
}

/**
 * Module-level handle. React 19 StrictMode mounts effects twice in dev, and a
 * route change remounts the provider — either way a previous instance must be
 * fully torn down before a new one is created, or two Lenis instances fight over
 * the same scroll position.
 */
let current: SmoothScroll | null = null

export function initSmoothScroll(): SmoothScroll {
  // Idempotent by construction: adopt-and-destroy before creating.
  //
  // This tears down LENIS ONLY. It must not touch ScrollTriggers: effects run
  // child-first, so every PinnedSection has already registered its trigger by the
  // time this provider effect runs, and killing them all here silently unpinned
  // the entire page. Triggers are owned by the sections that create them.
  destroySmoothScroll()

  const lenis = new Lenis({
    duration: 1.1,
    easing: (t: number) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    // Native inertia on touch. syncTouch feels laggy on iOS.
    syncTouch: false,
  })

  const onScroll = () => ScrollTrigger.update()
  const tick = (time: number) => lenis.raf(time * 1000)

  lenis.on('scroll', onScroll)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  // Mobile browsers fire resize when the URL bar hides, which otherwise re-pins
  // every section mid-scroll.
  ScrollTrigger.config({ ignoreMobileResize: true })

  // Triggers created before Lenis existed measured against native scroll.
  // Re-measure now that the interpolated scroller is driving.
  ScrollTrigger.refresh()

  const destroy = () => {
    lenis.off('scroll', onScroll)
    gsap.ticker.remove(tick)
    gsap.ticker.lagSmoothing(500, 33)
    lenis.destroy()
    current = null
  }

  current = { lenis, destroy }
  return current
}

/**
 * Scroll to a section by DOM id, landing where it VISUALLY starts.
 *
 * Not `element.offsetTop`, and not a native hash jump. With sixteen pin spacers
 * on the page a section's DOM offset is nowhere near its visual scroll position —
 * the spacer is thousands of pixels tall and the section sits pinned inside it,
 * so a hash jump lands the reader in the middle of a previous section's pin.
 *
 * A pinned section's true arrival point is its ScrollTrigger's `start`. Unpinned
 * sections have no trigger, and for those the element's own offset is correct.
 */
export function scrollToSection(id: string): boolean {
  const trigger = ScrollTrigger.getAll().find((t) => (t.trigger as HTMLElement)?.id === id)
  if (trigger) {
    // ONE PIXEL IN, not on the start. At exactly `start` the trigger's progress is
    // 0 and it is not active, so onToggle never fires and the canvas stays on the
    // previous section: a jump to #series landed with the store still in 'hero',
    // the copy at no beat at all, and the hero's turntable in frame.
    scrollToPosition(trigger.start + 1)
    return true
  }

  const el = document.getElementById(id)
  if (!el) return false
  scrollToPosition(el.getBoundingClientRect().top + window.scrollY)
  return true
}

/**
 * Jump to an absolute scroll position, through Lenis.
 *
 * window.scrollTo bypasses it: Lenis keeps its own interpolated position, so the
 * page moves but the value ScrollTrigger reads does not, and no trigger updates.
 */
export function scrollToPosition(y: number) {
  if (current) current.lenis.scrollTo(y, { immediate: true })
  else window.scrollTo(0, y)
}

/**
 * Tears down Lenis and gives back native scroll. Safe to call when nothing is
 * running.
 *
 * Deliberately does NOT kill ScrollTriggers — each PinnedSection kills its own on
 * unmount, and this runs while those sections are still mounted.
 */
export function destroySmoothScroll() {
  current?.destroy()
  current = null
}

/**
 * Reduced motion: give back native scroll, kill the whole choreography, and clear
 * every property GSAP set so nothing is left mid-animation and invisible.
 *
 * This is the one place that kills triggers wholesale, because here the intent is
 * exactly that — no pins, no scrubs, content in normal flow. PinnedSections also
 * bail out on `reduced`, so nothing re-creates them.
 */
export function disableChoreography() {
  ScrollTrigger.getAll().forEach((t) => t.kill())
  destroySmoothScroll()
  gsap.set('[data-anim]', { clearProps: 'all', opacity: 1, y: 0, x: 0 })
}

/**
 * Recompute every trigger's start/end. Required after fonts swap and after any
 * image without fixed dimensions settles, or `end: '+=200%'` is measured against
 * the wrong page height.
 */
export function refreshScrollTriggers() {
  ScrollTrigger.refresh()
}

export { gsap, ScrollTrigger }
