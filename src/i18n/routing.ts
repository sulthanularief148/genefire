import { defineRouting } from 'next-intl/routing'

/**
 * Arabic is the primary language, not a translation target. `ar` is the default
 * locale and `/` redirects to `/ar`.
 */
export const routing = defineRouting({
  locales: ['ar', 'en'],
  defaultLocale: 'ar',
  // Both languages carry an explicit prefix so /ar and /en are equally addressable
  // and both can be linked with hreflang.
  localePrefix: 'always',
})

export type Locale = (typeof routing.locales)[number]

/** `dir` is decided server-side from the locale — never from a client effect. */
export function dirFor(locale: Locale): 'rtl' | 'ltr' {
  return locale === 'ar' ? 'rtl' : 'ltr'
}

/** +1 in LTR, -1 in RTL. Multiply any horizontal offset by this. */
export function signFor(locale: Locale): 1 | -1 {
  return locale === 'ar' ? -1 : 1
}
