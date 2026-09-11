# Almaghrabi × GENEFIRE — web kit

Everything needed to build the Almaghrabi 3D marketing site with Claude Code: verified
product data, web-ready 3D models, extracted product art, agent skills, and a phased build
prompt.

## Start here

1. `docs/01-business-analysis.md` — who the client is and what the site has to do
2. `docs/03-site-structure-spec.md` — the section-by-section scroll plan
3. `docs/05-master-build-prompt.md` — **paste Phase 1 into Claude Code**

Drop this whole folder into an empty project directory. `CLAUDE.md` and `.claude/skills/`
are picked up automatically.

## What's inside

```
CLAUDE.md                        project context Claude reads on every turn
.claude/skills/                  9 skills — the conventions this project enforces
  genefire-product-data/         the catalogue, the coverage rule, the two spec errors
  glb-gltf-pipeline/             .glb conventions, compression, validation, R3F loading
  r3f-scene-architecture/        one-canvas architecture, lighting, budgets, mobile
  scroll-choreography/           Lenis + GSAP ScrollTrigger, section grammar, scroll plan
  shaders-postfx/                aerosol discharge, heat haze, embers, post stack
  arabic-rtl-bilingual/          routing, typography, logical CSS, RTL + WebGL
  blender-authoring/             modelling, Blender MCP setup, materials, export
  sketchup-to-web3d/             .skp → .glb for environment scenes
  ai-video-assets/               when to use video, prompting, encoding, budgets
assets/
  products.json                  ← single source of truth for every spec
  products/<id>.glb              11 parametric models, exact published dimensions, 256 KB total
  products/<id>_views/           front · side · top · hero renders + dimensioned blueprint SVG
  photos/<id>.png                background-removed product photography from the brochure
  brand/                         source brochure pages, family hero reference
messages/ar.json, en.json        every string; ar/en parity enforced by npm run check:messages
docs/                            business analysis, research, site spec, copy deck, build prompt
```

## The 3D models

Eleven `.glb` files built parametrically from the published dimensions. Metres, +Y up, origin
at base centre, PBR materials named `GF_*`. Their body length matches the printed spec to
within 0.1 mm in every case.

They are **placeholders with correct proportions** — camera framing, layout and scroll timing
developed against them stay valid when real CAD or scan data arrives. Keep the node names when
swapping and nothing in the scene graph changes.

## Two things that block launch

`products.json` carries **corrected** values for two brochure figures that do not reconcile
with the 0.05 m³/g rule the other nine SKUs follow exactly:

- **SX 100** printed as 50 m³ → should be **5 m³**
- **SX 500** printed as AGC 300 g → should be **500 g**

Both need written confirmation from GENEFIRE before the site publishes. Detail in
`docs/01-business-analysis.md` and `.claude/skills/genefire-product-data/SKILL.md`.
