---
name: genefire-product-data
description: The authoritative GENEFIRE product catalogue for the Almaghrabi site — every SKU, its verified specs, the coverage rule, and the two brochure figures that do not reconcile. Use whenever a product spec, name, figure or the coverage calculator is touched.
---

# GENEFIRE product data

`assets/products.json` is the **single source of truth**. Never retype a spec into JSX. Import
it, or generate types from it. If a figure on screen disagrees with that file, the file wins
and the component is a bug.

## The catalogue

| id | Model | Series | AGC (g) | Total (g) | Volume (m³) | Discharge (s) | L × ⌀ (mm) | Finish |
|---|---|---|---|---|---|---|---|---|
| `px1m` | PX1M | PX Series | 100 | 200 | 5 | 50 | 200 × 35 | red_anodized |
| `px1e` | PX1E | PX Series | 100 | 360 | 5 | 50 | 340 × 32 | red_anodized |
| `px5` | PX 5 | PX Series | 500 | 1340 | 25 | 40 | 300 × 160 | red_polymer |
| `sx5_10` | SX 5/10 | Small-Scale Series | 5 / 10 | 52 / 57 | 0.25 / 0.5 | 10 / 15 | 115 × 19 | red_anodized |
| `sx25` | SX 25 | Small-Scale Series | 25 | 72 | 1.25 | 14 | 132 × 32 | red_anodized |
| `sx50` | SX 50 | Small-Scale Series | 50 | 113 | 2.5 | 27 | 162 × 32 | red_anodized |
| `sx100` | SX 100 | Small-Scale Series | 100 | 425 | 5 | 50 | 227 × 32 | red_anodized |
| `sx300` | SX 300 | Industrial Series | 300 | 825 | 15 | 24 | 183 × 94 | stainless |
| `sx500` | SX 500 | Industrial Series | 500 | 1025 | 25 | 35 | 215 × 94 | stainless |
| `sx750` | SX 750 | Industrial Series | 750 | 1265 | 37.5 | 48 | 245 × 94 | stainless |
| `sx1500` | SX 1500 | Industrial Series | 1500 | 2630 | 75 | 35 | 215 × 180 | stainless |

## The coverage rule — verified across all 11 SKUs

**100 g of AGC agent protects exactly 5 m³.** Equivalently `volume_m3 = agc_g × 0.05`.

This holds for every product in the range with no exceptions, which makes it safe to build
the coverage calculator on:

```ts
const requiredAgcGrams = (roomVolumeM3: number) => roomVolumeM3 / 0.05
const recommend = (volume: number) =>
  ALL_PRODUCTS.filter(p => p.volume_m3 >= volume).sort((a,b) => a.volume_m3 - b.volume_m3)[0]
```

Present the calculator as **indicative sizing, not a design**. Real aerosol system design
accounts for enclosure leakage, obstruction, agent density derating and the local civil
defence standard. Put that qualifier next to the result in both languages, and route the
user to a contact form rather than implying the number is a specification.

## Two brochure figures that do not reconcile — flag before publishing

Both were found by applying the 0.05 m³/g rule that every other SKU obeys:

1. **SX 100 — printed VOLUME 50 m³.** 100 g × 0.05 = **5 m³**. A 227 × 32 mm tube cannot
   flood 50 m³; that would make it more capable than the SX 1500, which is 15× the agent
   mass. Near-certain decimal-point typo in the brochure.

2. **SX 500 — printed AGC 300 g.** Its stated 25 m³ coverage implies **500 g**, which also
   matches the model name and sits correctly between SX 300 (300 g) and SX 750 (750 g). The
   printed 300 g appears to be copy-paste from the SX 300 row above it.

`products.json` carries the **corrected** values with a `brochure_typo` note on each. Confirm
both with GENEFIRE in writing before the site goes live. Publishing a wrong coverage figure
for a life-safety product is not a cosmetic error.

## Naming

Render model names exactly as printed: `PX1M`, `PX1E`, `PX 5`, `SX 5/10`, `SX 25`, `SX 50`,
`SX 100`, `SX 300`, `SX 500`, `SX 750`, `SX 1500`. Note the space in `PX 5` and the SX
models, and no space in `PX1M`/`PX1E`. In Arabic text, wrap them in `<bdi>` or
`dir="ltr"` so the digits do not reorder.

Series names, English and Arabic, are in `products.json` under `series[].name_en` /
`name_ar`. Use those, not paraphrases.

## Assets per product

```
assets/products/<id>.glb                    parametric model, exact published dimensions
assets/products/<id>_views/<id>_front.png   orthographic render, transparent
assets/products/<id>_views/<id>_side.png
assets/products/<id>_views/<id>_top.png
assets/products/<id>_views/<id>_hero.png    three-quarter, use as no-WebGL fallback
assets/products/<id>_views/<id>_blueprint.svg  dimensioned 3-view, for the modeller
assets/photos/<id>.png                      background-removed brochure photograph
```

The `.glb` files are **parametric placeholders**: correct dimensions, correct materials,
simplified form. They are built so that camera framing, layout and scroll timing developed
against them stay valid when real CAD or scan data replaces them. Keep the node names when
swapping.

## Claims — do not invent, do not soften

The advantages, eco claims, key features and fire classes in `products.json` are transcribed
from the client's own brochure. Use them verbatim in both languages.

Do not add claims the brochure does not make (no "UL listed", no "NFPA 2010 compliant", no
efficacy percentages, no response-time figures beyond the printed discharge times). Do not
invent certification marks. This is life-safety equipment sold into a regulated market; every
claim on the site must trace to something the client has approved.

Fire classes: **A, B, C, E** in the class panel; the footer strip additionally shows **F**.
Reproduce what the brochure shows and let the client resolve the difference.
