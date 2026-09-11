# 02 — Reference research: what actually works in 3D web, 2026

## Sites worth studying, and the specific thing to take from each

| Site | Technique | What to steal for Almaghrabi |
|---|---|---|
| **Cartier — Watches & Wonders** | Six discrete 3D "alcoves", GLSL shaders, GSAP choreography, Lenis scroll binding | *One room per item beats one long scroll.* Give each of the three series its own space rather than dragging the visitor through eleven products in a single tunnel. |
| **Oryzo** | Single product, real material response, orbiting camera, inertial Z-depth scrolling | Restraint outperforms a busy scene. One SX 300, lit properly, beats a hero with all eleven floating. |
| **Shopify Editions** | Scroll-sequenced reveals, particle-dispersing type, depth-layered panel transitions | *Entrance → hold → exit* per section. This is the grammar for the whole page. |
| **Hubtown** | Hero monolith, mouse-reveal, reflective ground, real-time lighting, GSAP | "3D dignifies an unglamorous brand." A fire extinguisher is exactly that brand. |
| **Explore Primland** | Terrain, atmospheric fog, scroll-driven flythrough | Fog and depth cueing sell scale for almost nothing. Use it in the applications section. |
| **IVRESS** | WebGPU renderer with WebGL fallback, shaders authored in TSL | If you want a WebGPU path later, author shaders in TSL now and the migration is a config switch, not a rewrite. |
| **Lacoste Ace Breaker** | One tightly-scoped interactive mechanic | If an interactive element is added, it should be *one verb* — here, "size my enclosure". |

**The consistent 2026 finding:** performance is treated as a feature, not a cleanup task.
Instancing, baked lighting, and explicit byte budgets are what separate shipped work from
demos. Every site above has a stated budget its authors did not exceed.

## Measured performance findings

From a production R3F case study: combining Draco compression with an LOD system cut mobile
scene load by **40 %** and moved average FPS from a sporadic 20–30 to a stable **45–55**.
Adding OffscreenCanvas rendering took it to a consistent 60.

Concrete techniques, ranked by return on effort for this project:

1. **DPR clamp `[1, 2]`** — one line, largest single win on mobile. A 3× DPR phone otherwise
   renders 2.25× the pixels for no perceptible gain.
2. **Instancing** — repeating geometry (racks, cabinets, the SX units scattered in the
   applications scene) goes from N draw calls to 1.
3. **Compression** — Draco can cut glTF geometry up to ~10×; meshopt compresses less but
   decodes an order of magnitude faster with a ~15 KB decoder instead of ~200 KB of WASM.
   **Use meshopt above the fold, draco below it.**
4. **Texture discipline** — 2048 → 512 for mobile, WebP or KTX2. KTX2 stays compressed in
   VRAM, so it costs roughly a quarter of a PNG's memory and never spikes during decode.
5. **LOD** — only worth it for the environment models, not for single products.
6. **OffscreenCanvas / web worker** — real gains, real complexity. Treat as a phase-2
   optimization, not a launch requirement.

## The toolchain split

Vanilla three.js gives maximum control for bespoke one-off work. **React Three Fiber is the
right choice for component-driven product sites** — which is exactly what this is, with
eleven products sharing one scene, one material set and one camera rig. The declarative model
pays for itself the moment you have more than three products.

`gltf-transform` is the standard optimization tool. It handles Draco, meshopt, KTX2, WebP,
welding, simplification and instancing from a single CLI, and it is scriptable in CI.

## Applied to this build

**Take:**
- One canvas, DOM sections over it
- Section-as-narrative-beat grammar (entrance / hold / exit)
- One product per pinned section, not a carousel
- meshopt above the fold, draco below
- DPR clamp, instancing, explicit byte budget
- A single interactive verb: the coverage calculator
- Fog and depth cueing for the application environments

**Leave:**
- WebGPU (author in TSL if you want the option; do not ship a dual renderer for v1)
- OffscreenCanvas (phase 2)
- SSAO / SSR / god rays — cost 2–5 ms each and change nothing a viewer can name on a single
  lit product
- Gamification — wrong register entirely for civil-defence procurement
- Audio — this site will be opened in open-plan offices

## Sources

- [Best Three.js Websites 2026: 8 Sites + Techniques — Utsubo](https://www.utsubo.com/blog/best-threejs-websites-2026)
- [Boosting React Three Fiber Mobile Performance: A Deep Dive — Krapton](https://krapton.com/blog/boosting-react-three-fiber-mobile-performance-in-2026-a-deep-dive-d6105c)
- [From Flat to Spatial: Creating a 3D Product Grid with React Three Fiber — Codrops](https://tympanus.net/codrops/2026/02/24/from-flat-to-spatial-creating-a-3d-product-grid-with-react-three-fiber/)
- [Three.js vs React Three Fiber vs Babylon.js 2026 — PkgPulse](https://www.pkgpulse.com/guides/threejs-vs-react-three-fiber-vs-babylonjs-3d-webgl-2026)
- [glTF Transform](https://gltf-transform.dev/)
- [Optimizing 3D Models for the Web using Draco and other tools — Axel Cuevas](https://www.axl-devhub.me/en/blog/optimizing-3d-models)
- [Reduce GLB File Size: Draco, KTX2 & Mesh Compression — Omniview3D](https://omniview3d.com/en/blog/optimize-glb-file-size-web)
- [Lenis — darkroomengineering](https://github.com/darkroomengineering/lenis)
- [ScrollTrigger with Lenis: scrollerProxy setup — GSAP forums](https://gsap.com/community/forums/topic/34814-scrolltrigger-with-lenis-smooth-scroll-problem-with-the-scrollerproxy-setup/)
- [Next.js Smooth Scrolling with Lenis & GSAP — DevDreaming](https://devdreaming.com/blogs/nextjs-smooth-scrolling-with-lenis-gsap)
- [blender-mcp — ahujasid](https://github.com/ahujasid/blender-mcp)
- [Working with glTF Files — SketchUp Help](https://help.sketchup.com/en/sketchup/working-gltf-files)
- [SketchUp glTF Exporter — Extension Warehouse](https://extensions.sketchup.com/extension/6caab93c-aa62-4637-be26-5d09ed7af997/sketchup-gltf-exporter)
- [SimLab glTF Exporter for SketchUp](https://www.simlab-soft.com/3d-plugins/GLTF_Exporter_For_Sketchup-main.aspx)
- [Building a Bilingual Arabic/English App: RTL Done Right — namla](https://namla.sa/en/resources/blogs/bilingual-arabic-english-app-rtl/)
- [Multilingual Next.js: next-intl, hreflang, and RTL — Dodecaidr](https://dodecaidr.pro/en/articles/nextjs-i18n-next-intl/)
- [Arabic RTL Typography for Web Design: 2026 Guide — Voxire](https://voxire.com/blog/arabic-rtl-typography-web-design-2026/)
