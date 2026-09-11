import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

import { routing } from '@/i18n/routing'
import { palette } from '@/lib/products'

/**
 * Root not-found. Requests that never reach a locale segment land here, so it
 * carries its own <html> and falls back to the default locale (ar).
 */
export default async function NotFound() {
  const locale = routing.defaultLocale
  const t = await getTranslations({ locale, namespace: 'brand' })

  return (
    <html lang={locale} dir="rtl">
      <body style={{ background: palette.ink, color: palette.paper }}>
        <main
          id="main"
          style={{
            minHeight: '100dvh',
            display: 'grid',
            placeItems: 'center',
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            padding: '2rem',
          }}
        >
          <div>
            <p style={{ fontSize: '1.5rem', marginBlockEnd: '1rem' }}>404</p>
            <Link href={`/${locale}`} style={{ color: palette.fire_red, fontSize: '1.5rem', fontWeight: 700 }}>
              {t('company')}
            </Link>
          </div>
        </main>
      </body>
    </html>
  )
}
