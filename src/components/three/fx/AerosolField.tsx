'use client'

import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

import { scroll, useScene } from '@/lib/useScene'

/**
 * The GPU particle field. One shader, two presets.
 *
 * Used twice: as the condensed-aerosol discharge in section 03, and as the embers
 * in section 02. Both instances share this exact shader source, so three.js hands
 * them the same compiled program — one compile, not two. Only uniform values
 * differ.
 *
 * EVERY POSITION IS A PURE FUNCTION OF uProgress. There is no integrated velocity,
 * no trail buffer and no physics step, because the section is scrubbed: drag it
 * backwards and each particle retraces its path exactly. The only time-dependent
 * term is the additive uTime wander, which perturbs a position progress already
 * decided and never feeds back into itself.
 *
 * The other thing this file gets right, and which is always the cause when it is
 * wrong: AdditiveBlending with depthWrite FALSE. Depth-write on additive
 * transparent particles produces black squares around every sprite.
 */

const VERTEX = /* glsl */ `
  uniform float uProgress;
  uniform float uTime;
  uniform float uEmitStart;
  uniform float uEmitEnd;
  uniform float uSpread;
  uniform float uRise;
  uniform float uWander;
  uniform float uSize;
  uniform float uStagger;
  uniform float uCyclic;   // 0 = single shot (discharge), 1 = looping (embers)
  uniform float uCycles;
  uniform float uFlatten;  // how much the emission sphere is squashed vertically

  attribute vec3 aSeed;
  attribute float aOffset;

  varying float vLife;

  void main() {
    // Emission window, remapped to 0..1. Nothing here reads a previous frame.
    float e = clamp((uProgress - uEmitStart) / max(uEmitEnd - uEmitStart, 1e-4), 0.0, 1.0);

    // Single shot: each particle starts at its own stagger offset and runs once.
    float span = max(1.0 - aOffset * uStagger, 1e-4);
    float shot = clamp((e - aOffset * uStagger) / span, 0.0, 1.0);

    // Looping: fract() of a progress-driven phase. Still a pure function of
    // progress — scrubbing back walks the same cycle in reverse.
    float loop = fract(aOffset + e * uCycles);

    float life = mix(shot, loop, uCyclic);
    vLife = life;

    // A jet leaves the nozzle along one axis. A flooding aerosol expands in every
    // direction at once, so the emission direction is a full sphere, squashed
    // vertically so the cloud spreads sideways BEFORE it rises.
    vec3 dir = normalize(aSeed * 2.0 - 1.0 + 1e-5);
    dir.y *= uFlatten;

    // Fast out of the generator, then settling — not a constant-velocity spray.
    float ease = 1.0 - pow(1.0 - life, 3.0);

    vec3 pos = position
      + dir * ease * uSpread * (0.55 + aSeed.z * 0.9)
      + vec3(0.0, ease * ease * uRise, 0.0)
      + uWander * life * vec3(
          sin(uTime * 0.53 + aSeed.x * 24.0),
          sin(uTime * 0.41 + aSeed.y * 19.0),
          cos(uTime * 0.47 + aSeed.z * 21.0)
        );

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);

    // step() rather than a branch: an unborn particle gets zero area instead of a
    // divergent code path.
    gl_PointSize = uSize * (0.35 + 1.45 * life) * step(1e-4, life) * (1.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`

const FRAGMENT = /* glsl */ `
  precision mediump float;

  uniform vec3 uColorHot;
  uniform vec3 uColorCool;
  uniform float uPeakAlpha;
  uniform float uClear;    // 1 = fully dissipated

  varying float vLife;

  void main() {
    vec2 uv = gl_PointCoord - 0.5;
    float d = length(uv);
    if (d > 0.5) discard;

    float soft = smoothstep(0.5, 0.0, d);

    // Born soft, gone soft. Without the tail fade the looping embers pop when
    // fract() wraps.
    float envelope = smoothstep(0.0, 0.14, vLife) * (1.0 - smoothstep(0.5, 1.0, vLife));

    float alpha = soft * envelope * uPeakAlpha * (1.0 - uClear);
    vec3 col = mix(uColorHot, uColorCool, vLife);

    gl_FragColor = vec4(col, alpha);
  }
`

export interface FieldUniforms {
  emitStart: number
  emitEnd: number
  spread: number
  rise: number
  wander: number
  size: number
  stagger: number
  cyclic: number
  cycles: number
  flatten: number
  colorHot: string
  colorCool: string
  peakAlpha: number
}

/**
 * The discharge. Wide radial spread, restrained buoyancy: it has to read as
 * FLOODING A VOLUME, not as spraying a jet at something. Condensed aerosol is not
 * a fire hose, and that distinction is the entire commercial argument for the
 * product — if it starts to look like a jet, widen `spread` and lower `rise`.
 */
export const AEROSOL_PRESET: FieldUniforms = {
  emitStart: 0.35,
  emitEnd: 0.62,
  spread: 1.95,
  rise: 0.32,
  wander: 0.085,
  size: 26,
  stagger: 0.55,
  cyclic: 0,
  cycles: 1,
  flatten: 0.62,
  colorHot: '#FFF4E6',
  colorCool: '#9FB2C6',
  // Additive sprites SUM. 12 000 of them overlapping in the plume core will run
  // past 1.0 and the 0.86 bloom threshold turns the whole discharge into a white
  // blob. Measured against the composited frame at progress 0.45, this is the
  // ceiling that keeps the core under the threshold while the plume still reads
  // as dense.
  peakAlpha: 0.14,
}

/**
 * Embers for section 02. Same program, warm ramp, tight spread, strong buoyancy,
 * and a looping life so they keep rising for the whole section.
 */
export const EMBER_PRESET: FieldUniforms = {
  emitStart: 0.0,
  emitEnd: 1.0,
  spread: 0.22,
  rise: 1.15,
  wander: 0.11,
  size: 11,
  stagger: 0.0,
  cyclic: 1,
  cycles: 2.2,
  flatten: 0.25,
  colorHot: '#FFB259',
  colorCool: '#4A1206',
  peakAlpha: 0.34,
}

interface AerosolFieldProps {
  count: number
  preset: FieldUniforms
  /** Which per-frame scroll channel drives uProgress. */
  channel: 'problem' | 'activation'
  /** Origin of the emission, in world units. */
  position?: [number, number, number]
  /** Extra dissipation on top of the preset, as a function of progress. */
  clear?: (progress: number) => number
}

export function AerosolField({
  count,
  preset,
  channel,
  position = [0, 0, 0],
  clear,
}: AerosolFieldProps) {
  const points = useRef<THREE.Points>(null)
  const material = useRef<THREE.ShaderMaterial>(null)
  const reduced = useScene((s) => s.reduced)

  const geometry = useMemo(() => {
    const positions = new Float32Array(count * 3)
    const seeds = new Float32Array(count * 3)
    const offsets = new Float32Array(count)

    // Deterministic: the same plume every reload, and identical between a forward
    // and a backward scrub.
    let seed = 0x6d2b79f5
    const rand = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0
      return seed / 0xffffffff
    }

    for (let i = 0; i < count; i++) {
      // Start clustered at the generator outlet, not on a sphere.
      const r = Math.cbrt(rand()) * 0.035
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.cos(phi)
      positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

      seeds[i * 3] = rand()
      seeds[i * 3 + 1] = rand()
      seeds[i * 3 + 2] = rand()
      offsets[i] = rand()
    }

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seeds, 3))
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))
    // The shader moves points far outside their authored bounds, so let the field
    // draw unconditionally rather than compute a bounding sphere that lies.
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 12)
    return geo
  }, [count])

  const uniforms = useMemo(
    () => ({
      uProgress: { value: 0 },
      uTime: { value: 0 },
      uEmitStart: { value: preset.emitStart },
      uEmitEnd: { value: preset.emitEnd },
      uSpread: { value: preset.spread },
      uRise: { value: preset.rise },
      uWander: { value: preset.wander },
      uSize: { value: preset.size },
      uStagger: { value: preset.stagger },
      uCyclic: { value: preset.cyclic },
      uCycles: { value: preset.cycles },
      uFlatten: { value: preset.flatten },
      uColorHot: { value: new THREE.Color(preset.colorHot) },
      uColorCool: { value: new THREE.Color(preset.colorCool) },
      uPeakAlpha: { value: preset.peakAlpha },
      uClear: { value: 0 },
    }),
    [preset],
  )

  useLayoutEffect(() => {
    if (points.current) points.current.frustumCulled = false
  }, [])

  useFrame((state) => {
    const mat = material.current
    if (!mat) return

    const p = reduced ? 1 : scroll[channel]

    mat.uniforms.uProgress.value = p
    // Reduced motion freezes the wander: the field shows its settled shape and
    // stops moving, rather than disappearing.
    mat.uniforms.uTime.value = reduced ? 0 : state.clock.elapsedTime
    mat.uniforms.uClear.value = clear ? clear(p) : 0
  })

  return (
    <points ref={points} geometry={geometry} position={position}>
      <shaderMaterial
        ref={material}
        vertexShader={VERTEX}
        fragmentShader={FRAGMENT}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
