import { useTranslations } from 'next-intl'

import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ModelName, useSpecRows } from '@/components/product/SpecTable'
import { getProduct, seriesOf } from '@/lib/products'

/**
 * Section 03 — Activation. Pinned 250vh, scrub 1.
 *
 * The same switchgear room as section 02, from outside, in the inline-end half.
 * The camera opens tight on the SX 300 on its bracket, pulls back for the discharge
 * so the flood reads as filling the room, then settles (CameraRig).
 *
 * TWO STATES OF THE COPY, in one grid cell:
 *
 *   before 0.80 — the unit in the room, named, with its three figures from
 *     products.json, and a timeline of the sequence filling with the scroll. The
 *     room is 3.0 × 2.5 × 2.0 m = 15 m³, which is exactly this unit's rated volume,
 *     so the figures beside it are the figures of what the reader is watching.
 *   from 0.80 — once the discharge has happened, the haze has collapsed and the
 *     room has come back: the three claims, then the caption. Let the animation
 *     make the argument first, then name it.
 *
 * The beat thresholds mirror the scene's exactly, so the copy and the 3D can never
 * drift apart. Every word is in the DOM throughout; only opacity moves.
 */

const BEATS = [0.2, 0.35, 0.55, 0.8] as const

/** The unit that discharges here. */
const UNIT = 'sx300'

/** The figures that matter while it is going off. */
const FIGURES = ['agc', 'volume', 'time'] as const

export function Activation() {
  const t = useTranslations('activation')
  const section = useTranslations('section')
  const seriesT = useTranslations('series')

  const product = getProduct(UNIT)
  const family = seriesOf(UNIT)
  const rows = useSpecRows(product!)
  const figures = FIGURES.map((key) => rows.find((row) => row.key === key)).filter(
    (row) => row !== undefined,
  )
  // "Displaces no oxygen. Leaves no residue. Needs no piping." — one string in the
  // copy deck, three claims on screen. Split on the sentence stops, in either
  // language, so the wording stays exactly the approved wording.
  const claims = t('line')
    .split(/(?<=\.)\s+/)
    .map((claim) => claim.trim())
    .filter(Boolean)

  return (
    <PinnedSection
      id="activation"
      length="250%"
      channel="activation"
      mode="activation"
      active={UNIT}
      beats={BEATS}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-24 md:px-12 md:pt-28 lg:px-20 split:justify-center split:py-24"
    >
      <div className="relative z-10 w-full max-w-xl split:w-[calc(44vw-5rem)] split:max-w-[34rem]">
        <p className="eyebrow flex items-center gap-3" data-anim data-depth="4">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
          {section('activation')}
        </p>

        <div className="beat-stack mt-6" data-depth="8">
          {/* ---------------------------------------------- before 0.80 --- */}
          <div className="act-before">
            {family && (
              <p className="text-sm text-steel">{seriesT(`${family.id}.name` as 'px.name')}</p>
            )}
            <h2 className="display mt-1 text-display-sm font-semibold text-paper md:text-display-md">
              {product && <ModelName name={product.name} />}
            </h2>

            <dl className="mt-6 grid max-w-md grid-cols-3 gap-4">
              {figures.map((row) => (
                <div key={row.key} className="hairline flex flex-col-reverse border-t pt-3">
                  <dt className="spec-label mt-1 text-xs text-steel">{row.label}</dt>
                  <dd className="figure text-2xl font-medium text-paper md:text-3xl">
                    <bdi dir="ltr">
                      {row.value}
                      <span className="ms-1 text-sm text-steel">{row.unit}</span>
                    </bdi>
                  </dd>
                </div>
              ))}
            </dl>

            {/* The sequence, filling with the scroll: arrive, ignite, discharge,
                flood, clear. Ticks at the scene's own thresholds. Decorative. */}
            <div aria-hidden="true" className="act-timeline mt-8 max-w-md motion-reduce:hidden">
              <span className="act-timeline-fill" />
              {BEATS.map((at) => (
                <span key={at} className="act-timeline-tick" style={{ insetInlineStart: `${at * 100}%` }} />
              ))}
            </div>
          </div>

          {/* ------------------------------------------------ from 0.80 --- */}
          {/* .display-red on the list is what the reduced-motion test reads. */}
          <div className="beat beat-veiled beat-4">
            <ul className="display-red space-y-3">
              {claims.map((claim) => (
                <li key={claim} className="act-claim flex items-center gap-4">
                  <span aria-hidden="true" className="act-claim-mark">
                    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span>{claim}</span>
                </li>
              ))}
            </ul>
            <p className="mt-7 max-w-measure text-lg text-steel">{t('caption')}</p>
          </div>
        </div>
      </div>
    </PinnedSection>
  )
}
