import type { ReactNode } from 'react'
import { useTranslations } from 'next-intl'

import { GrabZone } from '@/components/scroll/GrabZone'
import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ModelName, useSpecRows } from '@/components/product/SpecTable'
import { HERO_BEATS } from '@/lib/heroStage'
import { HERO_SUBJECT } from '@/lib/heroSubject'
import { getProduct, seriesOf } from '@/lib/products'

/** A Latin brand name inside Arabic copy: isolated, so it never reorders the line. */
const latin = (chunks: ReactNode) => <bdi dir="ltr">{chunks}</bdi>

/** The three figures a specifier reads first, in the order they read them. */
const FIGURES = ['agc', 'volume', 'time'] as const

/**
 * Section 01 — Hero. Pinned 200vh, scrub 1. One product, two beats.
 *
 * BEAT 0, the statement. Eyebrow, headline and sub in the inline-start column; the
 * PX 5 on a lit turntable in the inline-end half (split), or under the copy
 * (stacked). No buttons: the opening frame has one job, and the nav already
 * carries Contact on every screen.
 *
 * BEAT 2, the unit. The copy clears, the camera brings the turntable to the centre
 * of the frame, and the product is named and measured around it — the series and
 * model on one flank, its three headline figures on the other.
 *
 * The beats are CSS on data-beat, not React: the section scrubs at 60 fps without a
 * render, and scrolling back up walks them in reverse. Every word stays in the DOM
 * throughout — selectable, findable with Ctrl+F, and readable with WebGL disabled.
 * Under reduced motion there are no beats: the copy stays, the name and figures
 * flow beneath it, and the camera holds the opening shot.
 *
 * Every figure comes from assets/products.json through lib/products.ts, and every
 * label from messages/. Nothing on this screen is retyped.
 */
export function Hero() {
  const t = useTranslations('hero')
  const seriesT = useTranslations('series')

  const product = getProduct(HERO_SUBJECT)
  const family = seriesOf(HERO_SUBJECT)
  const rows = useSpecRows(product ?? PLACEHOLDER)
  const figures = FIGURES.map((key) => rows.find((row) => row.key === key)).filter(
    (row) => row !== undefined,
  )
  const size = rows.find((row) => row.key === 'size')

  return (
    <PinnedSection
      id="hero"
      length="200%"
      channel="hero"
      mode="hero"
      // NOT the hero subject. `active` is what section 05 mounts from the /parts
      // build, and it has to match the store's initial value — naming the PX 5
      // here would start fetching and mounting its exploded model while the hero
      // is on screen. The hero scene reads HERO_SUBJECT directly.
      active="sx300"
      beats={HERO_BEATS}
      // THIS IS A VERTICAL BUDGET at the stacked tiers, not taste: the copy has to
      // fit above the turntable, which owns the lower ~40% of a portrait frame. A
      // pinned section taller than the viewport is unreachable for its whole pin.
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-[5.75rem] md:px-12 md:pt-32 lg:px-20 split:justify-center split:pb-20 split:pt-28"
    >
      {/* Take hold of the turntable. Over the product's side of the frame, under
          the copy: the copy column sits above it, so text stays selectable. */}
      <GrabZone
        target="hero"
        className="bottom-[4%] end-0 start-0 top-[52%] split:bottom-[10%] split:start-[36%] split:top-[12%]"
      />

      {/* ---------------------------------------------------- beat 0 --- */}
      <div className="hero-copy relative z-10 w-full max-w-3xl split:w-[calc(49vw-5rem)] split:max-w-[44rem]">
        {/* data-depth: pixels of pointer drift — see PointerParallax. The nearer
            the reader a line should feel, the more it moves. */}
        {/* THE CREDENTIAL, large. The one fact a Saudi buyer checks before any
            spec: who stands behind this product here. It was a 13px mono eyebrow;
            it is now the second-largest line on the screen, in the mark's gold,
            behind a seal. The principal's name sits over it as the label. */}
        <div className="hero-credential flex items-center gap-3.5 md:gap-4" data-anim data-depth="5">
          <span aria-hidden="true" className="hero-seal">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3l7 3v5.2c0 4.4-3 8.3-7 9.8-4-1.5-7-5.4-7-9.8V6l7-3z" />
              <path d="M8.8 12.2l2.3 2.3 4.3-4.6" />
            </svg>
          </span>
          <p className="min-w-0">
            {/* Not on a phone: it wrapped to two lines of mono caps and pushed the
                headline into the turntable. The credential is the line that counts. */}
            <span className="eyebrow hidden sm:block">{t.rich('principal', { latin })}</span>
            <span className="sr-only"> — </span>
            <span className="hero-credential-text block sm:mt-1 text-[1.375rem] font-semibold leading-tight md:text-3xl split:text-[2rem]">
              {t('eyebrow')}
            </span>
          </p>
        </div>

        <h1
          // Steps down at the compact tier — see the vertical budget above — and
          // steps down again beside the turntable, where the column is half the
          // width it is when stacked.
          className="display mt-4 text-display-sm font-semibold text-paper sm:text-display-md md:mt-5 split:text-display-hero"
          data-anim
          data-depth="11"
        >
          {t.rich('h1', {
            accent: (chunks) => <span className="hero-accent">{chunks}</span>,
          })}
        </h1>

        <p
          className="hero-lift mt-5 max-w-[46ch] text-base text-steel md:mt-6 md:text-lg"
          data-anim
        >
          {t('sub')}
        </p>
      </div>

      {/* ---------------------------------------------------- beat 2 --- */}
      {/*
        Laid over the whole frame only when motion is allowed; under reduced motion
        it is ordinary flow content under the copy. Every layout class is therefore
        behind motion-safe:, so the reduced layout is simply "no classes".

        split: three columns — name, the gap the product is framed in, figures.
        stacked: name at the top, figures in a row along the bottom, the product
        between them.
      */}
      {product && (
        <div className="hero-stage mt-10 max-w-xl motion-safe:pointer-events-none motion-safe:absolute motion-safe:inset-0 motion-safe:mt-0 motion-safe:flex motion-safe:max-w-none motion-safe:flex-col motion-safe:justify-between motion-safe:px-6 motion-safe:pb-10 motion-safe:pt-24 motion-safe:md:px-12 motion-safe:md:pt-28 motion-safe:lg:px-20 motion-safe:split:grid motion-safe:split:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_minmax(0,1fr)] motion-safe:split:items-center motion-safe:split:py-20">
          <div className="hero-spec" data-depth="12">
            {family && (
              <p className="eyebrow flex items-center gap-3">
                <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
                {seriesT(`${family.id}.name` as 'px.name')}
              </p>
            )}
            <h2 className="display mt-3 text-5xl font-semibold text-paper md:text-6xl split:text-7xl">
              <ModelName name={product.name} />
            </h2>
            {family && (
              <p className="mt-3 max-w-[26ch] text-base text-steel md:text-lg">
                {seriesT(`${family.id}.sub` as 'px.sub')}
              </p>
            )}
            {size && (
              <p className="figure mt-4 hidden text-sm text-steel md:block">
                <span className="spec-label me-2 font-mono text-xs uppercase tracking-[0.12em]">
                  {size.label}
                </span>
                <bdi dir="ltr">
                  {size.value} {size.unit}
                </bdi>
              </p>
            )}
          </div>

          {/* The product is framed here by the camera. Empty in the DOM. */}
          <div aria-hidden="true" className="hidden motion-safe:split:block" />

          {/* Negative depth: the figures drift the other way from the name, so
              the product between them reads as the plane in the middle. */}
          <dl data-depth="-9" className="hero-spec hero-figures mt-8 grid grid-cols-3 gap-4 motion-safe:mt-0 motion-safe:split:w-full motion-safe:split:max-w-[15rem] motion-safe:split:grid-cols-1 motion-safe:split:gap-7 motion-safe:split:justify-self-end">
            {figures.map((row) => (
              <div key={row.key} className="hairline border-t pt-3">
                <dt className="spec-label font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-steel md:text-xs">
                  {row.label}
                </dt>
                <dd className="figure mt-1.5 text-2xl font-medium text-paper md:text-3xl split:text-4xl">
                  <bdi dir="ltr">
                    {row.value}
                    <span className="ms-1.5 text-sm text-steel md:text-base">{row.unit}</span>
                  </bdi>
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )}

      {/* The cue leaves with the copy: by beat 1 the reader is already scrolling. */}
      <div className="hero-copy pointer-events-none absolute bottom-8 start-6 hidden items-center gap-3 md:start-12 lg:start-20 motion-safe:md:flex">
        <span aria-hidden="true" className="scroll-cue relative block h-10 w-px overflow-hidden bg-gold/25">
          <span className="scroll-cue-dot absolute top-0 block h-3 w-full bg-gold" />
        </span>
        <p className="eyebrow">{t('scroll')}</p>
      </div>
    </PinnedSection>
  )
}

/**
 * Only reached if HERO_SUBJECT names a product that is not in products.json, in
 * which case the stage block is not rendered at all. It exists so the spec-row hook
 * is called unconditionally — hooks cannot sit behind a branch.
 */
const PLACEHOLDER = {
  id: '',
  name: '',
  form: '',
  agc_g: 0,
  total_g: 0,
  volume_m3: 0,
  time_s: 0,
  length_mm: 0,
  dia_mm: 0,
  finish: 'stainless',
  accent: '',
} as const
