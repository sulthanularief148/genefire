# 05 — Master build prompt

Copy **everything between the two rulers** into your Claude Code terminal, from inside a
folder that already contains this kit's `.claude/`, `assets/`, `docs/`, `messages/` and
`CLAUDE.md`.

Build it in **phases**. Do not paste all six at once — a single prompt asking for the whole
site produces a shallow version of every section. Run Phase 1, review, then Phase 2.

---
---

## PHASE 1 — Scaffold, i18n, design system

```
Read CLAUDE.md and .claude/skills/arabic-rtl-bilingual/SKILL.md before you write anything.

Scaffold a Next.js App Router project in this folder for the Almaghrabi × GENEFIRE site.

Requirements:
- TypeScript, Tailwind, ESLint. App Router with app/[locale]/ — locales "ar" (default) and "en".
- next-intl wired to the existing messages/ar.json and messages/en.json. Do not rewrite those
  files; they are the source of truth and their keys are already parity-checked.
- <html lang> and dir set server-side from the locale. No flash of LTR on hydration.
- Tailwind config: extend with the palette from assets/products.json → brand.palette
  (fire_red #E1251B, deep_red #B01712, ink #0E0F11, graphite #2A2D31, steel #C9CDD2,
  gold #B08A3E). Add IBM Plex Sans Arabic for [lang="ar"] and Inter for [lang="en"]
  via next/font.
- Add a lint rule or a check script that fails on physical CSS properties
  (margin-left, margin-right, padding-left, padding-right, left:, right:, text-align: left|right)
  anywhere in src/. This project uses logical properties only.
- Copy assets/products/*.glb into public/models/ and the *_views/*.png into public/renders/.
- lib/products.ts: import assets/products.json, export typed Product/Series types generated
  from its shape, plus helpers requiredAgcGrams(volume) and recommendUnit(volume) implementing
  the verified 0.05 m³/g rule.
- Root layout mounts a skip-to-content link as the first focusable element.
- Build a /styleguide route showing the palette, both type scales, and the same paragraph in
  ar and en side by side so the Arabic sizing can be judged.

Do not build any 3D or scroll code in this phase. Stop when `npm run build` passes and both
/ar and /en render the hero copy from the message files with correct direction.
```

---

## PHASE 2 — Canvas, scroll engine, hero

```
Read .claude/skills/r3f-scene-architecture/SKILL.md, .claude/skills/scroll-choreography/SKILL.md
and .claude/skills/glb-gltf-pipeline/SKILL.md first. Follow them exactly — especially the
one-canvas rule and the Lenis/GSAP ticker integration.

Add the 3D foundation:
- Install three, @react-three/fiber, @react-three/drei, @react-three/postprocessing,
  lenis, gsap, zustand.
- components/three/SceneRoot.tsx — ONE <Canvas>, fixed inset-0 -z-10, mounted in the locale
  layout. Config exactly as specified in the r3f-scene-architecture skill: dpr [1,2], fov 35,
  frameloop "demand", ACES tone mapping, antialias false.
- Lighting per that skill: 1k HDR environment doing the work, one shadow-casting key, one cool
  rim, low ambient. Source a neutral studio HDR and put it in public/hdr/.
- lib/useScene.ts — zustand store { active, progress, mode, reduced, lowPower }. Plus a plain
  mutable `scroll` object outside React for per-frame values. Scroll handlers write to the
  mutable object and call invalidate(); they never setState.
- lib/smoothScroll.ts — Lenis driven from gsap.ticker with lagSmoothing(0), as in the skill.
  Client provider, with full teardown on unmount.
- components/three/products/ — generate a component per model with
  `npx gltfjsx public/models/<id>.glb --types`. Do not hand-write them.
- Build section §01 Hero from docs/03-site-structure-spec.md: pinned 200vh, scrub 1, camera
  pulls back from one SX 300 to reveal all eleven on an arc. Copy comes from the message files
  and lives in real DOM over the canvas.
- Implement prefers-reduced-motion now, not later: it destroys Lenis, kills all ScrollTriggers,
  and shows final framings. Verify the page is fully readable with it on.
- Add r3f-perf in development only.

Acceptance: 60fps scrolling the hero on desktop, no allocation inside useFrame, draw calls
under 60, and the page fully readable with reduced motion enabled and with WebGL disabled.
```

---

## PHASE 3 — The activation sequence

```
Read .claude/skills/shaders-postfx/SKILL.md first.

Build §02 (The problem) and §03 (Activation) from docs/03-site-structure-spec.md. §03 is the
centrepiece of the whole site — give it the time.

- components/three/fx/AerosolField.tsx — GPU particle system per the shader in the skill.
  Additive blending, depthWrite false. 12000 particles desktop / 4000 mobile. All motion in
  the vertex shader from uProgress; no CPU per-particle work.
- components/three/fx/HeatHaze.tsx — the refraction pass, with the vUv.y falloff term. uStrength
  ramps up through §02 and collapses to 0 across §03.
- The discharge must read as FLOODING A VOLUME, not spraying a jet. That distinction is the
  entire product argument. If it looks like a fire hose, it is wrong.
- Post-processing: Bloom + ChromaticAberration + Noise + Vignette only. Spike bloom intensity
  to ~0.9 for 200ms at the discharge, then ease back to 0.42. No SSAO, no SSR, no DoF.
- Beat timing exactly as tabulated in the spec: mount 0–0.20, glow 0.20–0.35, discharge
  0.35–0.55, flood 0.55–0.80, clear 0.80–1.00. Copy appears only after 0.80.
- Warm every shader during the preloader. A compile stall in the middle of this section
  destroys it.

Acceptance: scrub the section backwards and forwards repeatedly with no stutter and no
particle popping. Under reduced motion, the final frame and the copy appear immediately.
```

---

## PHASE 4 — Series, product detail, calculator

```
Read .claude/skills/genefire-product-data/SKILL.md first. Every figure comes from
assets/products.json. Never retype a spec.

- §04 Three series: pinned 300vh horizontal rail, camera tracks past PX → Small-Scale →
  Industrial. Models at TRUE relative scale — SX 5/10 beside SX 1500 is the point. In RTL the
  rail tracks in the reading direction; feed progress through a signed multiplier.
- §05 Product detail ×11: one pin each, 180vh, identical grammar so it reads as a system.
  Turntable → spec counters counting up from zero → exploded view with cyan leader lines to
  labelled hotspots → reassemble. Sticky sub-nav rail listing all eleven.
- §06 Coverage calculator: L×W×H or direct volume, plus application type. A live 3D room in
  the canvas grows and shrinks with the inputs, recommended unit shown inside at true relative
  scale. Show recommended SKU, next size up, and unit count for volumes over 75 m³.
  The disclaimer string (calc.disclaimer) MUST render adjacent to every result, in both
  languages. It is a legal requirement, not copy.
- The calculator must be fully keyboard-operable and must state its result as text, not only
  as 3D.
- Sub-route app/[locale]/products/[id] — static, indexable, full spec sheet, works with
  WebGL disabled entirely.

Acceptance: every number on screen traces to products.json. The two brochure_typo notes in
that file are surfaced somewhere the client will see them during review.
```

---

## PHASE 5 — Applications, comparison, contact, chrome

```
Read .claude/skills/sketchup-to-web3d/SKILL.md before adding any environment model.

- §07 Applications: six environments on a rotating drum — military, industry, power, railway,
  data centre, laboratory. Heavy fog, desaturated, instanced repeated geometry, relevant unit
  highlighted at true scale. Budget: 60k triangles per environment, 8 materials. Until real
  SketchUp scenes exist, block them out with primitives at correct real-world dimensions.
- §08 Why aerosol: flat DOM comparison table vs FM-200/Novec, CO₂, sprinkler. Rows per the
  copy deck. Put the retrofit row last — it is the argument.
- §09 Certifications: placeholder slots only. Do NOT reconstruct ISO/SGS/CE marks from the
  brochure scan; leave labelled empty slots for client-supplied artwork.
- §10 Contact: form with enclosure volume pre-filled from §06. Both phone numbers as tel:,
  email as mailto:.
- Persistent chrome: progress rail on the inline-end edge with section names, nav, AR/EN
  switch that preserves the current section anchor.
- Responsive tiers exactly as tabulated in docs/03-site-structure-spec.md.

Acceptance: the full page is navigable end-to-end on a 375px viewport with a 4x CPU throttle.
```

---

## PHASE 6 — Optimize, verify, ship

```
- Run every .glb through gltf-transform per .claude/skills/glb-gltf-pipeline/SKILL.md:
  meshopt for anything above the fold, draco for lazily-loaded environments. Then
  gltf-validator on each — zero errors. Host the draco decoder locally in public/draco/.
- Lighthouse on /ar and /en, mobile profile, throttled. Targets: LCP < 2.5s, first-viewport JS
  < 200KB gzipped, all .glb on a route < 1.2MB.
- Full keyboard pass: focus order never enters the canvas, every pinned section's content is
  in the accessibility tree and findable with Ctrl+F.
- Contrast audit: #E1251B on #0E0F11 passes; #E1251B on white does NOT at body sizes — swap to
  #B01712 anywhere red text sits on a light ground.
- grep the whole of src/ for physical CSS properties and hardcoded strings. Both should return
  nothing.
- Test /ar and /en at every responsive tier, with reduced motion on, and with WebGL disabled.
- Write docs/LAUNCH-CHECKLIST.md listing everything still blocked on the client:
  the SX 100 volume figure, the SX 500 AGC figure, the fire class F question, certification
  artwork and certificates, native Arabic technical review, real product CAD or scans, and
  real application photography or approved AI b-roll.
```

---
---

## Notes on running these

- **Review between phases.** Each one builds on the last; a wrong lighting setup in Phase 2
  is cheap to fix and expensive to inherit.
- **The skills are the spec.** If Claude produces code that contradicts a skill file, the skill
  wins — say so and point at the file.
- **Phase 3 is where the site is won or lost.** Budget more time for it than for Phases 4 and 5
  combined.
- **Nothing publishes until the two spec figures are confirmed by GENEFIRE in writing.**
