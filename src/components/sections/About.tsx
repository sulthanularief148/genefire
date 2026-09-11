import type { ReactNode } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { GrabZone } from '@/components/scroll/GrabZone'
import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ABOUT_BEATS, NETWORK_NODES } from '@/lib/network'
import { high, keyFeatures, low, products, series } from '@/lib/products'

/**
 * About — who Almaghrabi is, and where it sits in the GENEFIRE network. Pinned
 * 200vh, two beats, beside the network globe (components/three/NetworkGlobe.tsx).
 *
 * BEAT 0: the company. Its name, its role, GENEFIRE in the brochure's own words,
 * and the range in three figures computed from products.json.
 * BEAT 1: the network. The arcs draw on the globe while the three presences are
 * listed here, followed by the brochure's six key product features.
 *
 * CLAIM DISCIPLINE — hard rule 3. Every sentence traces to a source the client
 * owns or GENEFIRE publishes; lib/network.ts lists them. In particular, NONE of the
 * content of almaghrabi-trading.com is used: at the time of writing that site is an
 * unfinished template for an unrelated partnership-brokerage business — lorem ipsum
 * about text, "+456456" and "info@website.com" as contacts, and template statistics
 * ("600+ trusted companies", "98% customer satisfaction", "since 2010") that must
 * not be published as Almaghrabi's. See docs/LAUNCH-CHECKLIST.md.
 */

/** Latin brand names inside Arabic sentences keep Latin order. */
const latin = (chunks: ReactNode) => <bdi dir="ltr">{chunks}</bdi>

export function About() {
  const t = useTranslations('about')
  const brand = useTranslations('brand')
  const contact = useTranslations('contact')
  const unit = useTranslations('unit')
  const locale = useLocale() as 'ar' | 'en'

  // The range in figures, computed — never typed.
  const smallest = Math.min(...products.map((p) => low(p.volume_m3)))
  const largest = Math.max(...products.map((p) => high(p.volume_m3)))
  const facts = [
    { key: 'series', value: String(series.length) },
    { key: 'models', value: String(products.length) },
    { key: 'range', value: `${smallest}–${largest}`, unit: unit('m3') },
  ] as const

  return (
    <PinnedSection
      id="about"
      length="200%"
      channel="about"
      mode="about"
      active={null}
      beats={ABOUT_BEATS}
      className="relative flex min-h-dvh flex-col px-6 pb-10 pt-20 md:px-12 md:pt-28 lg:px-20 split:justify-center split:py-24"
    >
      {/* Spin the globe. Not on phones, where the section is not pinned and the
          copy flows over the whole of it. */}
      <GrabZone
        target="globe"
        className="bottom-0 end-0 start-0 top-[50%] hidden md:block split:bottom-[8%] split:start-[46%] split:top-[10%]"
      />

      <div className="relative z-10 w-full max-w-2xl split:w-[calc(46vw-5rem)] split:max-w-[36rem]">
        <p className="eyebrow flex items-center gap-3" data-anim data-depth="4">
          <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
          {t('eyebrow')}
        </p>

        {/* Two cards in one grid cell, cross-fading on data-beat. Below the md
            breakpoint the section is not pinned and they simply flow. */}
        <div className="beat-stack about-stack mt-5 md:mt-7" data-depth="8">
          {/* ------------------------------------------------ beat 0 --- */}
          <article className="beat beat-veiled beat-0 series-card" aria-labelledby="about-company" data-anim>
            <h2
              id="about-company"
              className="display text-display-sm font-semibold text-paper md:text-display-md split:text-display-sm xl:text-display-md"
            >
              {brand('company')}
            </h2>
            <p className="mt-4 max-w-measure text-lg text-paper md:text-xl">
              {t.rich('lead', { latin })}
            </p>

            <h3 className="eyebrow mt-8">{t.rich('principalTitle', { latin })}</h3>
            <p className="mt-3 max-w-measure text-base text-steel md:text-lg">
              {t.rich('principal', { latin })}
            </p>

            {/* The range column is wider: "0.25–75 m³" must not break. */}
            <dl className="mt-8 grid max-w-md grid-cols-[1fr_1fr_1.7fr] gap-4">
              {facts.map((fact) => (
                // Term before value, as a <dl> requires; the figure is shown above
                // its label by reversing the column, not by reordering the markup.
                <div key={fact.key} className="about-fact hairline flex flex-col-reverse border-t pt-3">
                  <dt className="spec-label mt-1 text-xs text-steel">{t(`fact.${fact.key}`)}</dt>
                  <dd className="figure whitespace-nowrap text-2xl font-medium text-paper md:text-3xl">
                    <bdi dir="ltr">
                      {fact.value}
                      {'unit' in fact && (
                        <span className="ms-1 text-sm text-steel md:text-base">{fact.unit}</span>
                      )}
                    </bdi>
                  </dd>
                </div>
              ))}
            </dl>
          </article>

          {/* ------------------------------------------------ beat 1 --- */}
          <article className="beat beat-veiled beat-1 series-card" aria-labelledby="about-network" data-anim>
            <h2
              id="about-network"
              className="display text-display-sm font-semibold text-paper md:text-display-md split:text-display-sm xl:text-display-md"
            >
              {t.rich('networkTitle', { latin })}
            </h2>
            <p className="mt-4 max-w-measure text-base text-steel md:text-lg">
              {t.rich('networkSub', { latin })}
            </p>

            <ol className="mt-6 max-w-md">
              {NETWORK_NODES.map((node) => (
                <li
                  key={node.id}
                  className="about-node hairline flex items-baseline gap-3 border-b py-3"
                  data-home={node.home ? '' : undefined}
                >
                  <span aria-hidden="true" className="about-node-dot mt-1 block h-2 w-2 shrink-0 self-center rounded-full" />
                  <span className="text-sm font-semibold text-paper">
                    <bdi>{t(`node.${node.id}.name`)}</bdi>
                  </span>
                  <span className="text-sm text-steel">{t(`node.${node.id}.place`)}</span>
                  <span className="ms-auto text-xs text-gold">{t(`node.${node.id}.role`)}</span>
                </li>
              ))}
            </ol>

            <h3 className="eyebrow mt-8">{t('featuresTitle')}</h3>
            <ul className="mt-3 grid max-w-md grid-cols-2 gap-x-6 gap-y-2">
              {keyFeatures.map((feature) => (
                <li key={feature.en} className="about-feature flex items-center gap-2 text-sm text-paper">
                  <span aria-hidden="true" className="h-px w-3 shrink-0 bg-gold" />
                  {feature[locale]}
                </li>
              ))}
            </ul>

            <a href="#contact" className="nav-link mt-8 inline-block text-sm font-semibold text-gold">
              {contact('title')}
            </a>
          </article>
        </div>
      </div>
    </PinnedSection>
  )
}
