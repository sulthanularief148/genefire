/**
 * The product data layer.
 *
 * assets/products.json is the ONLY source of product truth on this site. Nothing in
 * src/ may retype a spec figure — every number on screen must arrive through this
 * module. If a component disagrees with the JSON, the JSON is right and the
 * component is a bug.
 *
 * Two figures in the file are corrections to the printed brochure (SX 100 volume,
 * SX 500 AGC). They are flagged as `brochure_typo` and must be confirmed by GENEFIRE
 * before launch — see `brochureNotes` below and .claude/skills/genefire-product-data.
 */
import kit from '../../assets/products.json'

/* ---------------------------------------------------------------- types --- */

/**
 * SX 5/10 is a single SKU sold in two charges, so its specs are pairs. Every other
 * SKU carries a scalar. Read them through `low()` / `high()` rather than branching
 * at each call site.
 */
export type SpecValue = number | [number, number]

export type Finish = 'red_anodized' | 'red_polymer' | 'stainless'

export interface Product {
  id: string
  /** Renders exactly as printed: "PX1M", "PX 5", "SX 5/10", "SX 1500". */
  name: string
  form: string
  agc_g: SpecValue
  total_g: SpecValue
  volume_m3: SpecValue
  time_s: SpecValue
  length_mm: number
  dia_mm: number
  finish: Finish
  accent: string
  section?: string
  has_cap?: boolean
  bracket?: boolean
  note_en?: string
  note_ar?: string
  /** Present only where the printed sheet disagrees with the range-wide rule. */
  brochure_typo?: string
}

export interface Series {
  id: 'px' | 'sx_small' | 'sx_industrial'
  name_en: string
  name_ar: string
  sub_en: string
  sub_ar: string
  products: Product[]
}

export interface Brand {
  company_en: string
  company_ar: string
  role_en: string
  role_ar: string
  principal: string
  tagline_en: string
  tagline_ar: string
  address_en: string
  address_ar: string
  phones: string[]
  email: string
  palette: Record<string, string>
  certifications: string[]
  fire_classes: string[]
  applications_en: string[]
  applications_ar: string[]
}

export interface BilingualClaim {
  en: string
  ar: string
}

interface Kit {
  brand: Brand
  design_rule: { coverage_per_gram_m3: number; note: string }
  series: Series[]
  advantages: BilingualClaim[]
  eco_claims: BilingualClaim[]
  key_features: BilingualClaim[]
}

const data = kit as unknown as Kit

/* ------------------------------------------------------------ accessors --- */

export const brand: Brand = data.brand
export const palette = data.brand.palette
export const series: Series[] = data.series
export const advantages = data.advantages
export const ecoClaims = data.eco_claims
export const keyFeatures = data.key_features

/**
 * The whole range, smallest protected volume first. This is the order the Series
 * rail and the product pins read in.
 */
export const products: Product[] = data.series
  .flatMap((s) => s.products)
  .sort((a, b) => high(a.volume_m3) - high(b.volume_m3))

export function getProduct(id: string): Product | undefined {
  return products.find((p) => p.id === id)
}

export function getSeries(id: Series['id']): Series | undefined {
  return series.find((s) => s.id === id)
}

/** The series a given SKU belongs to. */
export function seriesOf(productId: string): Series | undefined {
  return series.find((s) => s.products.some((p) => p.id === productId))
}

/* --------------------------------------------------------- spec helpers --- */

/** Lower bound of a spec — the same number for every SKU except SX 5/10. */
export function low(value: SpecValue): number {
  return Array.isArray(value) ? value[0] : value
}

/** Upper bound of a spec. Sizing always works from this. */
export function high(value: SpecValue): number {
  return Array.isArray(value) ? value[1] : value
}

export function isRange(value: SpecValue): value is [number, number] {
  return Array.isArray(value)
}

/* ------------------------------------------------------- the design rule --- */

/**
 * GENEFIRE AGC protects 0.05 m³ per gram — 5 m³ per 100 g — flat across the entire
 * range. Every coverage figure on the site derives from this constant and nothing
 * else.
 */
export const COVERAGE_PER_GRAM_M3 = data.design_rule.coverage_per_gram_m3

/** Grams of agent required to protect a given enclosure volume. */
export function requiredAgcGrams(volumeM3: number): number {
  return volumeM3 / COVERAGE_PER_GRAM_M3
}

/** Protected volume delivered by a given charge of agent. */
export function protectedVolumeM3(agcGrams: number): number {
  return agcGrams * COVERAGE_PER_GRAM_M3
}

/** The largest volume a single unit in the range can protect (SX 1500, 75 m³). */
export const MAX_SINGLE_UNIT_M3 = Math.max(...products.map((p) => high(p.volume_m3)))

/**
 * The smallest SKU that covers `volumeM3` on its own.
 *
 * Above MAX_SINGLE_UNIT_M3 no single unit is enough; the largest SKU is returned and
 * `unitsNeeded` gives the count to install. Callers must show both figures together.
 */
export function recommendUnit(volumeM3: number): Product {
  const fit = products.find((p) => high(p.volume_m3) >= volumeM3)
  return fit ?? products[products.length - 1]
}

/** The next SKU up from the recommendation, if the range has one. */
export function nextSizeUp(volumeM3: number): Product | undefined {
  const unit = recommendUnit(volumeM3)
  return products[products.indexOf(unit) + 1]
}

/** How many of `recommendUnit(volumeM3)` are required to cover the volume. */
export function unitsNeeded(volumeM3: number): number {
  if (volumeM3 <= 0) return 0
  const unit = recommendUnit(volumeM3)
  return Math.ceil(volumeM3 / high(unit.volume_m3))
}

/* --------------------------------------------------- review + integrity --- */

/** Corrections to the printed brochure that GENEFIRE must confirm before launch. */
export const brochureNotes = products
  .filter((p): p is Product & { brochure_typo: string } => Boolean(p.brochure_typo))
  .map((p) => ({ id: p.id, name: p.name, note: p.brochure_typo }))

/**
 * Every SKU must satisfy volume_m3 = agc_g × 0.05. Returns the SKUs that do not —
 * an empty array means the catalogue is internally consistent.
 */
export function coverageRuleViolations(): Array<{ id: string; expected: number; actual: number }> {
  const out: Array<{ id: string; expected: number; actual: number }> = []
  for (const p of products) {
    const expected = protectedVolumeM3(high(p.agc_g))
    const actual = high(p.volume_m3)
    if (Math.abs(expected - actual) > 1e-9) out.push({ id: p.id, expected, actual })
  }
  return out
}
