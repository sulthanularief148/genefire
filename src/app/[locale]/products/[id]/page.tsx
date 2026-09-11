import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { getTranslations, setRequestLocale } from 'next-intl/server'

import { ModelName, SpecTable } from '@/components/product/SpecTable'
import { Link } from '@/i18n/navigation'
import { routing } from '@/i18n/routing'
import { brand, getProduct, high, products, seriesOf } from '@/lib/products'

/**
 * Static, indexable spec sheet — one per SKU.
 *
 * No canvas, no scroll choreography, no client JavaScript beyond the locale
 * provider. This is what ranks in search and what a consultant emails to a
 * colleague, so it has to work with WebGL disabled entirely, and it does: there is
 * nothing here that could need it.
 *
 * Every figure comes from assets/products.json through lib/products.ts.
 */

export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    products.map((product) => ({ locale, id: product.id })),
  )
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}): Promise<Metadata> {
  const { locale, id } = await params
  const product = getProduct(id)
  if (!product) return {}

  const t = await getTranslations({ locale, namespace: 'spec' })
  const unit = await getTranslations({ locale, namespace: 'unit' })

  return {
    title: product.name,
    description: `${product.name} — ${t('volume')} ${high(product.volume_m3)} ${unit('m3')}, ${t('agc')} ${high(product.agc_g)} ${unit('g')}. ${brand.principal}.`,
    alternates: {
      canonical: `/${locale}/products/${id}`,
      languages: {
        'ar-SA': `/ar/products/${id}`,
        en: `/en/products/${id}`,
        'x-default': `/ar/products/${id}`,
      },
    },
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const product = getProduct(id)
  if (!product) notFound()

  const series = seriesOf(product.id)
  const t = await getTranslations({ locale, namespace: 'product' })
  const nav = await getTranslations({ locale, namespace: 'nav' })
  const seriesT = await getTranslations({ locale, namespace: 'series' })
  const calc = await getTranslations({ locale, namespace: 'calc' })
  const contact = await getTranslations({ locale, namespace: 'contact' })

  const index = products.findIndex((p) => p.id === product.id)
  const prev = products[index - 1]
  const next = products[index + 1]

  return (
    <main id="main" className="mx-auto max-w-4xl px-6 py-20 md:px-10">
      <nav aria-label={nav('products')} className="text-sm text-steel">
        <Link href="/#products" className="underline underline-offset-4">
          {nav('products')}
        </Link>
      </nav>

      <header className="mt-8 border-b border-graphite pb-10">
        {series && (
          <p className="eyebrow">{seriesT(`${series.id}.name` as 'px.name')}</p>
        )}
        <h1 className="display mt-4 text-display-lg font-semibold text-paper">
          <ModelName name={product.name} />
        </h1>
        {series && (
          <p className="mt-4 max-w-measure text-lg text-steel">
            {seriesT(`${series.id}.sub` as 'px.sub')}
          </p>
        )}
        {(locale === 'ar' ? product.note_ar : product.note_en) && (
          <p className="mt-4 max-w-measure text-steel">
            {locale === 'ar' ? product.note_ar : product.note_en}
          </p>
        )}
      </header>

      <div className="mt-12 grid gap-12 md:grid-cols-2">
        {/* The pre-rendered orthographic view. These exist precisely so a page
            like this needs no WebGL. */}
        <div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/renders/${product.id}_hero.png`}
            alt={product.name}
            className="w-full rounded-sm border border-graphite bg-ink"
            loading="lazy"
            decoding="async"
          />
        </div>

        <div>
          <h2 className="sr-only">{nav('products')}</h2>
          <SpecTable product={product} />

          <p className="mt-8 text-sm text-steel">{calc('rule')}</p>

          {/* The same qualifier the calculator carries. A spec sheet that travels
              by email must not arrive without it. */}
          <p className="mt-4 border-t border-graphite pt-4 text-sm text-steel">
            {calc('disclaimer')}
          </p>

          <Link
            href="/#coverage"
            className="mt-8 inline-block rounded-sm bg-fire px-6 py-3 text-sm font-semibold text-paper"
          >
            {calc('cta')}
          </Link>
        </div>
      </div>

      <footer className="mt-16 border-t border-graphite pt-8">
        <p className="text-sm text-steel">{contact('address')}</p>
        <p className="mt-2 text-sm">
          {brand.phones.map((phone, i) => (
            <span key={phone}>
              {i > 0 && <span aria-hidden="true"> · </span>}
              <a href={`tel:${phone}`} className="text-accent-on-dark" dir="ltr">
                {phone}
              </a>
            </span>
          ))}
          <span aria-hidden="true"> · </span>
          <a href={`mailto:${brand.email}`} className="text-accent-on-dark" dir="ltr">
            {brand.email}
          </a>
        </p>

        <nav className="mt-8 flex justify-between gap-6 text-sm" aria-label={nav('products')}>
          {prev ? (
            <Link href={`/products/${prev.id}`} className="text-steel underline underline-offset-4">
              <ModelName name={prev.name} />
            </Link>
          ) : (
            <span />
          )}
          {next ? (
            <Link href={`/products/${next.id}`} className="text-steel underline underline-offset-4">
              <ModelName name={next.name} />
            </Link>
          ) : (
            <span />
          )}
        </nav>

        <p className="mt-8 text-xs text-steel">{t('datasheet')}</p>
      </footer>
    </main>
  )
}
