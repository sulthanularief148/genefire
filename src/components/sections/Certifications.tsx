import { useTranslations } from 'next-intl'

import { SceneModeOnView } from '@/components/scroll/SceneModeOnView'
import { brand } from '@/lib/products'

/**
 * Section 09 — certifications.
 *
 * EMPTY SLOTS ONLY. The marks are not reconstructed, traced or approximated from
 * the brochure scan in assets/brand/ — a certification mark drawn by us is a
 * fabricated certification, and this is life-safety equipment sold into a
 * regulated market. Each slot is labelled as awaiting client artwork so nobody
 * mistakes the placeholder for the real thing, and so it is obvious in review
 * what is still outstanding.
 *
 * The names come from products.json, which transcribes what the brochure claims.
 * Naming a certification the client already claims is not the same as drawing its
 * mark.
 */
export function Certifications() {
  const t = useTranslations('cert')

  return (
    <section id="certifications" className="px-6 py-28 md:px-12 lg:px-20">
      <SceneModeOnView mode="rest" />
      <h2 className="display text-display-md font-semibold text-paper">{t('title')}</h2>

      <ul className="mt-10 grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        {brand.certifications.map((name) => (
          <li
            key={name}
            className="flex aspect-[3/2] flex-col items-center justify-center rounded-sm border border-dashed border-graphite p-4 text-center"
          >
            <span className="text-sm font-medium text-steel">
              <bdi dir="ltr">{name}</bdi>
            </span>
            <span className="mt-2 text-xs text-accent-on-dark">{t('awaiting')}</span>
          </li>
        ))}
      </ul>

      <div className="mt-12">
        <h3 className="text-sm text-steel">{t('classes')}</h3>
        <ul className="mt-3 flex flex-wrap gap-3">
          {brand.fire_classes.map((fireClass) => (
            <li
              key={fireClass}
              className="rounded-sm border border-graphite px-4 py-2 text-sm text-paper"
            >
              <bdi dir="ltr">{fireClass}</bdi>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-12 max-w-measure text-steel">{t('agency')}</p>
    </section>
  )
}
