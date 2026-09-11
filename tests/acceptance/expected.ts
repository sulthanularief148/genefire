/**
 * What the suite expects.
 *
 * There is deliberately NO per-section pixel table any more. The previous one
 * encoded "every pinned section is exactly 100vh", which was never true — the
 * product sections ran to 837px against a 720px viewport — and which is
 * locale-dependent, because Arabic renders at 1.06em with a 1.85 line height and
 * comes out taller than the same section in English.
 *
 * A table like that fails with an arithmetic discrepancy and leaves you to work
 * out what it means. The invariants below fail by naming the defect instead.
 */

export const VIEWPORT: { width: number; height: number } = { width: 1280, height: 720 }

export const PRODUCT_IDS = [
  'sx5_10',
  'sx25',
  'sx50',
  'px1m',
  'px1e',
  'sx100',
  'sx300',
  'px5',
  'sx500',
  'sx750',
  'sx1500',
] as const

/** Every pinned section, in document order. */
export const PINNED_SECTION_IDS = [
  'hero',
  'about',
  'problem',
  'activation',
  'series',
  ...PRODUCT_IDS.map((id) => `product-${id}`),
  'applications',
] as const

/**
 * Sections that keep their pins below 768. Everything else becomes ordinary flow
 * content at that tier — see src/lib/tier.ts.
 */
export const COMPACT_PINNED_IDS = ['hero', 'problem', 'activation', 'series', 'applications'] as const

/** The responsive matrix. Each entry is a viewport and the tier it should select. */
export const TIER_MATRIX = [
  { width: 375, height: 667, tier: 'compact' },
  { width: 1024, height: 768, tier: 'mid' },
  { width: 1280, height: 720, tier: 'full' },
] as const

export const EXPECTED_TRIGGER_COUNT = PINNED_SECTION_IDS.length

export const TOLERANCE = {
  /** spacer === element height + pin duration. Sub-pixel rounding only. */
  spacerPx: 1,
  /** Natural-flow page height, measured rather than assumed. */
  collapsedPx: 40,
} as const

export const LOCALES = ['ar', 'en'] as const
export type Locale = (typeof LOCALES)[number]
