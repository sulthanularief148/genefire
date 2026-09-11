# 01 — Business analysis: Almaghrabi × GENEFIRE

*Derived from the two brochure pages supplied by the client (`assets/brand/brochure_page1.jpg`,
`brochure_page2.jpg`). Every figure below traces to those sheets.*

## The company

**ALMAGHRABI for Trading Services** — المغربي للخدمات التجارية — is a Riyadh-based trading
company operating as the **authorized agent in Saudi Arabia** for GENEFIRE.

- Riyadh, Othman Bin Affan Road, Al Nuzha District
- 0548618668 · 0548281779 · info@almaghrabi-trading.com
- Identity: a gold Arabic calligraphic mark (المغربي) over a Latin wordmark, with the
  descriptor "FOR TRADING SERVICES / للخدمات التجارية"

Two mobile numbers and a single-brand brochure indicate a lean, relationship-led agency
business — likely a small team selling into projects rather than a distributor with a
warehouse and a catalogue. That shapes the site: it needs to make a small company look like a
credible long-term partner, and it needs to generate qualified enquiries, not e-commerce
transactions.

## What they sell

GENEFIRE **aerosol fire suppression systems** — condensed aerosol generators. A solid
aerosol-forming compound (AGC) is triggered electrically or thermally and floods an enclosure
with an ultra-fine potassium-salt aerosol that interrupts the combustion chain chemically
rather than by smothering or cooling.

Why that matters commercially, and why it should shape the site's argument:

- **It does not displace oxygen.** Unlike CO₂ and inert-gas systems, it can be used in
  occupied spaces. This is the single strongest differentiator and the brochure leads with it.
- **No pressurised cylinders, no piping, no nozzles, no manifolds.** Installation is a
  bracket and a wire. Against an FM-200 or Novec system, the installed-cost difference is
  large and it is the argument that wins over a facilities budget.
- **No residue, no thermal shock.** Safe around energised electronics.
- **Zero ODP, zero GWP, zero atmospheric lifetime.** Positions cleanly against HFC agents
  facing phase-down pressure.
- **Compact.** An SX 100 protecting 5 m³ is a 227 mm tube. That is a form factor that fits
  inside the cabinet it protects.

The buyer's real question is not "is fire bad" — it is *"why this instead of the gas system
my consultant already specified?"* The site should answer that directly.

## Product range — 11 SKUs, three series

The whole range obeys one clean rule: **100 g of agent protects 5 m³** (0.05 m³/g), with no
exceptions. That rule is a gift for the site — it makes an interactive coverage calculator
both trivially implementable and genuinely useful.

### PX Series — manual activation, instant protection
Handheld/manual units. The consumer-facing end of the range.

| Model | AGC | Total | Volume | Discharge | Size |
|---|---|---|---|---|---|
| PX1M | 100 g | 200 g | 5 m³ | 50 s | 200 × 35 mm |
| PX1E | 100 g | 360 g | 5 m³ | 50 s | 340 × 32 mm |
| PX 5 | 500 g | 1340 g | 25 m³ | 40 s | 300 × 160 mm |

PX 5 is the only unit shaped like a conventional extinguisher — red polymer body, moulded
handle. It is the range's most photogenic object and the natural hero for the "you already
know what this is, but it works differently" beat.

### Small-Scale Series — electrical cabinets & enclosures
Red anodized aluminium. Mounted *inside* the thing they protect.

| Model | AGC | Total | Volume | Discharge | Size |
|---|---|---|---|---|---|
| SX 5/10 | 5 / 10 g | 52 / 57 g | 0.25 / 0.5 m³ | 10 / 15 s | 115 × 19 mm |
| SX 25 | 25 g | 72 g | 1.25 m³ | 14 s | 132 × 32 mm |
| SX 50 | 50 g | 113 g | 2.5 m³ | 27 s | 162 × 32 mm |
| SX 100 | 100 g | 425 g | **5 m³** ⚠ | 50 s | 227 × 32 mm |

Commercially this is probably the volume line — every electrical panel, every UPS cabinet,
every control enclosure in a facility is a unit. SX 5/10 is a flat 19 mm bar, small enough
to sit inside a DIN enclosure.

### Industrial Series — stainless steel, large enclosures
Stainless canisters on steel brackets. CNC enclosures, transformer rooms, engine bays.

| Model | AGC | Total | Volume | Discharge | Size |
|---|---|---|---|---|---|
| SX 300 | 300 g | 825 g | 15 m³ | 24 s | 183 × 94 mm |
| SX 500 | **500 g** ⚠ | 1025 g | 25 m³ | 35 s | 215 × 94 mm |
| SX 750 | 750 g | 1265 g | 37.5 m³ | 48 s | 245 × 94 mm |
| SX 1500 | 1500 g | 2630 g | 75 m³ | 35 s | 215 × 180 mm |

## ⚠ Two figures in the brochure do not reconcile

Both were caught by applying the 0.05 m³/g rule that the other nine SKUs follow exactly.

1. **SX 100 is printed as VOLUME 50 m³.** At the range rule, 100 g gives **5 m³**. A 227 mm
   tube cannot flood 50 m³ — that would make it two-thirds as capable as the SX 1500 while
   carrying one-fifteenth of the agent. Decimal-point typo.

2. **SX 500 is printed as AGC 300 g.** Its 25 m³ coverage implies **500 g**, which also matches
   the model name and interpolates correctly between SX 300 and SX 750. Looks like a
   copy-paste from the row above.

**Recommendation:** get both confirmed in writing by GENEFIRE before the site publishes, and
tell the client the print brochure needs a corrected reprint. For a life-safety product sold
into a regulated market, a wrong coverage figure is a liability, not a typo. The corrected
values are what `assets/products.json` carries.

## Claims the brochure makes

**Advantages:** Low cost · Non-damaging · Convenient · Eco-friendly · Cooler aerosol ·
Efficient · Versatile · Safe

**Environmental:** Zero ozone depletion potential · Zero global warming potential · Zero
atmospheric life · Does not displace oxygen · Does not emit toxic substances · Safe for humans

**Fire classes:** A (ordinary combustibles) · B (flammable liquids) · C (flammable gases) ·
E (electrical equipment). The footer strip also shows **F** — worth resolving with the client.

**Applications:** Military · Industry · Power · Railway · Data centres · Laboratory

**Marks shown:** ISO · SGS · CE · Eco-Friendly · a green product mark. Obtain the actual
certificates and the approved artwork before reproducing any of these. Do not recreate a
certification mark from the brochure scan.

## Competitive position

| | GENEFIRE aerosol | FM-200 / Novec | CO₂ | Sprinkler |
|---|---|---|---|---|
| Occupied-space safe | ✅ | ✅ | ❌ | ✅ |
| Piping and nozzles | none | required | required | required |
| Installed cost | low | high | medium | medium |
| Residue | negligible | none | none | water damage |
| GWP | 0 | high (HFC) / low (FK) | 1 | 0 |
| Space required | inside the enclosure | plant room | cylinder bank | riser |
| Retrofit into an existing cabinet | ✅ | ❌ | ❌ | ❌ |

The retrofit row is the wedge. Almaghrabi's realistic near-term business is protecting
equipment that is **already installed** and was never given fire suppression — panels,
UPS rooms, CNC enclosures, rail traction converters. A gas system cannot go there. This
should be the site's primary narrative.

## What the site has to accomplish

1. **Establish credibility fast.** A small agency selling life-safety equipment is competing
   against multinational brand recognition. Production value is the proxy for seriousness —
   that is the real justification for the WebGL budget, not novelty.
2. **Explain condensed aerosol in about eight seconds.** Most visitors have never seen one.
   The discharge sequence is the explanation, not decoration.
3. **Make the range navigable.** Eleven SKUs across three series is confusing as a table and
   obvious as a coverage-driven selector.
4. **Generate qualified enquiries.** The conversion is "tell us your enclosure volume and
   application" — not a cart. The coverage calculator is the lead-gen mechanism.
5. **Work in Arabic first**, on a mid-range Android phone, possibly on site.

## Risks to name up front

- **Claim discipline.** Everything on the site must trace to client-approved material.
- **The two spec errors.** Resolve before launch.
- **Certification artwork.** Needs to come from the client, not from a brochure scan.
- **Scroll depth.** The planned experience is ~40 screens. Without a persistent progress rail
  and a jump nav, most visitors never reach the contact form.
- **Arabic copy quality.** Machine-translated fire-safety terminology will be spotted
  immediately by exactly the audience that matters. Budget for a native technical reviewer.
