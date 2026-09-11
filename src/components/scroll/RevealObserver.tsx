'use client'

import { useEffect } from 'react'

/**
 * Lifts `[data-reveal]` elements into place the first time they scroll into view —
 * the unpinned sections' version of the pinned sections' beats.
 *
 * NOTHING IS HIDDEN UNTIL THIS RUNS. The hide rule is scoped to `.reveal-ready` on
 * <html>, which is only added here, after every element already on screen has been
 * marked as in. So server-rendered copy paints visible, a page with scripting off
 * reads normally, and nothing on screen at mount flashes out and back in.
 *
 * Once revealed, an element stays revealed: this is an entrance, not a scrub.
 * Under reduced motion it does nothing at all.
 */
export function RevealObserver() {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    if (typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          entry.target.setAttribute('data-in', '')
          observer.unobserve(entry.target)
        }
      },
      { rootMargin: '0px 0px -8% 0px' },
    )

    const pending = document.querySelectorAll('[data-reveal]:not([data-in])')
    for (const el of pending) {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight && r.bottom > 0) el.setAttribute('data-in', '')
      else observer.observe(el)
    }
    document.documentElement.classList.add('reveal-ready')

    return () => {
      observer.disconnect()
      document.documentElement.classList.remove('reveal-ready')
    }
  }, [])

  return null
}
