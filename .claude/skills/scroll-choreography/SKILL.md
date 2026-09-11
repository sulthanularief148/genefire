---
name: scroll-choreography
description: Lenis + GSAP ScrollTrigger patterns for driving the 3D scene and DOM reveals on the Almaghrabi site. Use when building any scroll-linked animation, pinned section, camera move or section transition.
---

# Scroll choreography — Lenis + GSAP ScrollTrigger + R3F

## The wiring, once, correctly

Lenis replaces native scroll with an interpolated value. ScrollTrigger must be told about
that, or every trigger fires at the wrong pixel.

```ts
// lib/smoothScroll.ts
import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
gsap.registerPlugin(ScrollTrigger)

export function initSmoothScroll() {
  const lenis = new Lenis({
    duration: 1.1,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    syncTouch: false,          // leave native inertia on touch — syncTouch feels laggy on iOS
  })

  // 1. Let ScrollTrigger drive Lenis's clock, not requestAnimationFrame separately.
  lenis.on('scroll', ScrollTrigger.update)
  gsap.ticker.add((time) => lenis.raf(time * 1000))
  gsap.ticker.lagSmoothing(0)

  return lenis
}
```

Three mistakes to avoid:

1. **Two RAF loops.** If you call `requestAnimationFrame(raf)` for Lenis *and* let GSAP run
   its own ticker, the two drift and produce micro-jitter. Drive Lenis from `gsap.ticker`.
2. **`lagSmoothing` left on.** GSAP's default lag smoothing skips ahead after a stall, which
   teleports a scrubbed camera. Turn it off.
3. **`scrollerProxy` when you don't need it.** You only need `ScrollTrigger.scrollerProxy`
   if Lenis is wrapping a custom element instead of the window. For a normal page, the two
   lines above are the entire integration.

In Next.js App Router, run this in a `'use client'` provider and `lenis.destroy()` +
`ScrollTrigger.killAll()` on unmount, or a route change leaves dead triggers behind.

## Driving the 3D scene from scroll

**Never `setState` from a scroll handler.** Write to a plain object, read it in `useFrame`.

```ts
// lib/useScene.ts
export const scroll = { progress: 0, section: 0 }   // mutable, outside React
```

```ts
ScrollTrigger.create({
  trigger: '#product-sx300',
  start: 'top top',
  end: '+=220%',
  pin: true,
  scrub: 1,                        // 1s catch-up: adds weight, hides jitter
  onUpdate: (self) => {
    scroll.progress = self.progress
    invalidate()                   // required with frameloop="demand"
  },
})
```

```tsx
useFrame((state, dt) => {
  // damp, never assign — assignment makes scrub feel mechanical
  easing.damp3(group.current.position, [0, targetY(scroll.progress), 0], 0.25, dt)
  easing.dampE(group.current.rotation, [0, scroll.progress * Math.PI * 2, 0], 0.3, dt)
})
```

`scrub: true` locks 1:1 to the scrollbar. `scrub: 1` lets the animation lag a beat behind.
For a heavy steel canister, `scrub: 1` reads as mass; `scrub: true` reads as a slider.

## Section grammar

Every pinned section is three beats — **entrance, hold, exit**. Give each roughly a third of
the pinned distance. A section with no hold feels like a slideshow; a section that is all
hold feels stuck.

```
0.00 ─ 0.30   entrance : product flies in, camera settles, headline masks up
0.30 ─ 0.70   hold     : slow turntable, spec numbers count up, hotspots appear
0.70 ─ 1.00   exit     : product recedes / dissolves, next section's colour bleeds in
```

Use a single master timeline per section, and let ScrollTrigger scrub it. Do not create one
trigger per element — you end up with 40 triggers fighting over refresh order.

```ts
const tl = gsap.timeline({ scrollTrigger: { trigger: sec, start: 'top top', end: '+=220%', pin: true, scrub: 1 } })
tl.from('.eyebrow', { yPercent: 120, duration: 0.3 }, 0)
  .from('.spec-row', { yPercent: 60, opacity: 0, stagger: 0.06, duration: 0.4 }, 0.12)
  .to({}, { duration: 0.4 })                              // the hold
  .to('.section-inner', { opacity: 0, duration: 0.3 }, 0.7)
```

## Scroll plan for this site

| # | Section | Pin | Scroll length | 3D behaviour |
|---|---|---|---|---|
| 1 | Hero | yes | 200 vh | ONE unit only — the PX 5 lying on a lit turntable, beside the copy. Scroll clears the copy, brings the unit to centre frame and names it with its three figures. No CTAs, no lineup (the range comparison is §04's job). See `lib/heroStage.ts`. |
| 2 | The problem | yes | 150 vh | Camera pushes into a dark server rack. Heat-haze shader ramps up. Ember particles. No product yet — build tension. |
| 3 | Activation | yes | 250 vh | The money moment. SX300 discharges: particle burst, bloom spike, heat haze collapses, rack lights come back. This beat justifies the whole WebGL budget. |
| 4 | Three series | yes | 300 vh | One lit plinth per series, units standing upright at true relative scale within the plinth. Copy column + spec table beside it; each series holds for a third of the pin and the camera travels plinth to plinth in the reading direction. See `lib/seriesStage.ts`. |
| 5 | Product detail | yes ×11 | 180 vh each | One product per pin. Turntable + exploded view + spec counters + hotspots. |
| 6 | Coverage calculator | no | auto | DOM-driven; the 0.05 m³/g rule sizes a live 3D room that grows with the input. |
| 7 | Applications | yes | 220 vh | Six environments (military, industry, power, rail, data centre, lab) as instanced scenes on a rotating drum. |
| 8 | Certifications | no | auto | Flat DOM. Let the eye rest. |
| 9 | Contact | no | auto | Canvas fades to a still. |

**Total scroll depth is roughly 40 screens.** That is a lot. Ship a persistent progress rail
and a section jump-nav, or people bounce at section 4.

## Performance

- Everything animated by scroll must be `transform` and `opacity` only. Animating `top`,
  `height` or `margin` forces layout on every scroll tick.
- `will-change: transform` on pinned wrappers, removed on exit — leaving it on permanently
  costs GPU memory per layer.
- `ScrollTrigger.refresh()` after fonts load and after any image without fixed dimensions
  settles, or every `end: '+=220%'` is computed against the wrong page height.
- `ScrollTrigger.config({ ignoreMobileResize: true })` — mobile browsers fire resize when the
  URL bar hides, which otherwise re-pins everything mid-scroll.
- Batch reveals: `ScrollTrigger.batch('.card', { onEnter: ... })` instead of a trigger per card.

## Accessibility

```ts
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  lenis.destroy()                                    // give back native scroll
  ScrollTrigger.getAll().forEach(t => t.kill())
  gsap.set('[data-anim]', { clearProps: 'all', opacity: 1, y: 0 })
}
```

Pinned sections hide content from Ctrl+F and from screen readers if the copy only exists in
a canvas. Every headline, spec figure and product name must exist as real DOM text inside the
pinned section — the 3D is illustration, never the only carrier of information.
