---
name: r3f-scene-architecture
description: How to structure, light and optimize the React Three Fiber canvas for the Almaghrabi site — one persistent canvas, DOM-driven sections, performance budgets and mobile fallbacks. Use when creating or editing anything under components/three or any file importing @react-three/fiber.
---

# R3F scene architecture

## The core decision: one canvas, many sections

Do **not** mount a `<Canvas>` per section. Every canvas is its own WebGL context, its own
render loop and its own compile stall, and browsers cap contexts at around 16 before they
start silently killing the oldest one.

Instead: **one fixed, full-viewport canvas behind the entire page**, and DOM sections
scroll over it. Sections tell the canvas what to show through a single store.

```
app/
  layout.tsx           → <SceneRoot /> mounted once, fixed inset-0 -z-10
components/
  three/
    SceneRoot.tsx      → <Canvas>, camera, lights, env, post-processing
    Stage.tsx          → reads useScene(), swaps the active product group
    products/
      SX300.tsx        → gltfjsx output, one file per model
    fx/
      AerosolField.tsx  → GPU particle suppressant cloud
      HeatHaze.tsx      → refraction shader for the fire section
  sections/
    Hero.tsx  Series.tsx  Product.tsx  Applications.tsx  Contact.tsx
lib/
  useScene.ts          → zustand store: { active, progress, mode, reduced }
```

`useScene` is the only bridge between DOM and WebGL. Sections write to it, the canvas reads
it. No prop drilling through the R3F tree, and no React re-render on scroll — see
scroll-choreography for why that matters.

## Canvas configuration

```jsx
<Canvas
  gl={{ antialias: false, powerPreference: 'high-performance', alpha: true }}
  dpr={[1, 2]}                       // clamp — never let a 3× phone render at 3×
  camera={{ fov: 35, near: 0.05, far: 40, position: [0, 0.28, 1.15] }}
  frameloop={frameloop}              // from the store — see below
  onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping }}
>
```

- `antialias: false` + an SMAA pass costs less than MSAA on most integrated GPUs. If you
  ship no post-processing at all, turn antialias back on.
- `dpr={[1, 2]}` is the single highest-leverage performance line in the file. A 3× DPR phone
  renders 2.25× the pixels of a 2× clamp for no perceptible gain.
- **`frameloop` is a store value, never a literal.** It is read from `useScene` and changes
  as the page does:

  | value | when |
  |---|---|
  | `"always"` | an idle animation is on screen — a turntable, a drifting particle field, a `uTime` wander term |
  | `"demand"` | `prefers-reduced-motion` is set, or all motion on screen derives from scroll |
  | `"never"` | the tab is hidden |

  Under `"demand"` nothing renders until something invalidates, so the scroll handler must
  call `invalidate()` — the DOM side does that through `requestRender()` rather than
  importing from `@react-three/fiber`, which would drag three.js into the first-viewport
  bundle. The reason the rule is not simply "always demand": **a demand loop that calls
  `invalidate()` every frame is strictly worse than `always`** — it pays the invalidation
  bookkeeping on top of the render it was going to do anyway. So the moment a section has
  motion that is not scroll-derived, it switches to `"always"` rather than faking it.

  Apply the current visibility on mount, not just on the `visibilitychange` event, or a page
  opened in a background tab renders at full rate until the user first switches to it.
- FOV 35 is a mild telephoto. It flatters cylindrical products; a wide 60–75 FOV bows the
  can and reads as a video game.

## Lighting — three lights, one environment, no more

The products are 60 % anodized aluminium and 40 % brushed stainless. Both are metals, so
**the environment map is doing almost all of the work** — a metal with `metalness: 1` is a
mirror and ignores punctual lights almost entirely.

```jsx
<Environment resolution={256} frames={1} environmentIntensity={0.9}>
  <color attach="background" args={['#08090b']} />
  <Lightformer form="rect" intensity={3.4} position={[0, 2.2, 1.6]}
    rotation={[-0.5, 0, 0]} scale={[4, 2.4, 1]} />          {/* key softbox */}
  <Lightformer form="rect" intensity={1.5} position={[2.6, 0.9, 0.6]}
    rotation={[0, -Math.PI / 2.4, 0]} scale={[3, 2, 1]} />   {/* side card */}
  <Lightformer form="rect" intensity={1.1} position={[-2.6, 0.9, 0.6]}
    rotation={[0, Math.PI / 2.4, 0]} scale={[3, 2, 1]} />    {/* side card */}
  <Lightformer form="rect" intensity={0.9} color="#8FB6FF" position={[0, 1.4, -2.6]}
    rotation={[0.4, 0, 0]} scale={[4, 2, 1]} />              {/* cool back card */}
  <Lightformer form="rect" intensity={0.35} position={[0, -1.6, 0.4]}
    rotation={[Math.PI / 2, 0, 0]} scale={[4, 4, 1]} />      {/* floor bounce */}
</Environment>
<directionalLight position={[2.4, 3.2, 2.0]} intensity={2.6} castShadow
  shadow-mapSize={[1024, 1024]} shadow-bias={-0.0004} />
<directionalLight position={[-2.0, 0.9, -1.4]} intensity={0.7} color="#8FB6FF" /> {/* cool rim */}
<ambientLight intensity={0.12} />
```

**There is no HDR file.** The environment is a `<Lightformer>` rig baked once (`frames={1}`)
into a 256 px PMREM: a broad key softbox high and in front, two side cards that produce the
cylindrical falloff a canister needs to read as round rather than as a flat disc, a cool back
card for silhouette separation, and a dim floor bounce so the underside of a bracket is not
pure black. It costs **zero network bytes**, which keeps the first-viewport budget clean, and
it avoids a render-blocking third-party CDN fetch — the same reason the glb pipeline skill
bans the draco decoder CDN.

**The limit:** a 256 px PMREM holds up to roughly **roughness 0.2**. Below that the surface
is mirror enough to resolve the map itself, reflections band, and a real HDR becomes worth
the bytes. The five project materials sit at 0.28–0.55, so the rig is correct for them; a
polished chrome or clear-coat finish would not be.

One shadow-casting light only. Each additional one is a full extra scene render.

Red anodized aluminium on white or light backgrounds looks orange. Ground the product
sections on `#0E0F11` graphite and let the red be the only saturated thing on screen — that
is also the brochure's own logic.

## Screen-space anchoring — how 3D stays off the copy

**A product's projected vertical centre is held at a constant fraction of viewport height for
the whole of a camera move. Screen position is never a side effect of the dolly.**

The failure it prevents: you frame the near end by hand, frame the far end by hand, and the
camera travels in a straight line between them. Every progress value in between is unchecked,
and somewhere around 0.3 the product drifts up into the CTA row. Tuning the two ends fixes the
two ends.

Compute the camera Y from the anchor instead of authoring it:

```ts
// The product should sit with its centre at ANCHOR of viewport height, measured
// from the top. 0.5 is centred; 0.72 sits it in the lower third under the copy.
const halfHeight = Math.tan(THREE.MathUtils.degToRad(camera.fov * 0.5)) * distance

// Screen offset from centre, in world units at this distance. Positive = below.
const offset = (ANCHOR - 0.5) * 2 * halfHeight

// Camera rides above the subject by exactly that much, and looks level.
cameraY = subjectY + offset
lookY   = subjectY + offset
```

Only `distance` is authored across the scroll; `halfHeight` grows with it, the offset grows
with it, and the anchor holds. The camera path stops being a straight line and becomes a
gentle curve — which is a crane move, so it also looks better than the straight line did, at
no cost.

The horizontal axis works the same way: offset the camera X by a fraction of `halfWidth`
rather than by a world constant, and keep the look target on the same X as the camera so the
view axis stays parallel. Aiming the look target at the subject rotates the camera back and
cancels the offset entirely.

This matters more the more products are involved. Eleven SKUs from a 115 mm bar to a 215 × 180
mm canister, each framed against the same copy column, is the same problem with ten more
instances of it — and the anchor is what makes them all frame consistently without eleven sets
of hand-tuned numbers.

## Visibility is owned by the active section

**An object's visibility is decided by which section is on screen. A monotonic
progress value is not a visibility condition.**

`scroll.problem > 0` is true forever once the user has scrolled past section 02.
Anything gated on it latches on and follows them down the rest of the page.

```ts
// WRONG — latches. True for the whole rest of the document.
group.visible = scroll.problem > 0.0001

// RIGHT — owned by the section that is speaking.
const visible = useVisibleIn(ENCLOSURE_MODES)   // ['problem', 'activation']
```

Two instances of this bug in this project, both found by measurement rather than by
reading:

- **The cabinet** (`EnclosureScene`) was gated on `problem > 0.0001 || activation >
  0.0001`. It stayed on screen through sections 04 and 05, and its four draw calls
  landed inside the exploded product's budget — 14 calls measured against a budget
  of 8, for a product that only draws 8.
- **A departing product pin** kept writing to the shared `product` channel with
  `scrub: 1` after the next pin had taken over, so the incoming product rendered at
  the outgoing pin's beat. Same root cause: state owned by a progress number
  instead of by the active section.

Where a within-section detail also matters — a transition that has to finish, a
slide-in at the very start — gate on the section FIRST and let progress refine it:

```ts
group.visible = active && exit < 0.995
```

Reduced motion has no ScrollTriggers, so nothing calls `setMode` and the canvas
would sit on section 01 forever. Because visibility is owned by the active section,
there still has to BE one: an IntersectionObserver on each pinned section supplies
it.

## Performance rules

1. **Instance anything repeated.** The applications section shows a server rack, a rail car
   and a switchgear cabinet with dozens of identical SX units. `<Instances>` / `InstancedMesh`
   turns 40 draw calls into 1.
2. **Never allocate in `useFrame`.** No `new THREE.Vector3()`, no array literals, no object
   spreads. Hoist scratch vectors to module scope. This is the difference between a smooth
   scroll and a GC stutter every two seconds.
3. **Mutate, don't setState.** `useFrame` writes directly to `ref.current.position.y`. A
   `useState` in a scroll-linked animation re-renders the React tree 60 times a second.
4. **`<AdaptiveDpr pixelated />` and `<AdaptiveEvents />`** from drei drop resolution while
   the user is actively scrolling and restore it when they stop. Free perceived smoothness.
5. **Suspense boundaries per section**, not one around the whole scene. A single boundary
   means the last model to load blocks the first section from appearing.
6. **Frustum-cull aggressively** and set `far` as tight as the scene allows — 40 m here, not
   the default 2000.

## Post-processing: budget, not decoration

Every pass is a full-screen render. On this site the whole stack is worth **at most three
passes**:

```jsx
<EffectComposer multisampling={0} enableNormalPass={false}>
  <Bloom intensity={0.42} luminanceThreshold={0.86} luminanceSmoothing={0.28} mipmapBlur />
  <ChromaticAberration offset={[0.0004, 0.0006]} />
  <Vignette darkness={0.42} offset={0.32} />
</EffectComposer>
```

Bloom earns its place — it is what makes the discharge/ignition moment read as heat. SSAO,
depth of field and SSR do not: they cost 2–5 ms each and on a single well-lit product they
change almost nothing a viewer can name. Add DoF only on the hero, only on desktop, and
measure before and after.

## Mobile and reduced-motion

Two switches, both read from `useScene()`:

```ts
const isLowPower = /Android|iPhone/.test(navigator.userAgent) || navigator.hardwareConcurrency <= 4
const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
```

- **Low power**: drop post-processing entirely, `dpr={[1, 1.5]}`, halve particle counts,
  disable shadows and use a baked contact-shadow plane instead.
- **Reduced motion**: this is an accessibility requirement, not an optimization. Freeze the
  scroll choreography, show each product at its final framing, keep opacity fades only. The
  page must remain fully readable and navigable with zero 3D motion.
- **No WebGL at all**: render the pre-rendered `_views/*_hero.png` in place of the canvas.
  Those files exist for exactly this reason.

## What to verify before calling a scene done

- Chrome DevTools → Performance: scroll the full page, look for frames over 16 ms.
- `<DevStats />` in dev: draw calls, triangles, fps, program count, read straight off
  `renderer.info`. (`r3f-perf` is not installable here — its latest release depends on drei
  `^9`, the React 18 line, so it cannot resolve against R3F v9 / React 19.)
### A repeatable wrong number reads as correctness

Three measurement failures on this project, all of which produced stable, plausible,
completely wrong numbers:

| what was measured | what it said | what was true |
|---|---|---|
| `gl.info` sampled outside the render loop | 3 calls / 6 triangles, repeatably | 28 calls / 21,136 triangles |
| framebuffer compared across a scrub, in a background tab | byte-identical every time | nothing — rAF was suspended, so the buffer never updated |
| draw calls sampled before Suspense resolved | 4 calls / 2,340 triangles, repeatably | the cabinet, not the product being measured |

They share one shape: **sampled at the wrong moment in the frame, or at the wrong
moment in the lifecycle.** None of them looked like instrumentation bugs. The first
looked like a culling problem and cost an afternoon; the second looked like proof of
determinism and was proof of nothing; the third looked like a scene under budget.

Repeatability is not correctness. Before trusting any measurement, confirm both:

1. It was taken **inside the render loop** — `renderer.info` auto-resets each frame,
   and the drawing buffer is undefined after the frame is presented unless
   `preserveDrawingBuffer` is on.
2. It was taken **after the scene had resolved** — models still coming through
   Suspense and shaders still compiling both produce a stable number about a scene
   that is not the one you meant to measure.

And in a headless run, launch with `--disable-background-timer-throttling`,
`--disable-renderer-backgrounding` and `--disable-backgrounding-occluded-windows`.
Without them a headless page is still a background page: no rAF, no `useFrame`, no
new frames, and every sample comes back identical.

- **`renderer.info.render` auto-resets each frame.** Read the counts in `useFrame`,
  write them to a plain object, and let the DOM overlay read that.
- Throttle CPU 4× and network to Fast 3G — this site's audience includes site engineers on
  phones in industrial areas.
- Tab through the whole page with the canvas present. Focus order must never enter the
  canvas.
