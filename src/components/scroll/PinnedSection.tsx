'use client'

import { useEffect, useRef } from 'react'

import { beatIndex } from '@/lib/anim'
import { isPinnedAtTier, pinScaleForTier } from '@/lib/tier'
import {
  requestRender,
  scroll,
  useScene,
  type SceneMode,
  type ScrollChannel,
} from '@/lib/useScene'

interface PinnedSectionProps {
  id: string
  /** Scroll distance the section stays pinned for, e.g. '200%' = 200vh. */
  length: string
  /** Which per-frame channel this section writes. */
  channel: ScrollChannel
  /** What the canvas should be showing while this section holds the viewport. */
  mode: SceneMode
  /** Product id to feature while pinned, if any. */
  active?: string | null
  /**
   * Ascending progress thresholds. The section carries `data-beat="<index>"`,
   * so copy can be revealed from CSS at an exact beat without a React render per
   * frame. Reversible by construction: the attribute is a pure function of
   * progress, so scrubbing backwards walks the same beats in reverse.
   */
  beats?: readonly number[]
  className?: string
  children: React.ReactNode
}

/**
 * One pinned section = one ScrollTrigger.
 *
 * Sections write their progress to the mutable `scroll` object and ask the canvas
 * for a frame; they never setState per frame. The only React state written here is
 * `mode`/`active`, which change at section boundaries, not per tick.
 *
 * GSAP is imported inside the effect so the scroll engine stays out of the initial
 * script set. Before it resolves the section is ordinary flow content, which is
 * also exactly what it must be under reduced motion — no pin, no trigger, no
 * timeline, and the scene at its final framing. Fully readable, fully navigable.
 */
export function PinnedSection({
  id,
  length,
  channel,
  mode,
  active = null,
  beats,
  className,
  children,
}: PinnedSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const reduced = useScene((s) => s.reduced)
  const tier = useScene((s) => s.tier)

  /**
   * Whether this section pins at the current viewport tier.
   *
   * Below 768 only the sections that need scroll to say anything keep their pins
   * (COMPACT_PINS in lib/tier.ts). Everything else becomes ordinary flow content with a
   * reveal, because forty screens of pinned scroll on a phone loses the reader
   * long before the contact form.
   */
  const pins = isPinnedAtTier(id, tier)

  /**
   * Reduced motion shows the finished state of every section immediately.
   *
   * This has to be written imperatively rather than through the JSX prop: the
   * scrub also writes `data-beat` imperatively, so by the time the preference
   * flips React's idea of the attribute no longer matches the DOM and it will not
   * "change" a value it believes is already correct. The last beat left by a
   * partial scrub would stay, and the copy that only appears at the final beat
   * would sit at 0.12 opacity — invisible, in the one mode where it must be
   * readable.
   */
  useEffect(() => {
    const el = ref.current
    if (!el || !beats) return
    if (reduced || !pins) el.dataset.beat = String(beats.length)
  }, [reduced, pins, beats])

  /**
   * Under reduced motion there are no ScrollTriggers, so nothing would ever call
   * setMode and the canvas would sit on section 01 for the whole page.
   *
   * Scene visibility is owned by the active section, so under reduced motion
   * there still has to BE an active section — an IntersectionObserver supplies
   * it. Cheap, and it fires on entry rather than per frame.
   */
  useEffect(() => {
    // Also needed when the section does not pin at this tier: without a trigger
    // nothing would ever tell the canvas which section is on screen.
    if (!reduced && pins) return
    const el = ref.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) useScene.getState().setMode(mode, active)
      },
      { threshold: 0.5 },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [reduced, pins, mode, active])

  useEffect(() => {
    if (reduced || !pins) return
    const el = ref.current
    if (!el) return

    let cancelled = false
    let teardown: (() => void) | null = null

    import('@/lib/smoothScroll').then(({ gsap, ScrollTrigger }) => {
      if (cancelled) return

      const { setMode, setProgress } = useScene.getState()

      /**
       * Publish this pin's progress to its channel.
       *
       * Split out of onUpdate so that onToggle can call it too. That is not a
       * tidy-up: it is the fix for a stale channel.
       *
       * The guard below drops writes from a pin that is not the active one. On a
       * jump — a nav click, a restored #hash, the screenshot harness — the scroll
       * lands inside a pin in a single motion, and that pin only becomes ACTIVE on
       * the tick where the scroll enters its range. Every onUpdate before that
       * tick is correctly dropped, activation then happens, and if the scroll has
       * come to rest no further onUpdate ever fires. The channel keeps whatever it
       * held before, forever.
       *
       * The visible result was section 05 rendering its product at scroll.product
       * = 0 — pushed 0.6 m back and 0.12 m down on its arrival curve — while the
       * trigger reported progress 0.4 and the camera was correctly framed for a
       * product that was no longer where the camera expected it. Calling this on
       * activation closes the gap.
       */
      const publish = (self: { progress: number; scroll: () => number }) => {
        scroll[channel] = self.progress
        scroll.page = self.scroll() / (ScrollTrigger.maxScroll(window) || 1)

        // SECTION PARALLAX. One custom property per frame; the CSS decides what
        // moves and by how much, so the differential is authored in one place
        // next to the type rather than in a scroll handler.
        //
        // Deliberately a property write and not a style write: setting
        // `transform` here would put the layout decision in the scroll handler and
        // give every section the same rate, which is the opposite of parallax.
        el.style.setProperty('--section-progress', self.progress.toFixed(4))

        if (beats) {
          // A dataset write, not a render. Only touched when the beat changes.
          const beat = String(beatIndex(self.progress, beats))
          if (el.dataset.beat !== beat) el.dataset.beat = beat
        }

        requestRender()
      }

      const trigger = ScrollTrigger.create({
        trigger: el,
        start: 'top top',
        // Mid tier cuts the pinned distance by ~30%: the same choreography, less
        // scrolling, on a screen where the reader has less patience for it.
        end: `+=${Number.parseFloat(length) * pinScaleForTier(tier)}%`,
        pin: true,
        pinSpacing: true,
        // A beat of catch-up. For a heavy steel canister scrub:1 reads as mass;
        // scrub:true reads as a slider.
        scrub: 1,
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          // Eleven product pins share one `product` channel, and with scrub:1 a
          // departing pin keeps animating for a beat after the next one takes
          // over. Without this guard the outgoing pin writes ITS progress while
          // the incoming product is on screen, so the new product renders at the
          // old one's beat — mid-explode, or already receding.
          //
          // Sections with no product (`active: null`) are the only writer on
          // their own channel, so they are never gated.
          if (active !== null && useScene.getState().active !== active) return

          publish(self)
        },
        onToggle: (self) => {
          // Section boundaries only — React state, not a per-frame value.
          if (!self.isActive) return
          setMode(mode, active)
          // This pin owns the channel from now on. Publish immediately rather
          // than waiting for an onUpdate that may never come — see publish().
          publish(self)
        },
        // Coarse progress for anything that reads the store rather than useFrame.
        onScrubComplete: (self) => setProgress(self.progress),
      })

      // will-change costs GPU memory per layer, so it goes on while the section is
      // pinned and comes off the moment it is not.
      const pinned = trigger.pin as HTMLElement | undefined
      if (pinned) pinned.style.willChange = 'transform'

      teardown = () => {
        if (pinned) pinned.style.willChange = ''
        trigger.kill()
        gsap.set(el, { clearProps: 'all' })
      }
    })

    return () => {
      cancelled = true
      teardown?.()
    }
  }, [reduced, pins, tier, id, length, channel, mode, active, beats])

  return (
    <section
      id={id}
      ref={ref}
      className={className}
      data-section={mode}
    >
      {children}
    </section>
  )
}
