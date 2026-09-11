'use client'

import { useEffect, useState } from 'react'

import { isDev, perf, type PerfSnapshot } from '@/lib/perfSnapshot'

/**
 * DOM overlay for the numbers DevStats samples. Dev only, and deliberately
 * outside the canvas so it never joins the render budget it is measuring.
 *
 * It imports only the plain snapshot object — never @react-three/fiber — because
 * this component is mounted eagerly and its import graph is first-viewport JS.
 *
 * Toggle with the `p` key.
 */
export function PerfHud() {
  const [open, setOpen] = useState(false)
  const [snapshot, setSnapshot] = useState<PerfSnapshot>(perf)

  useEffect(() => {
    if (!isDev) return

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (e.key === 'p' || e.key === 'P') setOpen((v) => !v)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => {
    if (!isDev || !open) return
    const id = window.setInterval(() => setSnapshot({ ...perf }), 250)
    return () => window.clearInterval(id)
  }, [open])

  if (!isDev || !open) return null

  return (
    <div
      dir="ltr"
      className="fixed bottom-3 end-3 z-50 rounded-sm border border-graphite bg-ink/90 p-3 font-mono text-xs text-steel"
    >
      <Row label="fps" value={snapshot.fps} bad={snapshot.fps > 0 && snapshot.fps < 55} />
      <Row label="calls" value={snapshot.calls} bad={snapshot.calls > 60} />
      <Row label="tris" value={snapshot.triangles.toLocaleString('en')} />
      <Row label="programs" value={snapshot.programs} />
      <Row label="geometries" value={snapshot.geometries} />
      <Row label="textures" value={snapshot.textures} />
      <p className="mt-2 text-[10px] text-graphite">press p to hide</p>
    </div>
  )
}

function Row({ label, value, bad }: { label: string; value: string | number; bad?: boolean }) {
  return (
    <div className="flex justify-between gap-6">
      <span>{label}</span>
      <span className={bad ? 'text-fire' : 'text-paper'}>{value}</span>
    </div>
  )
}
