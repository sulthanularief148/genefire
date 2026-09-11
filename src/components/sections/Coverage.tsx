'use client'

import { useEffect, useId, useRef, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { GrabZone } from '@/components/scroll/GrabZone'
import { SceneModeOnView } from '@/components/scroll/SceneModeOnView'
import { ModelName, specText } from '@/components/product/SpecTable'
import {
  COVERAGE_PER_GRAM_M3,
  MAX_SINGLE_UNIT_M3,
  brand,
  nextSizeUp,
  recommendUnit,
  requiredAgcGrams,
  unitsNeeded,
} from '@/lib/products'
import { requestRender, useScene } from '@/lib/useScene'

/**
 * Section 06 — the coverage calculator.
 *
 * The site's conversion mechanism and its only interactive verb. Not pinned: it
 * is a form, and a form that moves while you type is hostile.
 *
 * The copy column sits at the inline-start edge; the enclosure being sized is drawn
 * live in the inline-end half (CoverageRoom), and the reader can take hold of it and
 * turn it. It is on screen whenever this section owns the middle of the viewport —
 * it used to appear only on mouse-enter, so a reader who scrolled here and never
 * moved the pointer over the form never saw it at all.
 *
 * Every figure is computed by the helpers in lib/products.ts from the single rule
 * in assets/products.json — 0.05 m³ per gram, verified across all eleven SKUs.
 * Nothing here reimplements that arithmetic. The result is stated as TEXT first;
 * the room is illustration.
 *
 * Each dimension has a number field AND a slider. The field is the control: it is
 * labelled, it is in the tab order, and the three are tabbed through in order. The
 * slider is a pointer convenience for dragging the room to size — out of the tab
 * order and hidden from assistive technology, so nothing is announced twice.
 */

/** Slider range, metres. The number field still accepts up to 50. */
const SLIDER = { min: 0.2, max: 12, step: 0.1 } as const

export function Coverage() {
  const t = useTranslations('calc')
  const section = useTranslations('section')
  const spec = useTranslations('spec')
  const unit = useTranslations('unit')
  const setRoom = useScene((s) => s.setRoom)
  const reduced = useScene((s) => s.reduced)
  const locale = useLocale()

  const [l, setL] = useState(3)
  const [w, setW] = useState(2.5)
  const [h, setH] = useState(2)
  const [application, setApplication] = useState(brand.applications_en[4])

  const ids = useId()
  const volume = round(l * w * h)

  // Push the dimensions to the canvas. An interaction, not a frame — so it also
  // has to ask for a redraw.
  useEffect(() => {
    setRoom({ l, w, h })
    requestRender()
  }, [l, w, h, setRoom])

  const recommended = recommendUnit(volume)
  const next = nextSizeUp(volume)
  const count = unitsNeeded(volume)
  const agc = round(requiredAgcGrams(volume))

  // The two big readouts count to their new value rather than jumping.
  const shownVolume = useTween(volume, reduced)
  const shownAgc = useTween(agc, reduced)

  return (
    <section id="coverage" className="relative min-h-dvh px-6 py-24 md:px-12 md:py-28 lg:px-20">
      <SceneModeOnView mode="coverage" />

      {/* Turn the room. Beside the form, never over it. */}
      <GrabZone
        target="coverage"
        className="bottom-[6%] end-0 top-[10%] hidden split:block split:start-[52%]"
      />

      <div className="relative z-10 w-full max-w-xl split:w-[calc(48vw-5rem)] split:max-w-[38rem]">
        <p className="eyebrow flex items-center gap-3" data-reveal>
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
          {section('coverage')}
        </p>
        <h2
          className="display mt-4 text-display-sm font-semibold text-paper md:text-display-md split:text-display-sm xl:text-display-md"
          data-reveal
        >
          {t('title')}
        </h2>
        <p className="mt-3 text-base text-steel" data-reveal>
          {t('rule')}
        </p>

        <div className="mt-8 space-y-6" data-reveal>
          <Dimension id={`${ids}-l`} label={t('length')} unit={unit('m')} value={l} onChange={setL} />
          <Dimension id={`${ids}-w`} label={t('width')} unit={unit('m')} value={w} onChange={setW} />
          <Dimension id={`${ids}-h`} label={t('height')} unit={unit('m')} value={h} onChange={setH} />
        </div>

        <div className="mt-7" data-reveal>
          <label htmlFor={`${ids}-app`} className="block text-sm text-steel">
            {t('application')}
          </label>
          <select
            id={`${ids}-app`}
            value={application}
            onChange={(e) => setApplication(e.target.value)}
            className="field mt-2 w-full"
          >
            {brand.applications_en.map((app, i) => (
              <option key={app} value={app} className="bg-ink">
                {/* Application names live in products.json in both languages;
                    each page shows its own. The value stays the English key. */}
                {locale === 'ar' ? brand.applications_ar[i] : app}
              </option>
            ))}
          </select>
        </div>

        {/* ---------------------------------------------------------- result --- */}
        <div className="glass-panel mt-8 p-6 md:p-7" aria-live="polite" data-reveal>
          <dl className="grid grid-cols-2 gap-5">
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-xs text-steel">{t('volume')}</dt>
              <dd className="figure text-3xl font-medium text-paper md:text-4xl">
                <bdi dir="ltr">
                  {shownVolume.toFixed(2).replace(/\.?0+$/, '')}
                  <span className="ms-1.5 text-base text-steel">{unit('m3')}</span>
                </bdi>
              </dd>
            </div>
            <div className="flex flex-col-reverse">
              <dt className="mt-1 text-xs text-steel">{t('required')}</dt>
              <dd className="figure text-3xl font-medium text-paper md:text-4xl">
                <bdi dir="ltr">
                  {Math.round(shownAgc)}
                  <span className="ms-1.5 text-base text-steel">{unit('g')}</span>
                </bdi>
              </dd>
            </div>
          </dl>

          <div className="hairline mt-6 border-t pt-5">
            <p className="text-sm text-steel">{t('result')}</p>
            <p className="display-red mt-1 flex items-baseline gap-3">
              <ModelName name={recommended.name} />
              {count > 1 && (
                <span className="figure text-lg text-paper">
                  <bdi dir="ltr">× {count}</bdi>
                </span>
              )}
            </p>

            <dl className="mt-4 space-y-2 text-sm">
              <Row label={spec('agc')} value={`${specText(recommended.agc_g)} ${unit('g')}`} />
              <Row
                label={spec('volume')}
                value={`${specText(recommended.volume_m3)} ${unit('m3')}`}
              />
            </dl>

            {next && (
              <p className="mt-4 text-sm text-steel">
                {t('next')}: <ModelName name={next.name} />
              </p>
            )}

            {volume > MAX_SINGLE_UNIT_M3 && (
              <p className="mt-4 text-sm text-paper">{t('multiple', { n: count })}</p>
            )}
          </div>

          {/*
            LEGAL, NOT COPY. This must be visible next to every result, in both
            languages — not a tooltip, not an accordion, not a footnote. This is a
            life-safety product in a regulated market and the number above is
            indicative sizing, not a design.
          */}
          <p className="hairline mt-5 border-t pt-5 text-sm text-steel">{t('disclaimer')}</p>

          <a href="#contact" className="btn-primary mt-6">
            {t('cta')}
          </a>
        </div>
      </div>
    </section>
  )
}

function Dimension({
  id,
  label,
  unit,
  value,
  onChange,
}: {
  id: string
  label: string
  unit: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <label htmlFor={id} className="text-sm text-steel">
          {label}
        </label>
        <div className="flex items-baseline gap-1.5" dir="ltr">
          <input
            id={id}
            type="number"
            inputMode="decimal"
            min={0.1}
            max={50}
            step={0.1}
            value={value}
            onChange={(e) => onChange(clampInput(e.target.value))}
            className="field figure w-24 py-2 text-end text-lg"
          />
          <span className="text-sm text-steel">{unit}</span>
        </div>
      </div>
      <input
        type="range"
        aria-hidden="true"
        tabIndex={-1}
        min={SLIDER.min}
        max={SLIDER.max}
        step={SLIDER.step}
        value={Math.min(SLIDER.max, Math.max(SLIDER.min, value))}
        onChange={(e) => onChange(clampInput(e.target.value))}
        className="range mt-3 w-full"
      />
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-6">
      <dt className="text-steel">{label}</dt>
      <dd className="text-paper">
        <bdi dir="ltr">{value}</bdi>
      </dd>
    </div>
  )
}

/**
 * A number that eases to its new value over ~400 ms. Display only — the real value
 * is what every calculation uses; this is what the eye sees count up to it.
 */
function useTween(target: number, instant: boolean): number {
  const [shown, setShown] = useState(target)
  const from = useRef(target)

  useEffect(() => {
    if (instant) {
      from.current = target
      const frame = requestAnimationFrame(() => setShown(target))
      return () => cancelAnimationFrame(frame)
    }
    const start = performance.now()
    const origin = from.current
    let frame = 0
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / 420)
      const eased = 1 - Math.pow(1 - k, 3)
      const value = origin + (target - origin) * eased
      from.current = value
      setShown(value)
      if (k < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, instant])

  return shown
}

function clampInput(raw: string): number {
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return 0.1
  return Math.min(50, Math.max(0.1, n))
}

/** Two decimals, no floating-point tails on screen. */
function round(n: number): number {
  return Math.round(n * 100) / 100
}

/** Re-exported so the sub-route can state the rule without recomputing it. */
export const COVERAGE_RULE = COVERAGE_PER_GRAM_M3
