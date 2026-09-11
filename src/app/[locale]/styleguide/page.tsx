import type { Metadata } from 'next'
import { setRequestLocale } from 'next-intl/server'

import ar from '../../../../messages/ar.json'
import en from '../../../../messages/en.json'
import { brand, palette, products, high, COVERAGE_PER_GRAM_M3 } from '@/lib/products'

export const metadata: Metadata = {
  title: 'Styleguide',
  robots: { index: false, follow: false },
}

/** Ordered for the page; every value is read from assets/products.json. */
const SWATCHES: Array<{ key: string; note: string }> = [
  {
    key: 'fire_red',
    note: 'Display type, rules, the progress rail, 3D accents. Never small text on either ground.',
  },
  { key: 'deep_red', note: 'Body text on LIGHT grounds only. Unusable on the dark ground.' },
  {
    key: 'ink',
    note: 'The single dark in this design. The canvas is transparent, so this is also the scene ground and the fog colour.',
  },
  { key: 'graphite', note: 'Hairlines, borders, inactive chrome.' },
  { key: 'steel', note: 'Secondary text on dark.' },
  { key: 'gold', note: 'Small accent text on dark, the Almaghrabi mark, the focus ring.' },
  { key: 'paper', note: 'Primary text on dark, light surfaces.' },
]

/** Foregrounds that need a verdict on both grounds before anyone reaches for them. */
const MATRIX = ['fire_red', 'deep_red', 'gold', 'steel', 'paper'] as const

/* --- contrast, computed rather than asserted ------------------------------ */

/** A rich message with its tags removed — the hero headline carries <accent>. */
function plain(message: string) {
  return message.replace(/<\/?[a-z]+>/g, '')
}

function channel(v: number) {
  const c = v / 255
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

function luminance(hex: string) {
  const n = parseInt(hex.slice(1), 16)
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
}

function contrast(a: string, b: string) {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (l1 + 0.05) / (l2 + 0.05)
}

function ratio(a: string, b: string) {
  return contrast(a, b).toFixed(2)
}

function verdict(a: string, b: string) {
  const r = contrast(a, b)
  return r >= 4.5 ? 'AA body' : r >= 3 ? 'AA large only' : 'fail'
}

export default async function StyleguidePage({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main id="main" className="mx-auto max-w-5xl px-6 py-20">
      <header className="border-b border-graphite pb-8">
        <p className="eyebrow">Styleguide — not indexed, not linked</p>
        <h1 className="mt-4 text-display-md font-semibold">
          <span dir="ltr">Almaghrabi × GENEFIRE</span>
        </h1>
        <p className="mt-4 max-w-measure text-steel" dir="ltr">
          Tokens are read from <code>assets/products.json</code>. Copy is read from{' '}
          <code>messages/*.json</code>. Nothing on this page is typed by hand.
        </p>
      </header>

      {/* ------------------------------------------------------- palette --- */}
      <section className="mt-16" dir="ltr">
        <h2 className="text-display-sm font-semibold">Palette</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {SWATCHES.map(({ key, note }) => {
            const hex = palette[key]
            return (
              <div key={key} className="rounded-sm border border-graphite">
                <div className="h-24 rounded-t-sm" style={{ backgroundColor: hex }} />
                <div className="p-4">
                  <p className="font-medium">
                    {key} <span className="text-steel">{hex}</span>
                  </p>
                  <p className="mt-2 text-sm text-steel">{note}</p>
                  <p className="mt-3 text-xs text-steel">
                    on {palette.paper}: {ratio(hex, palette.paper)} ({verdict(hex, palette.paper)})
                    {' · '}on {palette.ink}: {ratio(hex, palette.ink)} ({verdict(hex, palette.ink)})
                  </p>
                </div>
              </div>
            )
          })}
        </div>

      </section>

      {/* -------------------------------------------- contrast + red policy --- */}
      <section className="mt-20" dir="ltr">
        <h2 className="text-display-sm font-semibold">Contrast matrix</h2>
        <p className="mt-3 max-w-measure text-sm text-steel">
          Measured here at render time, never asserted in prose. Most of this site is the
          dark ground, where neither red carries small text — that is the whole reason the
          policy below is narrower than WCAG.
        </p>

        <div className="mt-8 overflow-x-auto">
          <table className="w-full min-w-[30rem] border-collapse text-sm">
            <thead>
              <tr className="border-b border-graphite text-steel">
                <th className="py-3 text-start font-medium">Foreground</th>
                <th className="py-3 text-start font-medium">on paper {palette.paper}</th>
                <th className="py-3 text-start font-medium">on ink {palette.ink}</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((key) => {
                const hex = palette[key]
                return (
                  <tr key={key} className="border-b border-graphite">
                    <td className="py-3">
                      <span
                        className="me-2 inline-block h-3 w-3 align-middle"
                        style={{ backgroundColor: hex }}
                      />
                      {key}
                    </td>
                    <td className="py-3 text-steel">
                      {ratio(hex, palette.paper)} — {verdict(hex, palette.paper)}
                    </td>
                    <td className="py-3 text-steel">
                      {ratio(hex, palette.ink)} — {verdict(hex, palette.ink)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-2">
          <div className="rounded-sm p-6" style={{ backgroundColor: palette.paper }}>
            <p className="text-xs uppercase" style={{ color: palette.graphite }}>
              Light ground
            </p>
            <p className="mt-3 text-sm" style={{ color: palette.deep_red }}>
              deep_red — body text, correct
            </p>
            <p className="mt-2 text-sm" style={{ color: palette.fire_red }}>
              fire_red — not used for text here
            </p>
            <p className="mt-4 text-2xl font-semibold" style={{ color: palette.fire_red }}>
              fire_red at display size — fills, marks, rules
            </p>
          </div>

          <div className="rounded-sm p-6" style={{ backgroundColor: palette.ink }}>
            <p className="text-xs uppercase text-graphite">Dark ground</p>
            <p className="mt-3 text-sm" style={{ color: palette.deep_red }}>
              deep_red — unusable here at any size
            </p>
            <p className="mt-2 text-sm text-accent-on-dark">
              gold — the accent for small text on dark
            </p>
            <p className="display-red mt-4">fire_red — display type only</p>
          </div>
        </div>

        <div className="mt-8 max-w-measure space-y-3 text-sm text-steel">
          <p>
            <span className="text-paper">The rule.</span> Red text on a light ground is always
            deep_red. On dark, fire_red is display type only — ≥24px, or ≥18.66px bold —
            covering eyebrows, rules, the progress rail and 3D accents. Small accent text on
            dark is gold, which is the Almaghrabi mark&rsquo;s own colour rather than a
            workaround. If small red text on dark is ever genuinely required, #EA4032 measures{' '}
            {ratio('#EA4032', palette.ink)}:1 there — add it as a token then, not now.
          </p>
          <p>
            <span className="text-paper">Arabic is stricter.</span> WCAG&rsquo;s large-text
            exemption is calibrated on Latin letterforms. Arabic at the same pixel size has
            thinner strokes plus dots and diacritics that carry meaning, so a{' '}
            {ratio(palette.fire_red, palette.ink)}:1 red heading that reads in English is
            marginal in Arabic. Red is never Arabic body text, and Arabic red headings are bold
            and ≥28px — the <code>.display-red</code> utility enforces both floors. The
            brochure already works this way: red headings, black or white body.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------- type scales --- */}
      <section className="mt-20">
        <h2 className="text-display-sm font-semibold" dir="ltr">
          Type scale
        </h2>

        <div className="mt-8 grid gap-10 lg:grid-cols-2">
          <div lang="ar" dir="rtl" className="rounded-sm border border-graphite p-6">
            <p className="eyebrow">IBM Plex Sans Arabic · 1.06em · lh 1.85</p>
            <p className="display mt-4 text-display-lg font-semibold">{plain(ar.hero.h1)}</p>
            <p className="mt-4 text-display-md font-semibold">{ar.cmp.title}</p>
            <p className="mt-4 text-display-sm font-semibold">{ar.calc.title}</p>
            <p className="mt-4 text-lg">{ar.activation.line}</p>
            <p className="mt-4 text-base text-steel">{ar.activation.caption}</p>
            <p className="mt-4 text-sm text-steel">{ar.calc.rule}</p>
          </div>

          <div lang="en" dir="ltr" className="rounded-sm border border-graphite p-6">
            <p className="eyebrow">Inter · 1em · lh 1.55</p>
            <p className="display mt-4 text-display-lg font-semibold">{plain(en.hero.h1)}</p>
            <p className="mt-4 text-display-md font-semibold">{en.cmp.title}</p>
            <p className="mt-4 text-display-sm font-semibold">{en.calc.title}</p>
            <p className="mt-4 text-lg">{en.activation.line}</p>
            <p className="mt-4 text-base text-steel">{en.activation.caption}</p>
            <p className="mt-4 text-sm text-steel">{en.calc.rule}</p>
          </div>
        </div>
      </section>

      {/* ---------------------------------------- the same paragraph, both --- */}
      <section className="mt-20">
        <h2 className="text-display-sm font-semibold" dir="ltr">
          One paragraph, both languages
        </h2>
        <p className="mt-3 max-w-measure text-sm text-steel" dir="ltr">
          Same width, same weight, same optical size target. Arabic sits 6% larger with a 1.85
          line height so the two columns read as equals.
        </p>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <div lang="ar" dir="rtl" className="rounded-sm border border-graphite p-6">
            <p className="max-w-measure">{ar.hero.sub}</p>
            <p className="mt-4 max-w-measure text-steel">{ar.calc.disclaimer}</p>
            <p className="mt-4 max-w-measure">
              {ar.spec.volume}: <bdi>15 {ar.unit.m3}</bdi> · <bdi>SX 300</bdi> ·{' '}
              <bdi>300 {ar.unit.g}</bdi>
            </p>
          </div>
          <div lang="en" dir="ltr" className="rounded-sm border border-graphite p-6">
            <p className="max-w-measure">{en.hero.sub}</p>
            <p className="mt-4 max-w-measure text-steel">{en.calc.disclaimer}</p>
            <p className="mt-4 max-w-measure">
              {en.spec.volume}: 15 {en.unit.m3} · SX 300 · 300 {en.unit.g}
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------- data provenance --- */}
      <section className="mt-20" dir="ltr">
        <h2 className="text-display-sm font-semibold">Data layer</h2>
        <p className="mt-3 text-sm text-steel">
          {products.length} SKUs, coverage rule {COVERAGE_PER_GRAM_M3} m³/g, principal{' '}
          {brand.principal}.
        </p>
        <ul className="mt-6 grid gap-2 text-sm sm:grid-cols-2">
          {products.map((p) => (
            <li key={p.id} className="flex justify-between border-b border-graphite py-2">
              <span>{p.name}</span>
              <span className="text-steel">
                {high(p.agc_g)} g → {high(p.volume_m3)} m³
              </span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
