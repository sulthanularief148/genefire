'use client'

import { useRef } from 'react'
import { useTranslations } from 'next-intl'

import { GRAB_GAIN, grab, type GrabTarget } from '@/lib/grab'
import { requestRender } from '@/lib/useScene'

/**
 * A transparent area laid over a 3D subject that lets the reader take hold of it
 * and turn it — see lib/grab.ts for why this lives in the DOM.
 *
 * HORIZONTAL DRAGS ONLY. `touch-action: pan-y` hands vertical movement straight
 * back to the browser, so on a phone a swipe up still scrolls the page and only a
 * sideways drag turns the object. On a mouse the cursor says what it does: grab,
 * then grabbing.
 *
 * Decorative and aria-hidden: turning a product round adds nothing a keyboard or a
 * screen reader needs, and every fact the subject illustrates is DOM text already.
 *
 * The hint ("Drag to rotate") shows until the first drag and then goes for good —
 * a data attribute on the element, not React state, so a drag never re-renders.
 */
export function GrabZone({ target, className = '' }: { target: GrabTarget; className?: string }) {
  const t = useTranslations('ui')
  const zone = useRef<HTMLDivElement>(null)
  const last = useRef({ x: 0, t: 0 })

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const g = grab[target]
    g.held = true
    g.velocity = 0
    last.current = { x: event.clientX, t: performance.now() }
    zone.current?.setAttribute('data-held', '')
    zone.current?.setAttribute('data-used', '')
  }

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = grab[target]
    if (!g.held) return
    const now = performance.now()
    const dx = event.clientX - last.current.x
    const dt = Math.max(1, now - last.current.t) / 1000
    g.yaw += dx * GRAB_GAIN
    // Smoothed, so the fling on release is the drag's speed, not its last event.
    g.velocity = g.velocity * 0.6 + ((dx * GRAB_GAIN) / dt) * 0.4
    last.current = { x: event.clientX, t: now }
    requestRender()
  }

  const release = (event: React.PointerEvent<HTMLDivElement>) => {
    const g = grab[target]
    if (!g.held) return
    g.held = false
    // A drag that stopped before letting go should not fling.
    if (performance.now() - last.current.t > 90) g.velocity = 0
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    zone.current?.removeAttribute('data-held')
    requestRender()
  }

  return (
    <div
      ref={zone}
      aria-hidden="true"
      className={`grab-zone ${className}`}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
    >
      {/* Stacked layouts: at the TOP of the zone. At the bottom it sat on the row
          of figures the hero lays along the foot of a phone screen. */}
      <span className="grab-hint bottom-auto top-[2%] split:bottom-[6%] split:top-auto">
        <span className="grab-hint-icon" />
        {t('drag')}
      </span>
    </div>
  )
}
