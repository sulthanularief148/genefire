import type * as THREE from 'three'

import { scroll, type ScrollChannel } from './useScene'

/**
 * Path-independence audit for a scrubbed section.
 *
 * WHAT THIS REPLACED, AND WHY. The first attempt compared framebuffers: scrub to
 * progress P, read the pixels, do it again in reverse, diff the images. That was
 * the wrong instrument twice over.
 *
 * Mechanically it could not work. After a frame is presented the WebGL drawing
 * buffer is undefined unless preserveDrawingBuffer is on, so reading it from a
 * devtools eval or an async callback reads outside the frame and returns black —
 * the same class of mistake as reading renderer.info outside the render loop and
 * getting 3 draw calls. WebGL state is only valid inside the render call.
 *
 * And it tested the wrong property. The plume carries a uTime wander term, so two
 * visits to progress 0.45 ten seconds apart MUST produce different pixels — that
 * is the feature working. A framebuffer comparison that passes is one where time
 * has accidentally been frozen.
 *
 * What the design actually claims is PATH INDEPENDENCE: the uniform block at
 * progress P is the same whether you arrived going forward or backward. That is
 * what this measures — numerically, inside the render loop, with no framebuffer
 * involved and uTime excluded by name.
 */

/** Uniforms excluded because they are legitimately time-dependent. */
const TIME_UNIFORMS = new Set(['uTime'])

export interface ScrubDrift {
  material: string
  uniform: string
  progress: number
  forward: number
  backward: number
  delta: number
}

export interface ScrubAuditResult {
  channel: ScrollChannel
  samples: number
  uniformsPerSample: number
  drift: ScrubDrift[]
  ok: boolean
}

type Numeric = number | { toArray?: () => number[] }

/** Flattens a uniform value to numbers, or null if it is not numeric. */
function flatten(value: unknown): number[] | null {
  if (typeof value === 'number') return [value]
  const v = value as Numeric
  if (v && typeof v === 'object' && typeof v.toArray === 'function') {
    const arr = v.toArray()
    return arr.every((n) => typeof n === 'number' && Number.isFinite(n)) ? arr : null
  }
  return null
}

/** Every numeric uniform in the scene, keyed "<material>.<uniform>[i]". */
function snapshot(scene: THREE.Scene): Map<string, number> {
  const out = new Map<string, number>()
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
    for (const material of materials) {
      const shader = material as THREE.ShaderMaterial
      if (!shader?.uniforms) continue
      const name = shader.name || shader.uuid.slice(0, 8)
      for (const [uniform, holder] of Object.entries(shader.uniforms)) {
        if (TIME_UNIFORMS.has(uniform)) continue
        const values = flatten(holder?.value)
        if (!values) continue
        values.forEach((n, i) => out.set(`${name}.${uniform}[${i}]`, n))
      }
    }
  })
  return out
}

/**
 * Scrub `channel` forward then backward over the same sample points, comparing
 * every non-time uniform at each one.
 *
 * MUST be called from inside the render loop (a useFrame callback, or R3F's
 * `advance`), because it drives the scroll channel and then reads what the frame
 * produced. `step` is the function that renders one frame — pass R3F's advance.
 */
export function auditScrub(
  scene: THREE.Scene,
  channel: ScrollChannel,
  step: (progress: number) => void,
  samples = 11,
  tolerance = 1e-6,
): ScrubAuditResult {
  const points = Array.from({ length: samples }, (_, i) => i / (samples - 1))
  const restore = scroll[channel]

  const forward = new Map<number, Map<string, number>>()
  for (const p of points) {
    scroll[channel] = p
    step(p)
    forward.set(p, snapshot(scene))
  }

  const drift: ScrubDrift[] = []
  let uniformsPerSample = 0

  for (const p of [...points].reverse()) {
    scroll[channel] = p
    step(p)
    const back = snapshot(scene)
    const fwd = forward.get(p)!
    uniformsPerSample = Math.max(uniformsPerSample, back.size)

    for (const [key, value] of back) {
      const before = fwd.get(key)
      if (before === undefined) continue
      const delta = Math.abs(before - value)
      if (delta > tolerance) {
        const [material, uniform] = key.split('.')
        drift.push({ material, uniform, progress: p, forward: before, backward: value, delta })
      }
    }
  }

  scroll[channel] = restore

  return {
    channel,
    samples,
    uniformsPerSample,
    drift,
    ok: drift.length === 0,
  }
}
