'use client'

import { useTranslations } from 'next-intl'

import { Link, usePathname } from '@/i18n/navigation'
import { routing, type Locale } from '@/i18n/routing'
import { useScene } from '@/lib/useScene'
import { NAV_SECTIONS } from './sections'

/**
 * Persistent top nav: the Almaghrabi mark, the four destinations, and the
 * language switch.
 *
 * TWO THINGS THE LANGUAGE SWITCH MUST GET RIGHT.
 *
 * 1. The path is never constructed by hand. `usePathname` here is next-intl's,
 *    which returns the LOCALE-STRIPPED path by design, because next-intl's own
 *    Link and router re-add the prefix. Interpolating `/${locale}${pathname}`
 *    double-appends — that is what produced `/ar/en`. Pass the stripped path plus
 *    `{ locale }` and let the library build the URL.
 *
 * 2. The reader's place travels in the URL HASH, and is restored by scrolling to
 *    the section's ScrollTrigger start rather than by a native hash jump —
 *    sixteen pin spacers mean a section's DOM offset is nowhere near its visual
 *    scroll position. The hash is the right carrier rather than per-tab storage
 *    because this site's conversion path is a consultant emailing a link to a
 *    colleague: every section has to be deep-linkable and shareable, and
 *    sessionStorage dies on share, bookmark or new tab.
 *
 * There is deliberately no onClick href rewrite. That raced next-intl's own
 * handler; the mechanism was wrong, not the timing.
 */
export function SiteNav({ locale }: { locale: Locale }) {
  const t = useTranslations('section')
  const brandT = useTranslations('brand')
  const a11y = useTranslations('a11y')
  const pathname = usePathname()
  // The section the reader is on, published by the progress rail.
  const section = useScene((s) => s.section)

  return (
    <header className="site-header pointer-events-none fixed inset-x-0 top-0 z-50">
      <nav
        aria-label={a11y('nav')}
        className="pointer-events-auto mx-auto flex max-w-[120rem] items-center justify-between gap-6 px-6 py-3 md:px-12 md:py-4 lg:px-20"
      >
        {/* The lockup as the brochure sets it: the mark, the name large, the
            descriptor under it. One link, one accessible name — the two lines read
            as "ALMAGHRABI for Trading Services". */}
        <a href="#hero" className="brand-lockup flex items-center gap-3 text-paper md:gap-3.5">
          {/*
            The Almaghrabi calligraphic mark, extracted from the brochure as flat
            art by scripts/extract-brand-mark.mjs.

            Painted through mask-image rather than as a coloured PNG, so its
            colour is the --gold token and cannot drift from the palette in
            assets/products.json. aria-hidden because the company name sits
            beside it as real text — the mark is not the accessible name.
          */}
          <span
            aria-hidden="true"
            className="brand-mark block h-11 w-11 shrink-0 bg-gold md:h-14 md:w-14"
            style={{
              maskImage: 'url(/brand/almaghrabi-mark.png)',
              WebkitMaskImage: 'url(/brand/almaghrabi-mark.png)',
              maskSize: 'contain',
              WebkitMaskSize: 'contain',
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
              maskPosition: 'center',
              WebkitMaskPosition: 'center',
            }}
          />
          <span className="flex flex-col leading-none">
            <span className="text-lg font-bold tracking-wide md:text-xl">{brandT('name')}</span>
            <span className="sr-only"> </span>
            <span className="mt-1 text-xs font-medium text-gold md:text-sm">{brandT('descriptor')}</span>
          </span>
        </a>

        <ul className="hidden items-center gap-7 text-sm md:flex">
          {NAV_SECTIONS.map((item) => {
            // The rail already publishes which section the reader is on; the nav
            // was reading it and doing nothing with it.
            const current = section === item.id
            return (
              <li key={item.id}>
                <a
                  href={`#${item.id}`}
                  aria-current={current ? 'true' : undefined}
                  className={
                    current
                      ? 'nav-link text-gold transition-colors duration-200'
                      : 'nav-link text-steel transition-colors duration-200 hover:text-paper'
                  }
                >
                  {t(item.key as 'products')}
                </a>
              </li>
            )
          })}
        </ul>

        <ul className="flex items-center gap-3 text-sm" aria-label={a11y('language')}>
          {routing.locales.map((candidate) => (
            <li key={candidate}>
              <Link
                // The hash rides along in the href. next-intl builds the locale
                // path; we only ever hand it the stripped pathname and a hash.
                href={{ pathname, hash: section }}
                locale={candidate}
                /*
                 * Hand the browser the href next-intl produced, rather than
                 * letting the client router take the click.
                 *
                 * next-intl gives the router the STRIPPED pathname, which is
                 * identical for both locales — so when the target hash also
                 * matches the current one, the whole navigation looks like a
                 * same-page hash jump and the locale change is silently dropped.
                 * Measured: from /ar#coverage the link to /en#coverage lands back
                 * on /ar#coverage, while the same link from /ar#contact switches
                 * correctly. A reader sitting on the coverage section simply could
                 * not change language.
                 *
                 * This is NOT the onClick href rewrite that was removed earlier.
                 * Nothing is constructed here and nothing races next-intl: the
                 * href is whatever next-intl already wrote onto the anchor, and
                 * preventDefault runs before any router handler sees the event.
                 *
                 * A full document load is the right thing for a locale switch in
                 * any case — lang, dir and the font stack all change, and
                 * RestoreSection puts the reader back on their section.
                 */
                onClick={(event) => {
                  const href = event.currentTarget.getAttribute('href')
                  if (!href || event.metaKey || event.ctrlKey || event.shiftKey) return
                  event.preventDefault()
                  window.location.assign(href)
                }}
                hrefLang={candidate}
                aria-current={candidate === locale ? 'true' : undefined}
                className={
                  candidate === locale
                    ? 'font-medium text-paper'
                    : 'text-steel transition-colors duration-200 hover:text-paper'
                }
                // A language name is always written in its own language, so a
                // reader can find their own without reading the other one.
                lang={candidate}
                dir={candidate === 'ar' ? 'rtl' : 'ltr'}
              >
                {candidate === 'ar' ? 'العربية' : 'English'}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  )
}
