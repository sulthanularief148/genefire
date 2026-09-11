import { getRequestConfig } from 'next-intl/server'
import { hasLocale } from 'next-intl'
import { routing } from './routing'

/**
 * messages/ar.json and messages/en.json are the source of truth for every string on
 * the site. `npm run check:messages` enforces ar/en parity — do not regenerate them.
 */
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale

  return {
    locale,
    messages: (await import(`../../messages/${locale}.json`)).default,
    // Western Arabic numerals site-wide, including in ar — Saudi technical documents
    // use 0-9 and Arabic-Indic digits hurt scannability on a spec table.
    formats: {
      number: {
        spec: { useGrouping: false },
      },
    },
  }
})
