# Launch checklist — blocked on the client

Started during phase 5. Phase 6 extends it with the optimisation and shipping items.

Nothing on this list is a bug. Each entry is something the site cannot resolve on its own
because it needs the client's own material, or a decision only they can make.

## Blocking — must be resolved in writing before publication

- [ ] **SX 100 protected volume.** The printed sheet reads 50 m³. The 0.05 m³/g rule that holds
      across every other SKU gives **5 m³**, and a 227 × 32 mm tube cannot flood 50 m³ — that
      would make it more capable than the SX 1500, which carries fifteen times the agent.
      `assets/products.json` carries the corrected 5 m³. **GENEFIRE must confirm.**
- [ ] **SX 500 agent mass.** The printed sheet reads 300 g. The stated 25 m³ coverage implies
      **500 g**, which also matches the model name and sits correctly between the SX 300 and the
      SX 750. The printed 300 g looks like a copy-paste from the SX 300 row above it.
      `assets/products.json` carries the corrected 500 g. **GENEFIRE must confirm.**

Publishing a wrong coverage figure for a life-safety product is not a cosmetic error. Both
figures are surfaced in the review banner on every non-production build so they cannot be
forgotten.

## Content and artwork the client owns

- [ ] **Certification artwork and the certificates themselves** — ISO, SGS, CE, Eco-Friendly,
      Green Product. Section 09 ships as clearly labelled empty slots. Nothing is reconstructed,
      traced or approximated from the brochure scan: a certification mark drawn by us is a
      fabricated certification.
- [ ] **Fire class F.** The brochure footer strip shows A, B, C, E **and F**; the class panel
      shows A, B, C, E. Both are reproduced as printed. The client resolves the difference.
- [ ] **The Almaghrabi mark.** No logo artwork has been supplied. The favicon
      (`src/app/icon.svg`) is a neutral geometric placeholder in the brand palette, not an
      attempt at the real mark.
- [ ] **Native Saudi technical review of all Arabic copy.** Machine translation of fire-safety
      terminology is not acceptable for a civil-defence-adjacent product. This includes the four
      exploded-view hotspot labels and the certification section, which were written for this
      build rather than taken from the brochure.

## The About section

Written only from sources the client owns or GENEFIRE publishes — see `src/lib/network.ts`.
Each item below needs the client's written confirmation before publication.

- [ ] **almaghrabi-trading.com is not a source.** As of September 2026 the live site is an
      unfinished template for an unrelated partnership-brokerage business ("BridgeX"): lorem
      ipsum about text, `+456456` and `info@website.com` as contacts, placeholder social links,
      two legal consultants as the team, and template statistics — "600+ trusted companies",
      "98% customer satisfaction", "24/7 technical support", "pioneers since 2010". **None of it
      is used here.** If any of those figures is genuinely Almaghrabi's, the client supplies it
      in writing with its basis, and it is added then.
- [ ] **GENEFIRE, Taiwan, "Manufacturer".** GENEFIRE's own site titles itself with Taiwan and
      describes the company as manufacturing its systems; genefire.com was showing a
      maintenance page when this was written. The globe marks the island's centre, not a city.
      **Client to confirm the country and the wording.**
- [ ] **GeneFire India, "Regional presence".** Taken from GENEFIRE's India account,
      instagram.com/genefireindia. No city is published; the globe marks the country's centre.
      Its India phone numbers and email are deliberately NOT on this site — it is Almaghrabi's
      lead-generation site for Saudi buyers. **Client to confirm they want India shown at all.**
- [ ] **The arcs on the globe** run from GENEFIRE to India and from GENEFIRE to Riyadh. They
      say "represented here" — not a supply route, not exclusivity, and not any relationship
      between Almaghrabi and GeneFire India.
- [ ] **"Authorized agent", not "sole" or "exclusive".** The brochure says authorized agent.
      The copy never claims exclusivity; do not add it without the agency agreement.
- [ ] **Native Arabic review of `about.*`** in `messages/ar.json`. The GENEFIRE paragraph is the
      brochure's own Arabic, verbatim; the lead, the network line and the node roles were
      written for this build.

## Technical sign-off

- [ ] **The comparison table in section 08.** The condensed-aerosol column is taken from the
      GENEFIRE brochure. The other three columns describe system CATEGORIES — halocarbon clean
      agent, inert gas, water sprinkler — and are not GENEFIRE claims. `cmp.note` says exactly
      that, visibly, in both languages.

      The categories are deliberately named instead of the products. FM-200 and Novec are
      trademarks, and an unsourced comparative claim against a named competitor product in a
      regulated life-safety market carries materially more exposure than a category claim. **If
      the client's technical people approve specific product names in writing, the column
      headers can be renamed** — `cmp.col.*` in `messages/`, nothing else changes.

## Assets that replace placeholders

- [ ] **Real product CAD or 3D scans.** The eleven `.glb` files are parametric placeholders
      carrying the correct published dimensions. Camera framing, layout and scroll timing were
      built against them and stay valid when the real geometry arrives — keep the node names.
- [ ] **Real SketchUp environments for section 07.** The six application scenes are blocked out
      from primitives. Their enclosure volumes are solved from `products.json` so that each one
      exactly matches the rated volume of the unit installed in it; real geometry must preserve
      that, or the coverage story in section 06 stops reconciling.
- [ ] **Application photography, or approved AI b-roll.**
- [ ] **A studio HDR**, if the environment is ever to be lit from a real capture. The scene
      currently uses a `<Lightformer>` rig baked to a 256 px PMREM, which costs zero network
      bytes and holds up to roughly roughness 0.2.

## Before the site goes live

- [ ] A contact form endpoint. Until one exists the form in section 10 composes the enquiry
      as an email to the brochure address (info@almaghrabi-trading.com) and opens the reader's
      mail app with it written — stated as exactly that under the Send button. It never
      pretends to have sent. Replacing it is a change to onSubmit in Contact.tsx only.
      **Client to confirm that inbox is monitored.**
- [ ] Confirm the production domain and the `metadataBase` in `app/[locale]/layout.tsx`.
