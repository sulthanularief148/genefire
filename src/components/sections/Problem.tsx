import { useTranslations } from 'next-intl'

import { PinnedSection } from '@/components/scroll/PinnedSection'

/**
 * Section 02 — The problem. Pinned 150vh, scrub 1.
 *
 * No product on screen. This section exists to build the stake so section 03
 * lands: without it the discharge is a special effect, with it the discharge is
 * an answer.
 *
 * The copy column sits at the inline-start edge; the switchgear room is seen from
 * outside in the other half (CameraRig roomShot), going wrong as the reader
 * scrolls — LEDs dropping out, the traced volume turning red, a glow where the fire
 * starts. It used to be seen from inside, and its LED columns ran straight through
 * the three headlines.
 *
 * ONE STATEMENT AT A TIME, large, one per third of the pin, with a counter; and a
 * heat bar that fills with the section, the room's temperature in one line, ticked
 * at each statement. All of it CSS on data-beat and --section-progress, so
 * nothing re-renders while the section scrubs. Every statement stays in the DOM
 * throughout; under reduced motion all three are shown, in flow.
 */

const BEATS = [0.33, 0.66] as const
const LINES = ['1', '2', '3'] as const

export function Problem() {
  const t = useTranslations('problem')
  const section = useTranslations('section')
  const total = String(LINES.length).padStart(2, '0')

  return (
    <PinnedSection
      id="problem"
      length="150%"
      channel="problem"
      mode="problem"
      active={null}
      beats={BEATS}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-24 md:px-12 md:pt-28 lg:px-20 split:justify-center split:py-24"
    >
      <div className="relative z-10 w-full max-w-xl split:w-[calc(44vw-5rem)] split:max-w-[34rem]">
        <p className="eyebrow flex items-center gap-3" data-anim data-depth="4">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-fire" />
          {section('problem')}
        </p>

        {/* data-anim: drifts with the statements, or they rise into it. */}
        <p className="problem-count figure mt-6 text-sm text-gold motion-reduce:hidden" aria-hidden="true" data-anim>
          <bdi dir="ltr">
            {LINES.map((key, i) => (
              <span key={key} className="env-name" data-env={i}>
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
            <span className="text-steel"> / {total}</span>
          </bdi>
        </p>

        <div className="beat-stack mt-3" data-depth="8">
          {LINES.map((key, i) => (
            <p
              key={key}
              className={`beat beat-veiled beat-${i} display text-display-sm font-semibold text-paper md:text-display-md split:text-display-sm xl:text-display-md`}
              data-anim
            >
              {t(key)}
            </p>
          ))}
        </div>

        {/* The room's temperature, in one line: fills with the section, with a
            tick at each statement's threshold. Decorative; the statements above
            are the content. */}
        <div aria-hidden="true" className="heat-meter mt-10 max-w-sm motion-reduce:hidden">
          <span className="heat-meter-fill" />
          <span className="heat-meter-glow" />
          {BEATS.map((at) => (
            <span key={at} className="heat-meter-tick" style={{ insetInlineStart: `${at * 100}%` }} />
          ))}
        </div>
      </div>
    </PinnedSection>
  )
}
