'use client'

import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'

import { isDev, perf } from '@/lib/perfSnapshot'
import { auditScrub } from '@/lib/scrubAudit'
import type { ScrollChannel } from '@/lib/useScene'

/**
 * Dev-only performance sampler. Lives INSIDE the Canvas.
 *
 * r3f-perf is not usable here: its latest release (7.2.3) depends on
 * @react-three/drei ^9, which is the React 18 line, so it cannot resolve against
 * R3F v9 / React 19 and there is no v9-compatible release. This reads the same
 * numbers straight off renderer.info, which is where r3f-perf gets them.
 *
 * The acceptance targets it exists to check: draw calls < 60, 60 fps on desktop,
 * and a program count that stops climbing (a climbing one means shaders are still
 * compiling mid-scroll).
 *
 * Allocates nothing per frame — it writes into the shared `perf` object.
 */
export function DevStats() {
  const gl = useThree((s) => s.gl)
  const scene = useThree((s) => s.scene)
  const camera = useThree((s) => s.camera)
  const advance = useThree((s) => s.advance)
  const frames = useRef(0)
  const since = useRef(0)

  /**
   * Dev handle for inspecting the scene from outside the app.
   *
   * `advance` is the important one. A browser suspends requestAnimationFrame in a
   * background tab, so an automated check that sets a scroll value and then reads
   * the framebuffer is reading a STALE frame — every sample comes back identical
   * and the section looks frozen when it is fine. advance(t) renders one frame on
   * demand, which makes "scrub to progress p and measure what is on screen" an
   * actual measurement rather than a guess.
   */
  useEffect(() => {
    if (!isDev) return
    Object.assign(window as unknown as Record<string, unknown>, {
      __three: {
        gl,
        scene,
        camera,
        perf,
        advance,
        /**
         * Path-independence audit. Scrubs a channel forward then backward and
         * diffs every non-time uniform — see lib/scrubAudit.ts for why this
         * replaced the framebuffer comparison.
         *
         * `advance` is what makes it valid: it renders a real frame per sample,
         * so the uniforms being read are the ones a frame actually used.
         */
        auditScrub: (channel: ScrollChannel = 'activation', samples = 11) => {
          let clock = 0
          return auditScrub(
            scene,
            channel,
            () => {
              // A few frames per sample so damped values settle before reading.
              for (let i = 0; i < 12; i++) {
                clock += 1 / 60
                advance(clock * 1000)
              }
            },
            samples,
          )
        },
      },
    })
  }, [gl, scene, camera, advance])

  useFrame((state) => {
    if (!isDev) return

    frames.current++
    const t = state.clock.elapsedTime
    if (since.current === 0) since.current = t

    const elapsed = t - since.current
    if (elapsed < 0.5) return

    perf.fps = Math.round(frames.current / elapsed)
    perf.calls = gl.info.render.calls
    perf.triangles = gl.info.render.triangles
    perf.programs = gl.info.programs?.length ?? 0
    perf.geometries = gl.info.memory.geometries
    perf.textures = gl.info.memory.textures

    frames.current = 0
    since.current = t
  })

  return null
}
