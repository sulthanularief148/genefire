'use client'

import { useEffect } from 'react'

/**
 * Lands the reader on the section named in the URL hash.
 *
 * NOT a native hash jump. With sixteen pin spacers on the page a section's DOM
 * offset is nowhere near its visual scroll position — `#contact` resolves to an
 * element sitting pinned inside a spacer thousands of pixels tall, so the browser
 * puts you in the middle of some earlier section's pin. The section's real
 * arrival point is its ScrollTrigger's `start`.
 *
 * Waits for that trigger to exist first: triggers are created after the scroll
 * engine chunk resolves and every PinnedSection effect has run, and scrolling
 * before then targets a page whose spacers have not been inserted yet — a
 * different wrong answer. Gives up quietly after a few seconds.
 *
 * Under reduced motion there are no triggers at all, and scrollToSection falls
 * back to the element's own offset, which is correct there because there are no
 * spacers either.
 */
export function RestoreSection() {
  useEffect(() => {
    const target = window.location.hash.slice(1)
    if (!target || !document.getElementById(target)) return

    let cancelled = false
    const deadline = Date.now() + 6000

    import('@/lib/smoothScroll').then(({ scrollToSection, ScrollTrigger }) => {
      const attempt = () => {
        if (cancelled) return

        const ready = ScrollTrigger.getAll().some((t) => (t.trigger as HTMLElement)?.id === target)
        // An unpinned section has no trigger and can be scrolled to immediately.
        const unpinned = !document.getElementById(target)?.closest('.pin-spacer')

        if (ready || unpinned) {
          scrollToSection(target)
          return
        }
        if (Date.now() > deadline) return
        requestAnimationFrame(attempt)
      }

      requestAnimationFrame(attempt)
    })

    return () => {
      cancelled = true
    }
  }, [])

  return null
}
