import { useTranslations } from 'next-intl'

import { GrabZone } from '@/components/scroll/GrabZone'
import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ENVIRONMENT_BEATS, ENVIRONMENT_IDS } from '@/lib/environments'

/**
 * Section 07 — applications. Pinned 220vh, scrub 1.
 *
 * Six environments come round on a drum in the canvas, each a cutaway with the
 * installed units lit inside it (components/three/Applications.tsx). The copy
 * column sits at the inline-start edge, as every other display section's does: a
 * counter, the application facing the camera in large type, and all six listed
 * with that one lit — so the reader always knows which of six they are on and how
 * many remain.
 *
 * Which one is lit is CSS on data-beat, not React: the drum turns at 60 fps
 * without a render, and the names and the drum read the same array
 * (ENVIRONMENT_BEATS), so they cannot drift apart.
 *
 * The application names are the brochure's six. Nothing is said here about which
 * unit suits which application — that pairing is an illustration in the 3D, not a
 * recommendation, and the brochure does not make it.
 */

// Shared with the drum. One array, both sides.
const BEATS = ENVIRONMENT_BEATS

export function Applications() {
  const t = useTranslations('app')
  const nav = useTranslations('nav')
  const total = String(ENVIRONMENT_IDS.length).padStart(2, '0')

  return (
    <PinnedSection
      id="applications"
      length="220%"
      channel="applications"
      mode="applications"
      active={null}
      beats={BEATS}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-24 md:px-12 md:pt-28 lg:px-20 split:justify-center split:py-24"
    >
      {/* Turn the environment facing the camera. It springs back square. */}
      <GrabZone
        target="applications"
        className="bottom-[4%] end-0 start-0 top-[56%] split:bottom-[10%] split:start-[44%] split:top-[12%]"
      />

      <div className="relative z-10 w-full max-w-xl split:w-[calc(42vw-5rem)] split:max-w-[32rem]">
        <p className="eyebrow flex items-center gap-3" data-anim data-depth="4">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
          {nav('applications')}
        </p>

        {/* The counter and the name of the environment facing the camera. One of
            each is displayed at a time; see .env-name. */}
        <p className="figure mt-6 text-sm text-gold" aria-hidden="true">
          <bdi dir="ltr">
            {ENVIRONMENT_IDS.map((id, i) => (
              <span key={id} className="env-name" data-env={i}>
                {String(i + 1).padStart(2, '0')}
              </span>
            ))}
            <span className="text-steel"> / {total}</span>
          </bdi>
        </p>
        <p
          className="display mt-2 min-h-[1.2em] text-display-md font-semibold text-paper"
          aria-hidden="true"
          data-depth="10"
        >
          {ENVIRONMENT_IDS.map((id, i) => (
            <span key={id} className="env-name env-title" data-env={i}>
              {t(id as 'military')}
            </span>
          ))}
        </p>

        {/* The six, as a list — the real text, in the accessibility tree.

            Below md it collapses to a row of six position markers: the name in
            large type above already says which one is facing the camera, and six
            full rows ran down into the drum on a phone. The names stay in the DOM
            as screen-reader text there. */}
        <h2 className="sr-only">{nav('applications')}</h2>
        {/* Reduced motion keeps the full list at every width: nothing turns, so
            the list is the only way to read all six. */}
        <ol className="mt-6 flex max-w-sm gap-2 md:mt-8 md:block motion-reduce:block">
          {ENVIRONMENT_IDS.map((id, i) => (
            <li
              key={id}
              className="env-label hairline flex items-center gap-4 text-base text-steel md:border-b md:py-3 motion-reduce:border-b motion-reduce:py-3"
              data-env={i}
            >
              <span aria-hidden="true" className="env-marker block h-1 w-8 shrink-0 rounded-full bg-graphite md:h-0.5 md:w-6" data-env={i} />
              <span className="figure hidden text-xs text-steel md:inline motion-reduce:inline" aria-hidden="true">
                <bdi dir="ltr">{String(i + 1).padStart(2, '0')}</bdi>
              </span>
              <span className="sr-only md:not-sr-only motion-reduce:not-sr-only">{t(id as 'military')}</span>
            </li>
          ))}
        </ol>
      </div>
    </PinnedSection>
  )
}
