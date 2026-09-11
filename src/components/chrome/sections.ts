/**
 * The page's sections, in document order.
 *
 * One list, used by both the progress rail and the nav, so a section can never
 * appear in one and be missing from the other. `key` indexes the `section.*`
 * message namespace; `id` is the DOM anchor.
 */
export interface SectionEntry {
  id: string
  key: string
  /** Shown in the top nav as well as the rail. */
  inNav?: boolean
}

export const SECTIONS: SectionEntry[] = [
  { id: 'hero', key: 'hero' },
  { id: 'about', key: 'about', inNav: true },
  { id: 'problem', key: 'problem' },
  { id: 'activation', key: 'activation' },
  { id: 'series', key: 'series' },
  { id: 'products', key: 'products', inNav: true },
  { id: 'coverage', key: 'coverage', inNav: true },
  { id: 'applications', key: 'applications', inNav: true },
  { id: 'comparison', key: 'comparison' },
  { id: 'certifications', key: 'certifications' },
  { id: 'contact', key: 'contact', inNav: true },
]

export const NAV_SECTIONS = SECTIONS.filter((s) => s.inNav)
