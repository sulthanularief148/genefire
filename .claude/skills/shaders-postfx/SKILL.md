---
name: shaders-postfx
description: GLSL shader and post-processing patterns for the Almaghrabi site — the aerosol discharge, heat haze, ember particles and material accents. Use when writing any custom shader, particle system, or EffectComposer pass.
---

# Shaders & post-processing

## Constraints from this codebase

- **Shaders live in template literals inside `.ts` files.** Do not add a `.glsl` loader.
  Turbopack does not need one, and configuring it buys nothing but a build-config dependency
  and a second place for a shader to hide.
- **There is no HDR and there are no texture files in `/public`.** Any noise, gradient or
  lookup texture a shader needs is either generated procedurally at runtime as a
  `DataTexture`, or written as a GLSL function inline. Do not fetch one, and do not commit a
  binary.

Three custom effects carry this site. Everything else is stock.

## 1. Aerosol discharge — the money shot

The GENEFIRE selling point is that the agent is a **fine dry aerosol that floods a volume**,
not a liquid jet. The shader has to communicate "fills the space" rather than "sprays at
something". That distinction is the entire product argument.

GPU particles, one draw call, no per-particle CPU work:

```glsl
// vertex
uniform float uProgress;   // 0..1, driven by ScrollTrigger
uniform float uTime;
attribute vec3 aSeed;      // per-particle random
attribute float aOffset;   // 0..1 stagger

varying float vLife;

void main() {
  float life = clamp((uProgress - aOffset * 0.35) * 1.6, 0.0, 1.0);
  vLife = life;

  // burst outward from the nozzle, then buoyant drift + turbulent wander
  vec3 dir  = normalize(aSeed - 0.5);
  vec3 pos  = position
            + dir * life * (1.4 + aSeed.x * 0.8)          // radial flood
            + vec3(0.0, life * life * 0.45, 0.0)          // rise
            + 0.09 * sin(uTime * 0.7 + aSeed * 12.0) * life; // wander

  vec4 mv = modelViewMatrix * vec4(pos, 1.0);
  gl_PointSize = (7.0 + 26.0 * life) * (1.0 / -mv.z);
  gl_Position = projectionMatrix * mv;
}
```

```glsl
// fragment — soft round particle, additive
varying float vLife;
uniform float uPeakAlpha;   // see below — measure this, do not guess it
void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float alpha = smoothstep(0.5, 0.0, d) * (1.0 - vLife) * uPeakAlpha;
  vec3 col = mix(vec3(1.0, 0.86, 0.72), vec3(0.72, 0.78, 0.86), vLife);
  gl_FragColor = vec4(col, alpha);
}
```

### Per-particle alpha is measured, never assumed

Additive sprites **sum**. Twelve thousand of them overlapping in the plume core stack far past
1.0, and with a 0.86 bloom threshold the pass turns the whole discharge into a white blob. But
the safe value is not a number you can reason your way to — it depends on the count, the
sprite size, the camera distance and how much the plume overlaps itself at its densest, all of
which change when any of them changes.

So use the method, not a constant:

1. Start deliberately low, around 0.05. The plume will look like scattered dust.
2. Raise it until the plume reads as **dense** rather than as dust.
3. Verify at the peak progress value — 0.45 for the discharge — that the composited frame
   still clears the bloom threshold.

The measurement has to happen inside the render loop, for the same reason draw-call counts do:
outside it the framebuffer contents are undefined and read back black. Sample the composited
frame, and check both max luminance and the *percentage of pixels* over the threshold — a
handful of hot pixels is a highlight, a percentage is a blob.

On this project that method landed at **peakAlpha 0.14**, giving max luminance 0.619 and 0.00%
of pixels over 0.86. An earlier draft of this skill asserted a ceiling of 0.55; that was wrong
by roughly an order of magnitude and would have clipped badly. Treat 0.14 as this scene's
answer, not as the new constant.

Settings that matter: `blending: AdditiveBlending`, `depthWrite: false`,
`transparent: true`. Depth-write on transparent additive particles produces black squares
and it is always the cause when you see them.

Counts: **12 000 desktop, 4 000 mobile.** Above ~20 000 the fill-rate cost of overlapping
additive quads dominates and you gain nothing visually.

## 2. Heat haze — refraction

Used in the "problem" section before suppression, and collapsing away after it.

Render the scene to a target, then offset the UV lookup by a scrolling noise field:

```glsl
uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uStrength;   // 0 after suppression, ~0.014 at peak
varying vec2 vUv;

void main() {
  float n1 = texture2D(uNoise, vUv * 3.0 + vec2(0.0, uTime * 0.14)).r;
  float n2 = texture2D(uNoise, vUv * 6.4 - vec2(uTime * 0.09, 0.0)).r;
  vec2 offset = (vec2(n1, n2) - 0.5) * uStrength * smoothstep(1.0, 0.25, vUv.y);
  gl_FragColor = texture2D(tDiffuse, vUv + offset);
}
```

The `smoothstep(1.0, 0.25, vUv.y)` term is what sells it — real heat shimmer is strongest
near the source and dies out above. A uniform full-screen wobble reads as a broken monitor.

Drive `uStrength` from the same ScrollTrigger progress as the discharge, inverted. The haze
dying as the aerosol floods *is* the argument.

## 3. Ember / ignition particles

Same particle system, different uniforms: upward buoyancy, warm-to-dark colour ramp, short
life, low count (600–1500). Reuse the material with different uniform values rather than
writing a second shader — one program, one compile.

## Material accents

- **Fresnel rim on the products.** A thin cool rim separates a dark red canister from a dark
  background. Add it in `onBeforeCompile` on the standard material rather than writing a
  custom shader, so you keep all the PBR lighting:

```js
material.onBeforeCompile = (shader) => {
  shader.fragmentShader = shader.fragmentShader.replace(
    '#include <output_fragment>',
    `float fres = pow(1.0 - abs(dot(normalize(vNormal), normalize(vViewPosition))), 3.0);
     gl_FragColor.rgb += fres * vec3(0.18, 0.22, 0.30);
     #include <output_fragment>`
  )
}
```

- **Scanline / blueprint reveal** for the exploded view: a clip plane driven by scroll, with
  an emissive edge line where the plane cuts. `THREE.Plane` + `material.clippingPlanes` +
  `renderer.localClippingEnabled = true`.

## Post-processing stack — final

```jsx
<EffectComposer multisampling={0} enableNormalPass={false}>
  <Bloom intensity={0.42} luminanceThreshold={0.86} luminanceSmoothing={0.28} mipmapBlur />
  <ChromaticAberration offset={[0.0004, 0.0006]} radialModulation />
  <Noise opacity={0.018} premultiply />
  <Vignette darkness={0.42} offset={0.32} />
</EffectComposer>
```

`Noise` at 0.018 is nearly invisible and it is doing real work: it breaks up gradient banding
on the dark graphite backgrounds, which is otherwise very visible on 8-bit displays.

Spike `Bloom.intensity` to ~0.9 for ~200 ms at the discharge moment, then ease back. That
single ramp is worth more than any additional pass.

**Do not add** SSAO, SSR, or god rays. Each costs 2–5 ms, and on a single well-lit product
against a dark ground none of them changes anything a viewer could name.

## Shader hygiene

- Compile stalls are the main hazard. Every unique material/shader combination compiles on
  first render, and a 40 ms stall mid-scroll is very visible. Warm every shader during the
  loading screen with `<Preload all />` or an off-screen render of one frame per material.
- `precision mediump float` on mobile fragment shaders unless you have a reason not to.
- Prefer `smoothstep` over branching. Divergent branches in a fragment shader cost more than
  computing both sides.
- Every custom shader needs a `uReduced` uniform or an equivalent early-out, so
  `prefers-reduced-motion` can freeze it at a static frame rather than disabling the whole
  visual.
