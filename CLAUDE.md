# Almaghrabi × GENEFIRE — project context

## What this is

A bilingual (Arabic-first / English) marketing site for **ALMAGHRABI for Trading Services**
(المغربي للخدمات التجارية), the authorized agent in Saudi Arabia for **GENEFIRE** aerosol fire
suppression systems. The site is a scroll-driven WebGL experience: one persistent R3F canvas
behind the page, eleven 3D products, and a discharge sequence that is the centrepiece.

- Company: ALMAGHRABI for Trading Services, Riyadh
- Address: Othman Bin Affan Road, Al Nuzha District, Riyadh — الرياض، طريق عثمان بن عفان، حي النزهة
- Phone: 0548618668 / 0548281779 · Email: info@almaghrabi-trading.com
- Principal: GENEFIRE — "Where Innovation Meets Fire Safety" / حيث يلتقي الابتكار بالسلامة من الحرائق

## Audience

Saudi industrial and commercial buyers: facility managers, MEP and fire-safety consultants,
data-centre operators, utilities, rail, defence contractors, laboratory managers. They are
technical, they read specs, and they are evaluating whether Almaghrabi is a serious partner
before they evaluate the product. **The 3D exists to establish credibility, not to entertain.**
Arabic is the primary language.

## Stack

| | |
|---|---|
| Framework | Next.js (App Router), TypeScript, `app/[locale]/…` |
| i18n | `next-intl` — locales `ar` (default) and `en` |
| 3D | three.js + `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing` |
| Scroll | `lenis` + `gsap` / `ScrollTrigger` |
| State | `zustand` — one store bridging DOM sections and the canvas |
| Styling | Tailwind with **logical properties only** (`ms-`, `me-`, `ps-`, `pe-`, `start-`, `end-`) |
| Assets | `.glb` only in `/public/models`; sources in `/3d-source` |

## Skills in `.claude/skills/`

Read the relevant one before you write code in that area. They are not background reading —
they contain the actual conventions this repo enforces.

| Skill | Read it when |
|---|---|
| `genefire-product-data` | Touching any spec, product name, or the coverage calculator |
| `glb-gltf-pipeline` | Creating, exporting, compressing, validating or loading any `.glb` |
| `r3f-scene-architecture` | Anything under `components/three/` or importing `@react-three/fiber` |
| `scroll-choreography` | Any scroll-linked animation, pin, camera move or section transition |
| `shaders-postfx` | Any GLSL, particle system, or EffectComposer pass |
| `arabic-rtl-bilingual` | Any copy, layout, locale route, or direction-sensitive animation |
| `blender-authoring` | Modelling or exporting from Blender |
| `sketchup-to-web3d` | Any `.skp` source (environments only, never products) |
| `ai-video-assets` | Any video, looping background or generated motion asset |

## Hard rules

1. **`assets/products.json` is the only source of product truth.** Never retype a spec.
2. **Two brochure figures are wrong** (SX 100 volume, SX 500 AGC). `products.json` carries the
   corrected values. Do not "fix" them back to the printed numbers, and do not publish before
   the client confirms — see `genefire-product-data`.
3. **Never invent a claim or a certification.** Life-safety product, regulated market.
4. **Never AI-generate a product image.** Products come from the `.glb` models only.
5. **One `<Canvas>` for the whole site.** Not one per section.
6. **No physical CSS properties.** `margin-left` in this repo is a bug.
7. **Every headline, spec and product name exists as real DOM text.** The canvas is
   illustration; it is never the only carrier of information.
8. **`prefers-reduced-motion` must yield a fully readable, fully navigable site** with the
   scroll choreography frozen.
9. Metres, +Y up, origin at base centre, for every 3D asset. No `scale={0.01}` in JSX.
10. Arabic is written first. English is the translation.
11. **A server component importing a value from a `'use client'` module receives a
    client-reference proxy, not the value.** Shared constants live in their own module that
    neither side owns. This is not a lint rule you can rely on — it builds fine and fails at
    page-data collection: `ENVIRONMENT_IDS.map is not a function`, from a server section
    importing an array that lived in the client three.js component next to it. The list moved
    to `lib/environments.ts` and both sides import from there.

## Performance budget

| | Target |
|---|---|
| LCP (4G, mid-range Android) | < 2.5 s |
| First-viewport JS | < 200 KB gzipped |
| All `.glb` on a route | < 1.2 MB |
| Draw calls | < 60 |
| Video on first load | 0 bytes |
| Sustained FPS while scrolling | 60 desktop / 45+ mobile |

## Directory shape

```
app/[locale]/          routes, one language per route
components/
  three/               SceneRoot, Stage, products/, fx/
  sections/            Hero, Problem, Activation, Series, Product, Coverage, Applications, Contact
lib/                   useScene store, smoothScroll, product helpers
messages/              ar.json, en.json — every string, no exceptions
public/models/         optimized .glb
public/hdr/            1k studio environment
3d-source/             .blend / .skp sources (large binaries git-ignored)
assets/                this kit: products.json, models, renders, photos, brand
docs/                  business analysis, research, site spec, copy deck, build prompt
```

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
