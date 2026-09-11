# 03 — Site structure & scroll specification

One route per language: `/ar` (default) and `/en`. Single continuous scroll page plus three
sub-routes. One persistent `<Canvas>` behind everything.

---

## Section 00 · Preloader
**No pin · ~2 s max**

Gold Almaghrabi mark draws on stroke-by-stroke while assets load. Percentage in the corner.
The loader's real job is **shader warm-up** — render one off-screen frame of every material
here so the first scroll has no compile stall.

Exit: mark shrinks to nav position, curtain lifts.

---

## Section 01 · Hero
**Pinned · 200 vh · scrub 1**

- **Open:** a single unit, large, on a grounded plane under a warm key and a cool rim. Slow
  turn. Fine aerosol particles drift.
  - **AMENDED — the opening unit is the SX 100, not the SX 300.** A/B'd as built frames, not
    argued: a stainless canister on a charcoal ground has almost no separation from it, while
    red anodized under gold type reads as fire safety before a word is read. The SX 100 is a
    32 x 200 mm rod, so it also keeps the form unfamiliar — a PX 5 in this slot would look like
    a conventional extinguisher and give the argument away. `src/lib/heroSubject.ts`.
  - The ground is no longer a flat void: a viewport-fixed vertical gradient with an ember lift,
    a vignette, and scene fog at `#0E0F11`.
- **Scroll:** camera pulls back. The one unit resolves into **all eleven**, arranged on a
  shallow arc — the range revealing itself as scale.
- **Copy (DOM, over canvas):**
  - Eyebrow: *الوكيل المعتمد في المملكة العربية السعودية* / AUTHORIZED AGENT IN SAUDI ARABIA
  - H1: *حيث يلتقي الابتكار بالسلامة من الحرائق* / WHERE INNOVATION MEETS FIRE SAFETY
  - Sub: one line on condensed aerosol
  - CTA: *احسب احتياجك* / Size your enclosure → jumps to §06
- **RTL:** product sits in the inline-start third; copy in the inline-end two-thirds. Mirror
  the camera X offset, never the model.

---

## Section 02 · The problem
**Pinned · 150 vh · scrub 1**

No product. Build the stake.

Camera pushes into a dark server rack / switchgear cabinet. Heat-haze `uStrength` ramps
0 → 0.014. Ember particles rise. Rack LEDs flicker and start dropping out. Colour drifts warm.

**Copy:** three short statements, one per third — the enclosure, the ignition source, what a
sprinkler or a gas system cannot do here. Kept to about eight words each.

This section earns the next one. Without it, the discharge is a special effect; with it, it is
an answer.

---

## Section 03 · Activation — the centrepiece
**Pinned · 250 vh · scrub 1**

The single moment that justifies the entire WebGL budget.

| progress | beat |
|---|---|
| 0.00–0.20 | SX 300 slides into frame on its bracket, mounted inside the cabinet |
| 0.20–0.35 | Thermal cord glows. Bloom begins to lift. |
| 0.35–0.55 | **Discharge.** 12 000 additive particles flood outward and upward. Bloom spikes to 0.9 for ~200 ms. |
| 0.55–0.80 | Aerosol fills the volume, not a jet. Heat haze collapses to 0. Embers die. |
| 0.80–1.00 | LEDs return cyan. Aerosol clears. The unit sits there, unremarkable. |

**Copy appears only after 0.80**, one line: *لا يزيح الأكسجين. لا يترك بقايا. لا يحتاج إلى
أنابيب.* / *Displaces no oxygen. Leaves no residue. Needs no piping.*

The restraint is the point — let the animation make the argument, then name it.

**Reduced motion:** show the final frame and the copy immediately.

---

## Section 04 · Three series
**Pinned · 300 vh · scrub 1 · horizontal**

Camera tracks sideways along a rail past three stages. Each series' models rise from the floor
as it centres and settle as it leaves.

1. **PX Series** — *تشغيل يدوي وحماية فورية* / Manual activation, instant protection
2. **Small-Scale Series** — *حماية مرنة وقابلة للتوسع للوحات والخزائن الكهربائية* / Scalable protection for electrical cabinets & enclosures
3. **Industrial Series** — *أنظمة إطفاء من الفولاذ المقاوم للصدأ للمساحات الكبيرة* / Stainless-steel fire protection for large enclosures

Each stage shows its members at **true relative scale** — SX 5/10 next to SX 1500 is a
genuinely useful image.

**RTL:** the rail tracks in the reading direction. Feed scroll progress through a signed
multiplier before it becomes camera X.

---

## Section 05 · Product detail ×11
**Pinned · 180 vh each · scrub 1**

One pin per SKU, entered from §04 or from the nav. Grammar identical each time so it becomes
legible rather than repetitive:

- **0.00–0.30** — product flies to centre, turntable starts, model name masks up
- **0.30–0.55** — spec figures count up from zero: AGC, total mass, volume, discharge time,
  dimensions. All from `products.json`.
- **0.55–0.80** — **exploded view.** Parts separate along the axis, thin cyan leader lines to
  labelled hotspots (actuator, AGC charge, aerosol outlet, bracket).
- **0.80–1.00** — reassemble, recede, next product's colour bleeds in

Sticky sub-nav rail with all eleven models, current one marked. Everything on screen also
exists as real DOM text.

---

## Section 06 · Coverage calculator — the conversion point
**Not pinned · auto height**

The one interactive verb on the site.

Inputs: enclosure length × width × height (or volume directly), plus application type.
Output: a live 3D room in the canvas that **grows and shrinks with the numbers**, with the
recommended unit shown at correct relative scale inside it.

```ts
const requiredAgcGrams = (volumeM3: number) => volumeM3 / 0.05   // 100 g ⇒ 5 m³, verified across all 11 SKUs
```

Show the recommended SKU, the next size up, and how many units for volumes past 75 m³.

**Required qualifier, both languages, adjacent to the result:** indicative sizing only; final
design must account for enclosure leakage, obstruction and the applicable civil defence
standard. CTA into the contact form with the inputs pre-filled.

---

## Section 07 · Applications
**Pinned · 220 vh · scrub 1**

Six environments on a slowly rotating drum: **Military · Industry · Power · Railway · Data
Centres · Laboratory** (المعدات العسكرية · الصناعة · الطاقة · السكك الحديدية · مراكز البيانات · المختبرات).

Each is a low-poly SketchUp-sourced scene, heavily fogged, desaturated, with the relevant
GENEFIRE unit highlighted in place at true scale. Instanced — dozens of identical units, one
draw call.

The environments are the stage. If a room competes with the product, lower its albedo rather
than brightening the product.

---

## Section 08 · Why aerosol
**Not pinned · auto height · DOM only**

Comparison table against FM-200/Novec, CO₂ and sprinkler. Deliberately flat and quiet — the
eye needs to rest, and a technical buyer needs somewhere to actually read.

Columns: occupied-space safe · piping required · installed cost · residue · GWP · space
required · retrofits into an existing cabinet.

The retrofit row is the argument. Let it be the last row.

---

## Section 09 · Certifications & trust
**Not pinned · auto height**

ISO · SGS · CE · Eco-Friendly · fire classes A B C E (F per the footer strip — resolve with
client). Client-supplied artwork only; never reconstructed from a brochure scan. Link real
certificates as PDFs.

Almaghrabi's agency status stated plainly, with the GENEFIRE relationship named.

---

## Section 10 · Contact
**Not pinned · auto height**

Canvas fades to a still. Foreground returns to the page.

Form: name · company · phone · application type · enclosure volume (pre-filled from §06) ·
message. Both phone numbers as `tel:` links, email as `mailto:`. Map or written directions to
Othman Bin Affan Road, Al Nuzha.

Arabic and English labels never appear together — one language per route.

---

## Sub-routes

- `/[locale]/products/[id]` — full spec sheet per SKU, static, indexable, works with WebGL off.
  This is what ranks in search and what a consultant emails to a colleague.
- `/[locale]/applications/[sector]` — one page per sector with the case for that environment.
- `/[locale]/about` — company, agency status, why aerosol.

---

## Persistent chrome

- **Progress rail** down the inline-end edge, section names on hover. At ~40 screens of
  scroll depth this is not optional.
- **Nav**: Almaghrabi mark · Products · Applications · Coverage · Contact · **AR / EN**
- **Language switch preserves the current section anchor.**
- **Skip-to-content** as the first focusable element.

---

## Responsive

| | |
|---|---|
| ≥ 1280 | Full experience. All pins, all post-processing, 12 000 particles. |
| 768–1279 | All pins, pinned distances cut ~30 %, post-processing minus chromatic aberration. |
| < 768 | Pins reduced to §01, §03 and §04. Others become simple reveals. No post-processing. `dpr [1, 1.5]`. 4 000 particles. Shadows off, baked contact shadow instead. |
| Reduced motion | No pins, no Lenis, no scrub. Static final framings, opacity fades only. Fully readable. |
| No WebGL | `<canvas>` replaced by `<id>_hero.png` stills. Every section still works. |

---

## Accessibility, non-negotiable

- Every headline, spec figure and product name is real DOM text inside its section.
- Focus order never enters the canvas; `<canvas aria-hidden="true">`.
- Pinned sections keep their content in the accessibility tree and findable by Ctrl+F.
- Contrast ≥ 4.5:1 for body text. `#E1251B` on `#0E0F11` passes; `#E1251B` on white does not
  at small sizes — use `#B01712` for red text on light grounds.
- The calculator is fully keyboard-operable and gives its result as text, not only as 3D.
