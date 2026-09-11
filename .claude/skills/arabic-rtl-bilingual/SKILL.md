---
name: arabic-rtl-bilingual
description: Arabic/English bilingual and RTL rules for the Almaghrabi site — routing, typography, logical CSS, and how RTL interacts with a WebGL scene and scroll animations. Use when adding any copy, layout, locale route, or when a section must work in both directions.
---

# Arabic / English bilingual + RTL

Arabic is the **primary** language. Almaghrabi is a Riyadh company selling to Saudi
industrial buyers, civil defence consultants and facility managers. English is the second
language, for OEM procurement and the GENEFIRE principal relationship. Build `ar` first and
treat `en` as the translation — not the other way round, or the Arabic will read like a
translation, because it will be one.

## Routing

`app/[locale]/...` with `next-intl`. Locales `ar` (default) and `en`.

```tsx
// app/[locale]/layout.tsx
export default async function Layout({ children, params }) {
  const { locale } = await params
  const dir = locale === 'ar' ? 'rtl' : 'ltr'
  return (
    <html lang={locale} dir={dir} className={locale === 'ar' ? arabicFont.variable : latinFont.variable}>
      <body>{children}</body>
    </html>
  )
}
```

`dir` on `<html>`, never on a wrapper div. Set it server-side so there is no flash of
LTR before hydration.

Emit `hreflang` for both plus `x-default`:

```html
<link rel="alternate" hreflang="ar-SA" href="https://almaghrabi-trading.com/ar" />
<link rel="alternate" hreflang="en"    href="https://almaghrabi-trading.com/en" />
<link rel="alternate" hreflang="x-default" href="https://almaghrabi-trading.com/ar" />
```

## Typography

Arabic and Latin need different type, different sizes and different line heights. Using one
font for both always shortchanges one of them.

- **Arabic**: IBM Plex Sans Arabic, Noto Kufi Arabic, or Tajawal. All have real weight ranges
  and are free. Avoid decorative Kufi for body text — it is a display face.
- **Latin**: a grotesque with tight caps — Inter, Aeonik, Suisse Intl. The GENEFIRE wordmark
  is a squared techno face; echo its geometry in headlines only, never in body copy.

Rules that matter:

```css
:root { --font-size-base: 16px; --lh: 1.55; }
[lang="ar"] {
  font-size: 1.06em;      /* Arabic needs ~5-8% more size for the same optical weight */
  line-height: 1.85;      /* ascenders/descenders and diacritics need the room */
  letter-spacing: 0;      /* NEVER letter-space Arabic — it breaks cursive joining */
}
[lang="ar"] .display { font-weight: 700; }   /* Arabic has no small-caps and no italics */
```

- **Never** apply `text-transform: uppercase` to Arabic — it does nothing, but it will hit
  any Latin brand name sitting inside the Arabic string and mangle it.
- **Never** letter-space or fake-italicize Arabic.
- Latin brand names inside Arabic sentences (GENEFIRE, ISO, CE, SGS, PX1M) stay LTR. Wrap
  them: `<bdi>GENEFIRE</bdi>` or `<span dir="ltr">SX 300</span>`. Without this, a model
  number next to Arabic punctuation renders in the wrong order.
- Numbers: use **Western Arabic numerals (0-9)** for specs. Saudi technical and commercial
  documents use them almost universally; Eastern Arabic-Indic numerals (٠-٩) look
  traditional but hurt scannability on a spec table. Be consistent site-wide.
- Units: `م³` for m³, `جم` for g, `ثانية` for seconds, `مم` for mm.

## Layout — logical properties only

Write the CSS once and let `dir` flip it. Ban physical properties from the codebase.

| Never | Always |
|---|---|
| `margin-left` | `margin-inline-start` |
| `padding-right` | `padding-inline-end` |
| `left: 0` | `inset-inline-start: 0` |
| `text-align: left` | `text-align: start` |
| `border-left` | `border-inline-start` |
| `translateX(-100%)` | see below |

Tailwind: use `ms-*`, `me-*`, `ps-*`, `pe-*`, `start-*`, `end-*`. They compile to logical
properties. `ml-4` in this repo is a bug.

**Transforms do not flip.** `translateX(-100%)` moves left in both directions. For anything
you slide in from the "start" edge:

```css
.slide-in { --dir: 1; transform: translateX(calc(var(--dir) * -100%)); }
[dir="rtl"] .slide-in { --dir: -1; }
```

Or in GSAP, read direction once and multiply:

```ts
const rtl = document.documentElement.dir === 'rtl' ? -1 : 1
gsap.from('.card', { xPercent: 60 * rtl })
```

## What flips and what does not

**Flips:** page layout, nav order, text alignment, breadcrumbs, progress bars, arrows and
chevrons that mean "next/previous", carousel direction, form field order, the horizontal
scroll rail in the Series section.

**Does not flip:** the GENEFIRE and Almaghrabi logos, product photographs, the 3D scene's
world orientation, phone numbers, email addresses, ISO/CE/SGS marks, the physical direction
a discharge nozzle points, playback controls (play is always ▶ pointing right), clock and
timer icons.

Getting this wrong reads as sloppy to an Arabic reader in exactly the way a mirrored logo
reads to an English one.

## RTL + the 3D canvas

The WebGL world is direction-agnostic — do **not** mirror the scene. A mirrored product
shows mirrored engraved text on the canister, which is worse than a layout that leans the
"wrong" way.

What does change in RTL:

- The **horizontal rail** in the Series section should track in the reading direction. Feed
  the scroll progress through a signed multiplier before it becomes camera X.
- **Camera framing offset**: if the product sits in the right third of frame while copy
  occupies the left in LTR, swap the offset in RTL so copy never lands on top of the model.

```ts
const rtl = document.documentElement.dir === 'rtl'
const heroOffsetX = rtl ? -0.32 : 0.32
```

- **Hotspot label anchors** flip: a callout that grows to the right in LTR grows to the left
  in RTL.

## Content

Every string lives in `messages/ar.json` and `messages/en.json`. No hardcoded copy in JSX,
in either language. The bilingual copy deck in `docs/04-copy-deck-ar-en.md` is the source of
truth and matches the brochure wording, which is the client's own approved language.

The brochure is already bilingual with the Arabic set below the English. On the site,
**do not stack both languages** — that was a print constraint. Serve one language per route.

## RTL surfaces bugs that LTR hides

Every one of these passed in English and failed in Arabic. None of them was a
translation problem, and none would have been found by testing one direction.

**1. `lookAt` cancelled the RTL camera offset.** The hero camera was offset along X
by a signed multiplier to put the product in the inline-start third — then aimed at
the product with `lookAt`, which rotated it straight back and re-centred the
subject. The offset was computed correctly and had no effect. In LTR the sign
happened to be positive and the error read as "the framing is a bit tight"; in RTL
it read as the product being on the wrong side. **Fix:** the look target travels
*with* the camera so the view axis stays parallel; never aim it at the subject you
are trying to push off centre.

**2. Pinned section height is locale-dependent.** Arabic renders at 1.06em with a
1.85 line height, so the same section is measurably taller. Product sections came
to 837px in Arabic against 784px in English; the hero measured 679px (ar) and
719px (en) against a 667px viewport at the compact tier. A pinned section taller
than the viewport is not untidy — it is **unreachable**, because the pin holds it
in place for its whole duration and the overflow can never be scrolled to. **Fix:**
design the small tier to real headroom, not to the line, and measure in Arabic.

**3. The progress rail swallowed the language switch, in RTL only.** The rail is
`fixed inset-y-0 end-0` — a full-height column on the inline-end edge, which is
exactly where the nav's language switch sits. As a solid hit area it intercepted
those clicks. In LTR the test clicked the *first* language link, which fell clear
of the rail and worked; in RTL the same DOM position is visually the far side, so
the click landed under the rail and never resolved. **Fix:** `pointer-events-none`
on the container, `pointer-events-auto` on the links only.

And the same class of bug in the test suite: a language-switch selector ending in
`.first()` resolved to the link for the locale **already active** in Arabic. The
click navigated `/ar → /ar` — no error, no malformed path, the assertion simply
failed. **Select by `hreflang`, by role, or by text; never by DOM order.**

### The rule

**Every interactive surface is tested in both directions.** Any selector, hit area
or overlay geometry that assumes element order is a bug waiting for Arabic — DOM
order does not change with `dir`, but visual position does, so the two agree in one
direction and disagree in the other. That is what makes these bugs survive review:
they are not wrong, they are wrong *somewhere else*.

## Checklist before shipping a section

- [ ] Loads at `/ar` with `dir="rtl"` server-rendered, no layout shift on hydration
- [ ] Zero physical CSS properties (`grep -rn "margin-left\|padding-right\|text-align: left" src/`)
- [ ] Model numbers and Latin brand names wrapped in `<bdi>` / `dir="ltr"`
- [ ] Arabic body text at ≥ 1.06em with line-height ≥ 1.8, no letter-spacing
- [ ] Scroll rail and camera offsets tested in both directions
- [ ] Arabic copy reviewed by a native speaker — machine translation of fire-safety technical
      terms is not acceptable for a civil-defence-adjacent product
