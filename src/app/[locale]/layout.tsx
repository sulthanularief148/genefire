import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { hasLocale, NextIntlClientProvider } from 'next-intl'
import { getTranslations, setRequestLocale } from 'next-intl/server'
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic, Inter } from 'next/font/google'

import { dirFor, routing, signFor, type Locale } from '@/i18n/routing'
import { SkipLink } from '@/components/SkipLink'
import { SiteNav } from '@/components/chrome/SiteNav'
import { ProgressRail } from '@/components/chrome/ProgressRail'
import { RestoreSection } from '@/components/chrome/RestoreSection'
import { PointerParallax } from '@/components/scroll/PointerParallax'
import { RevealObserver } from '@/components/scroll/RevealObserver'
import { SmoothScrollProvider } from '@/components/scroll/SmoothScrollProvider'
import { SceneMount } from '@/components/three/SceneMount'
import '../globals.css'

/**
 * Arabic body face. IBM Plex Sans Arabic has a real weight range and a neutral,
 * technical voice — the brochure's own register.
 */
const arabic = IBM_Plex_Sans_Arabic({
  // Arabic subset only, three weights. next/font preloads every declared
  // subset × weight combination, and 5 weights × 2 subsets meant ten preloaded
  // woff2 files competing with the JS on an HTTP/1.1 connection.
  // Latin inside an Arabic page falls through to Inter via the font stack, which
  // is what the bilingual skill asks for anyway: different type for each script.
  subsets: ['arabic'],
  weight: ['400', '600', '700'],
  variable: '--font-ar',
  display: 'swap',
})

/** Latin face. Also used inside Arabic pages for model numbers and brand names. */
const latin = Inter({
  subsets: ['latin'],
  variable: '--font-latin',
  display: 'swap',
})

/**
 * Technical face, for eyebrows, spec labels and every figure.
 *
 * The audience reads datasheets. A number set in the same face as the prose reads
 * as prose; set in a squared technical mono it reads as a measurement, and the
 * spec table stops being a paragraph with numbers in it. This is the same family
 * as the Arabic body face, so the two do not argue.
 *
 * TWO WEIGHTS, latin only. next/font preloads every declared subset x weight, and
 * this project has already been through one round of that — five weights across
 * two subsets meant ten preloaded woff2 files competing with the JS. Figures need
 * a regular and a medium and nothing else; Arabic labels keep using the Arabic
 * face, which is why no arabic subset is requested here.
 */
const mono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
})

const SITE = 'https://almaghrabi-trading.com'

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}): Promise<Metadata> {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) return {}

  const t = await getTranslations({ locale, namespace: 'brand' })
  const hero = await getTranslations({ locale, namespace: 'hero' })

  return {
    metadataBase: new URL(SITE),
    title: { default: `${t('company')} — GENEFIRE`, template: `%s — ${t('company')}` },
    description: hero('sub'),
    alternates: {
      canonical: `/${locale}`,
      languages: {
        'ar-SA': '/ar',
        en: '/en',
        'x-default': '/ar',
      },
    },
    openGraph: {
      siteName: t('company'),
      locale: locale === 'ar' ? 'ar_SA' : 'en',
      type: 'website',
    },
  }
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ locale: string }>
}) {
  const { locale } = await params
  if (!hasLocale(routing.locales, locale)) notFound()

  // Opt into static rendering — without this every page becomes dynamic.
  setRequestLocale(locale)

  const dir = dirFor(locale as Locale)
  // Reading direction reaches the canvas as a signed multiplier. The 3D world is
  // never mirrored — a mirrored canister shows mirrored engraving.
  const sign = signFor(locale as Locale)

  return (
    // lang and dir are resolved on the server, so RTL is correct in the first byte
    // of HTML. There is no flash of LTR before hydration.
    <html lang={locale} dir={dir} className={`${arabic.variable} ${latin.variable} ${mono.variable}`}>
      <body className="min-h-dvh text-paper antialiased">
        <NextIntlClientProvider>
          <SkipLink />
          <SiteNav locale={locale as Locale} />
          <ProgressRail />
          <RestoreSection />
          {/* Publishes pointer position for the camera's parallax lean. Renders
              nothing, and does nothing at all on touch or under reduced motion. */}
          <PointerParallax />
          {/* Entrances for the unpinned sections' copy. Hides nothing until it
              has run, so server-rendered text always paints. */}
          <RevealObserver />
          {/* One canvas for the entire site, mounted once, fixed behind the page. */}
          <SceneMount sign={sign} fallbackSrc="/renders/sx300_hero.png" />
          <SmoothScrollProvider>{children}</SmoothScrollProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  )
}
