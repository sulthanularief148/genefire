import type { NextConfig } from 'next'
import createNextIntlPlugin from 'next-intl/plugin'

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts')

const nextConfig: NextConfig = {
  // .glb and .hdr are served statically from /public; nothing to configure yet.
  // Phase 2 adds the transpile/asset rules for three.js if they become necessary.
  //
  // NEXT_DIST_DIR lets an audit build run beside a live `next start` without
  // overwriting the build it is serving. Unset, this is the default `.next`.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  turbopack: {
    root: __dirname,
  },
}

export default withNextIntl(nextConfig)
