'use client'

import { forwardRef, useMemo } from 'react'
import { Effect } from 'postprocessing'
import { Uniform } from 'three'

/**
 * Screen-space heat refraction.
 *
 * Implemented as a postprocessing `Effect` with a `mainUv` function, which is the
 * whole point: the library offsets the UV before it samples the input buffer, so
 * this is real refraction of the composited scene with no second render target
 * and no manual double render.
 *
 * ORDER IN THE CHAIN MATTERS. This must run BEFORE Bloom. Refraction distorts the
 * scene, then bloom blooms the distorted result. The other way round blooms a
 * clean frame and then smears the glow, which reads as a smudged lens rather than
 * as heat coming off something.
 *
 * The noise is an inline GLSL value-noise function. There is no texture file in
 * /public and none is to be added — see the constraints section of
 * .claude/skills/shaders-postfx/SKILL.md.
 */

const fragment = /* glsl */ `
  uniform float uTime;
  uniform float uStrength;

  // Value noise. Cheap, and at these amplitudes indistinguishable from simplex.
  float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(
      mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
      mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
      u.y
    );
  }

  void mainUv(inout vec2 uv) {
    // Two layers scrolling at different rates and directions, so the shimmer
    // never reads as one sliding texture.
    float n1 = noise(uv * 3.0 + vec2(0.0, uTime * 0.14));
    float n2 = noise(uv * 6.4 - vec2(uTime * 0.09, 0.0));

    // The falloff is what sells it. Real shimmer is strongest at the source and
    // dies out above; a uniform full-screen wobble reads as a broken monitor.
    vec2 offset = (vec2(n1, n2) - 0.5) * uStrength * smoothstep(1.0, 0.25, uv.y);

    uv += offset;
  }
`

export class HeatHazeEffect extends Effect {
  constructor({ strength = 0 }: { strength?: number } = {}) {
    super('HeatHazeEffect', fragment, {
      uniforms: new Map<string, Uniform>([
        ['uTime', new Uniform(0)],
        ['uStrength', new Uniform(strength)],
      ]),
    })
  }

  get strength(): number {
    return this.uniforms.get('uStrength')!.value as number
  }

  set strength(value: number) {
    this.uniforms.get('uStrength')!.value = value
  }

  set time(value: number) {
    this.uniforms.get('uTime')!.value = value
  }
}

/**
 * R3F wrapper. The parent drives `strength` and `time` per frame through the ref
 * rather than through props, so nothing re-renders while the haze animates.
 */
export const HeatHaze = forwardRef<HeatHazeEffect>(function HeatHaze(_props, ref) {
  const effect = useMemo(() => new HeatHazeEffect(), [])
  return <primitive ref={ref} object={effect} dispose={null} />
})
