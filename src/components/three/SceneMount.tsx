'use client'

import { useEffect, useState, type ComponentType } from 'react'

import { PerfHud } from './PerfHud'

type SceneRootProps = { sign: 1 | -1; fallbackSrc: string }

/**
 * Keeps three.js off the critical path.
 *
 * next/dynamic with ssr:false is NOT enough here — under Turbopack the chunk it
 * produces is still emitted as a <script async> in the initial HTML, which put
 * 232 KB of three.js in the first-viewport budget (measured, not assumed). An
 * import() called from inside an effect is fetched only when that effect runs,
 * which is after first paint.
 *
 * The hero headline is the LCP element and it is plain DOM text, so nothing the
 * user reads waits on this. The canvas fades in behind copy that is already there.
 */
export function SceneMount({ sign, fallbackSrc }: SceneRootProps) {
  const [SceneRoot, setSceneRoot] = useState<ComponentType<SceneRootProps> | null>(null)

  useEffect(() => {
    let cancelled = false

    const load = () => {
      import('./SceneRoot').then((m) => {
        if (!cancelled) setSceneRoot(() => m.SceneRoot)
      })
    }

    // Yield to first paint before pulling three.js over the wire.
    const idle = window.requestIdleCallback?.(load, { timeout: 1200 })
    if (idle === undefined) {
      const timer = window.setTimeout(load, 200)
      return () => {
        cancelled = true
        window.clearTimeout(timer)
      }
    }

    return () => {
      cancelled = true
      window.cancelIdleCallback?.(idle)
    }
  }, [])

  return (
    <>
      {SceneRoot ? <SceneRoot sign={sign} fallbackSrc={fallbackSrc} /> : null}
      <PerfHud />
    </>
  )
}
