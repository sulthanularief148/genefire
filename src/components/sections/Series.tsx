import { useTranslations } from 'next-intl'

import { GrabZone } from '@/components/scroll/GrabZone'
import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ModelName, specText } from '@/components/product/SpecTable'
import { series } from '@/lib/products'
import { SERIES_BEATS } from '@/lib/seriesStage'

/**
 * Section 04 — the three series. Pinned 300vh, scrub 1, one third per series.
 *
 * The copy column sits at the inline-start edge, as the hero's does; each series
 * stands on its own lit plinth in the inline-end half, and the camera travels
 * from plinth to plinth in the reading direction (lib/seriesStage.ts). Stacked
 * below the split breakpoint.
 *
 * Per series: its index, name and line, then the units it contains with the two
 * figures a specifier sizes by — protected volume and agent charge. The three
 * occupy one grid cell and cross-fade on data-beat; the tabs underneath say which
 * of the three is showing and how far through the section the reader is.
 *
 * Names and subtitles come from the message files, keyed by the series ids in
 * assets/products.json; every figure comes from products.json. Nothing is retyped.
 */
export function Series() {
  const t = useTranslations('series')
  const section = useTranslations('section')
  const spec = useTranslations('spec')
  const unit = useTranslations('unit')
  const total = String(series.length).padStart(2, '0')

  return (
    <PinnedSection
      id="series"
      length="300%"
      channel="series"
      mode="series"
      active={null}
      beats={SERIES_BEATS}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-20 md:px-12 md:pt-28 lg:px-20 split:justify-center split:py-24"
    >
      {/* Turn the plinth that is showing. It springs back to face the reader. */}
      <GrabZone
        target="series"
        className="bottom-[4%] end-0 start-0 top-[55%] split:bottom-[12%] split:start-[46%] split:top-[18%]"
      />

      <div className="relative z-10 w-full max-w-2xl split:w-[calc(46vw-5rem)] split:max-w-[36rem]">
        <p className="eyebrow flex items-center gap-3" data-anim data-depth="4">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
          {section('series')}
        </p>

        {/* The three series occupy one grid cell and cross-fade; see .beat-stack.
            data-depth: pointer drift, see PointerParallax. */}
        <div className="beat-stack mt-5 md:mt-7" data-depth="9">
          {series.map((s, i) => (
            <article
              key={s.id}
              className={`beat beat-veiled beat-${i} series-card`}
              aria-labelledby={`series-${s.id}`}
              data-anim
            >
              <p className="figure text-sm text-gold" aria-hidden="true">
                <bdi dir="ltr">
                  {String(i + 1).padStart(2, '0')}
                  <span className="text-steel"> / {total}</span>
                </bdi>
              </p>
              <h2
                id={`series-${s.id}`}
                className="display mt-2 text-display-sm font-semibold text-paper md:text-display-md split:text-display-sm xl:text-display-md"
              >
                {t(`${s.id}.name` as 'px.name')}
              </h2>
              <p className="mt-3 max-w-measure text-base text-steel md:text-lg">
                {t(`${s.id}.sub` as 'px.sub')}
              </p>

              {/* Compact: the model names only. The table does not fit above a
                  plinth on a phone, and a pinned section taller than the screen
                  is unreachable for the whole of its pin. */}
              <p className="mt-4 text-sm text-steel md:hidden">
                {s.products.map((p, j) => (
                  <span key={p.id}>
                    {j > 0 && <span aria-hidden="true"> · </span>}
                    <ModelName name={p.name} />
                  </span>
                ))}
              </p>

              <table className="series-table mt-6 hidden w-full max-w-md text-start md:table">
                <thead>
                  <tr className="hairline border-b">
                    <th scope="col" className="spec-label pb-2 text-start font-mono text-[0.6875rem] font-normal uppercase tracking-[0.12em] text-steel">
                      <span className="sr-only">{section('products')}</span>
                    </th>
                    <th scope="col" className="spec-label pb-2 text-end font-mono text-[0.6875rem] font-normal uppercase tracking-[0.12em] text-steel">
                      {spec('volume')}
                    </th>
                    <th scope="col" className="spec-label pb-2 text-end font-mono text-[0.6875rem] font-normal uppercase tracking-[0.12em] text-steel">
                      {spec('agc')}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {s.products.map((p) => (
                    <tr key={p.id} className="series-row hairline border-b">
                      <th scope="row" className="py-2.5 text-start text-sm font-semibold text-paper">
                        <ModelName name={p.name} />
                      </th>
                      <td className="figure py-2.5 text-end text-sm text-paper">
                        <bdi dir="ltr">
                          {specText(p.volume_m3)} <span className="text-steel">{unit('m3')}</span>
                        </bdi>
                      </td>
                      <td className="figure py-2.5 text-end text-sm text-paper">
                        <bdi dir="ltr">
                          {specText(p.agc_g)} <span className="text-steel">{unit('g')}</span>
                        </bdi>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </article>
          ))}
        </div>

        {/* Which series is showing, and how far through the three the reader is.
            Decorative: the headings above already say it. */}
        <ol aria-hidden="true" className="series-tabs mt-8 grid max-w-md grid-cols-3 gap-3 motion-reduce:hidden md:mt-10">
          {series.map((s, i) => (
            <li key={s.id} className="series-tab" data-i={i}>
              <span className="series-tab-track block h-px w-full bg-steel/25">
                <span className="series-tab-bar block h-full w-full bg-gold" />
              </span>
              <span className="mt-2 block truncate text-xs text-steel">
                {t(`${s.id}.name` as 'px.name')}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </PinnedSection>
  )
}
