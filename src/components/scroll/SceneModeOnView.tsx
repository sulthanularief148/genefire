'use client'

import { useEffect, useRef } from 'react'

import { useScene, type SceneMode } from '@/lib/useScene'

/**
 * Tells the canvas which scene an UNPINNED section wants, when it comes into view.
 *
 * Pinned sections do this through their ScrollTrigger. The quiet sections have no
 * trigger, so whatever scene came before them stayed on screen behind them — the
 * applications drum behind the comparison table, and the About globe behind the
 * contact form's fields. The site structure spec asks for the opposite: flat DOM,
 * "let the eye rest", and a canvas that fades to a still before the form.
 *
 * Renders an empty, hidden span and observes its parent section, so it drops into
 * a server component without making the section itself a client component.
 */
export function SceneModeOnView({ mode }: { mode: SceneMode }) {
  const probe = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    const section = probe.current?.parentElement
    if (!section || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) useScene.getState().setMode(mode)
      },
      // The middle band of the viewport, as the progress rail uses: the section
      // that owns the middle of the screen owns the canvas.
      { rootMargin: '-40% 0px -40% 0px' },
    )
    observer.observe(section)
    return () => observer.disconnect()
  }, [mode])

  return <span ref={probe} hidden />
}
