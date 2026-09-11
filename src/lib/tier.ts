/**
 * Responsive tiers, per docs/03-site-structure-spec.md.
 *
 *   full     >= 1280  every pin, the whole post stack, 12 000 particles
 *   mid      768-1279 every pin at ~70% distance, post minus chromatic aberration
 *   compact  < 768    pins only on §01, §03, §04; no post; dpr [1, 1.5];
 *                     4 000 particles; shadows off
 *
 * VIEWPORT-driven, and deliberately separate from `lowPower`, which is
 * DEVICE-driven (core count, mobile UA). A narrow window on a workstation is
 * `compact` but not low power; a phone in landscape is `mid` but still low power.
 * Conflating them makes one of the two wrong.
 */
export type Tier = 'full' | 'mid' | 'compact'

export const TIER_BREAKPOINTS = { mid: 768, full: 1280 } as const

export function tierForWidth(width: number): Tier {
  if (width >= TIER_BREAKPOINTS.full) return 'full'
  if (width >= TIER_BREAKPOINTS.mid) return 'mid'
  return 'compact'
}

export function currentTier(): Tier {
  if (typeof window === 'undefined') return 'full'
  return tierForWidth(window.innerWidth)
}

/**
 * Sections that stay pinned at each tier.
 *
 * At `compact` only the sections that need scroll to say anything at all keep
 * their pins: the hero, the problem, the discharge, the series rail and the
 * applications drum. Each of those shows ONE thing at a time from a stack, so
 * unpinned it could only ever show its last state — the problem section read
 * "03 / 03" with the first two statements never seen. Everything else becomes
 * ordinary flow content with a reveal, because forty screens of pinned scroll on
 * a phone is a way of losing the reader before the contact form.
 */
const COMPACT_PINS = new Set(['hero', 'problem', 'activation', 'series', 'applications'])

export function isPinnedAtTier(sectionId: string, tier: Tier): boolean {
  if (tier !== 'compact') return true
  // Product pins share a prefix; none of them survive to compact.
  return COMPACT_PINS.has(sectionId)
}

/** Pinned scroll distance multiplier. Mid cuts roughly 30%. */
export function pinScaleForTier(tier: Tier): number {
  return tier === 'mid' ? 0.7 : 1
}

/** Particle counts. The spec's numbers, keyed on viewport rather than device. */
export function particleCountForTier(tier: Tier, lowPower: boolean): number {
  return tier === 'compact' || lowPower ? 4000 : 12000
}

export function emberCountForTier(tier: Tier, lowPower: boolean): number {
  return tier === 'compact' || lowPower ? 600 : 1500
}

/** Post-processing: the whole stack, the stack minus chromatic aberration, or none. */
export function postForTier(tier: Tier, lowPower: boolean): 'full' | 'reduced' | 'none' {
  if (tier === 'compact' || lowPower) return 'none'
  return tier === 'mid' ? 'reduced' : 'full'
}
