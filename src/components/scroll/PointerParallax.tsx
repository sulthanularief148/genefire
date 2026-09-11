'use client'

import { useEffect } from 'react'

import { pointer, useScene } from '@/lib/useScene'

/**
 * Pointer parallax, on both sides of the page.
 *
 * THE CANVAS: publishes the pointer position for the camera to lean on. Written to
 * a mutable module object, never to React state — this fires on every mouse move,
 * and a setState there would re-render the whole tree at pointer rate.
 *
 * THE DOM: copy marked `data-depth="N"` drifts up to N pixels AGAINST the pointer,
 * eased. The camera leans with the pointer, which slides the scene the other way
 * on screen; type that sits in front of the scene has to slide further still, or
 * the two planes read as one flat picture. That difference is the whole effect.
 *
 * Written as `--px` / `--py` on each marked element, read by the CSS `translate`
 * property — which composes with `transform` rather than replacing it, so the beat
 * reveals and the scroll parallax on the same elements keep working. The properties
 * are registered as non-inheriting in globals.css, so a marked element's children
 * do not drift twice. Only the handful of marked elements is touched, and the loop
 * stops the moment everything has settled.
 *
 * OFF on touch and under reduced motion. `(pointer: fine)` is the test that
 * matters — not screen width, since a small laptop has a mouse and a large tablet
 * does not. A touch device reports the last tap as a hover position, so everything
 * would jump to wherever the reader last pressed and stay there.
 */

/** Easing per frame toward the pointer. Low: the drift should trail, not track. */
const FOLLOW = 0.075

export function PointerParallax() {
  const reduced = useScene((s) => s.reduced)

  useEffect(() => {
    if (reduced) {
      pointer.active = false
      pointer.x = 0
      pointer.y = 0
      return
    }

    const fine = window.matchMedia('(pointer: fine)')
    if (!fine.matches) {
      pointer.active = false
      return
    }

    pointer.active = true

    let targetX = 0
    let targetY = 0
    let x = 0
    let y = 0
    let frame = 0
    let layers: Array<{ el: HTMLElement; depth: number }> = []

    const step = () => {
      x += (targetX - x) * FOLLOW
      y += (targetY - y) * FOLLOW
      const settled = Math.abs(targetX - x) < 0.001 && Math.abs(targetY - y) < 0.001
      if (settled) {
        x = targetX
        y = targetY
      }
      for (const { el, depth } of layers) {
        el.style.setProperty('--px', `${(-x * depth).toFixed(2)}px`)
        el.style.setProperty('--py', `${(-y * depth).toFixed(2)}px`)
      }
      frame = settled ? 0 : requestAnimationFrame(step)
    }

    const wake = () => {
      if (frame) return
      // Re-read the marked elements each time the loop starts rather than once:
      // it is a handful of nodes, and a locale switch replaces all of them.
      layers = Array.from(document.querySelectorAll<HTMLElement>('[data-depth]')).map((el) => ({
        el,
        depth: Number(el.dataset.depth) || 0,
      }))
      frame = requestAnimationFrame(step)
    }

    const onMove = (event: PointerEvent) => {
      pointer.x = (event.clientX / window.innerWidth) * 2 - 1
      pointer.y = (event.clientY / window.innerHeight) * 2 - 1
      targetX = pointer.x
      targetY = pointer.y
      wake()
    }

    // Returning to centre on leave, so the camera and the copy settle rather than
    // holding the attitude the pointer had when it crossed the edge of the window.
    const onLeave = () => {
      pointer.x = 0
      pointer.y = 0
      targetX = 0
      targetY = 0
      wake()
    }

    window.addEventListener('pointermove', onMove, { passive: true })
    document.addEventListener('pointerleave', onLeave)
    return () => {
      window.removeEventListener('pointermove', onMove)
      document.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
      for (const { el } of layers) {
        el.style.removeProperty('--px')
        el.style.removeProperty('--py')
      }
      pointer.active = false
      pointer.x = 0
      pointer.y = 0
    }
  }, [reduced])

  return null
}
