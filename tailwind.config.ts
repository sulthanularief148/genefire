import type { Config } from 'tailwindcss'
import kit from './assets/products.json'
import { SPLIT_QUERY } from './src/lib/heroLayout'

// The palette is READ from assets/products.json — it is never retyped here.
// If a colour changes, it changes in that file and nowhere else.
const palette = kit.brand.palette

const config: Config = {
  content: ['./src/**/*.{ts,tsx,mdx}'],
  theme: {
    extend: {
      screens: {
        // The hero's side-by-side composition. The camera reads the same numbers
        // through isHeroSplit(), so the copy and the product always agree on which
        // layout they are in — see src/lib/heroLayout.ts.
        split: { raw: SPLIT_QUERY },
      },
      colors: {
        // 4.69:1 on paper, 4.09:1 on ink. Display type, rules and accents only —
        // never small text on either ground. See the styleguide contrast matrix.
        fire: palette.fire_red,
        // 7.05:1 on paper, 2.66:1 on ink. The red for text on LIGHT grounds only.
        'deep-red': palette.deep_red,
        // The single dark in this design. The canvas runs alpha:true, so this is
        // also what shows through it and what scene fog must match — there is no
        // second near-black.
        ink: palette.ink,
        graphite: palette.graphite,
        steel: palette.steel,
        // 5.98:1 on ink. The accent colour for SMALL text on dark, and the
        // Almaghrabi mark's own colour.
        gold: palette.gold,
        paper: palette.paper,
      },
      fontFamily: {
        // Wired to the next/font CSS variables set in app/[locale]/layout.tsx.
        ar: ['var(--font-ar)', 'system-ui', 'sans-serif'],
        latin: ['var(--font-latin)', 'system-ui', 'sans-serif'],
        // Eyebrows, spec labels and every figure. See layout.tsx.
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        // Display scale. Arabic gets its size bump from the [lang="ar"] rule in
        // globals.css, not from a second set of classes.
        eyebrow: ['0.8125rem', { lineHeight: '1.4', letterSpacing: '0.14em' }],
        'display-sm': ['clamp(1.75rem, 1.2rem + 2.4vw, 2.75rem)', { lineHeight: '1.18' }],
        'display-md': ['clamp(2.25rem, 1.3rem + 4.2vw, 4rem)', { lineHeight: '1.12' }],
        'display-lg': ['clamp(2.75rem, 1.4rem + 6vw, 5.5rem)', { lineHeight: '1.06' }],
        // The hero headline in its split layout, where it shares the width with the
        // turntable: sized to set "Where innovation / meets fire safety" in two
        // lines inside a column that ends at 49% of the viewport.
        'display-hero': ['clamp(2.75rem, 1.1rem + 3.4vw, 4.75rem)', { lineHeight: '1.08' }],
      },
      maxWidth: {
        measure: '62ch',
      },
      transitionTimingFunction: {
        stage: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
}

export default config
