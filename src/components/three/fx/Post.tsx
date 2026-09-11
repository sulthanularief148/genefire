'use client'

import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  Bloom,
  ChromaticAberration,
  EffectComposer,
  Noise,
  Vignette,
} from '@react-three/postprocessing'
import type { BloomEffect } from 'postprocessing'

import { lerp, remap, smoothstep, spike } from '@/lib/anim'
import { scroll, useScene } from '@/lib/useScene'
import { HeatHaze, type HeatHazeEffect } from './HeatHaze'

/**
 * The post-processing stack. This order, and nothing more.
 *
 *   HeatHaze → Bloom → ChromaticAberration → Noise → Vignette
 *
 * HeatHaze is first because refraction has to happen before the glow: bloom on a
 * distorted scene reads as heat, a distorted bloom reads as a dirty lens.
 *
 * No SSAO, no SSR, no depth of field, no god rays. Each costs 2–5 ms and on a
 * single well-lit product against a dark ground none of them changes anything a
 * viewer could name.
 *
 * Both driven uniforms are pure functions of scroll progress, so the whole stack
 * scrubs backwards identically.
 */

/** Baseline bloom, and the peak it spikes to at the discharge. */
const BLOOM_BASE = 0.42
const BLOOM_PEAK = 0.9

/** Heat haze at its worst, at the end of section 02. */
const HAZE_PEAK = 0.014

export function Post({ variant = 'full' }: { variant?: 'full' | 'reduced' }) {
  const bloom = useRef<BloomEffect>(null)
  const haze = useRef<HeatHazeEffect>(null)
  const reduced = useScene((s) => s.reduced)

  useFrame((state) => {
    const problem = reduced ? 1 : scroll.problem
    const activation = reduced ? 1 : scroll.activation

    if (haze.current) {
      // Ramps 0 → 0.014 across section 02, holds through the ignition beats, then
      // COLLAPSES to 0 as the aerosol floods. The haze dying while the volume
      // fills is the product argument, stated without a word of copy.
      const rising = smoothstep(0, 1, problem) * HAZE_PEAK
      const collapsing = 1 - smoothstep(0.38, 0.68, activation)
      haze.current.strength = reduced ? 0 : rising * collapsing
      haze.current.time = reduced ? 0 : state.clock.elapsedTime
    }

    if (bloom.current) {
      // Lifts as the thermal cord glows, spikes at the discharge, eases back.
      const cordGlow = remap(activation, 0.2, 0.35, 0, 0.18)
      const discharge = spike(activation, 0.45, 0.035) * (BLOOM_PEAK - BLOOM_BASE)
      const settle = 1 - smoothstep(0.8, 1, activation) * 0.35
      bloom.current.intensity = (BLOOM_BASE + cordGlow + discharge) * settle
    }
  })

  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <HeatHaze ref={haze} />
      <Bloom
        ref={bloom}
        intensity={BLOOM_BASE}
        luminanceThreshold={0.86}
        luminanceSmoothing={0.28}
        mipmapBlur
      />
      {/* Dropped at the mid tier: it is the cheapest thing to lose and the least
          missed on a smaller screen. */}
      {variant === 'full' && (
        <ChromaticAberration offset={[0.0004, 0.0006]} radialModulation modulationOffset={0.3} />
      )}
      {/* Nearly invisible, and doing real work: it breaks up gradient banding on
          the dark graphite ground, which is very visible on 8-bit displays. */}
      <Noise opacity={0.018} premultiply />
      <Vignette darkness={0.42} offset={0.32} />
    </EffectComposer>
  )
}

/** Exposed for the scene to fade the cabinet lighting in step with the haze. */
export function hazeAmount(problem: number, activation: number): number {
  return lerp(0, 1, smoothstep(0, 1, problem) * (1 - smoothstep(0.38, 0.68, activation)))
}
