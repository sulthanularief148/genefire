import createMiddleware from 'next-intl/middleware'

import { routing } from './i18n/routing'

/**
 * Locale negotiation. `/` redirects to `/ar`; an unprefixed path is resolved from
 * the Accept-Language header and rewritten.
 *
 * Next 16 renamed the `middleware` file convention to `proxy`; this is the same
 * function under the new name.
 */
export default createMiddleware(routing)

export const config = {
  // Everything except API routes, Next internals, and any path with a file
  // extension (models, renders, fonts, favicon).
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
}
