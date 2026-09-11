import { useTranslations } from 'next-intl'

import { SceneModeOnView } from '@/components/scroll/SceneModeOnView'

/**
 * Section 08 — why condensed aerosol. Not pinned, DOM only.
 *
 * Deliberately quiet. After six sections of scroll-driven 3D the eye needs
 * somewhere to rest, and a technical buyer needs somewhere to actually read.
 *
 * ROW ORDER MATTERS. `retrofit` is last because retrofitting into an existing
 * cabinet is the argument that wins the sale, and the last row is the one still
 * in mind when the reader reaches the calculator.
 *
 * SOURCING: the aerosol column is brochure-sourced. The other three columns are
 * general characteristics of those SYSTEM CATEGORIES, not GENEFIRE claims, and
 * they carry a visible qualifier saying so.
 *
 * The categories are named rather than the products — "halocarbon clean agent"
 * rather than FM-200 or Novec. Those are trademarks, and an unsourced comparative
 * claim against a named competitor product in a regulated life-safety market
 * carries materially more exposure than a category claim. A fire-safety
 * consultant reads the categories identically, so the argument is unaffected and
 * the retrofit row still lands. The client's technical people can approve
 * product names in writing later.
 */

type Value =
  | 'yes'
  | 'no'
  | 'none'
  | 'low'
  | 'high'
  | 'minimal'
  | 'plantroom'
  | 'water'
  | 'restricted'
  | 'nondamaging'

interface Row {
  key: 'occupied' | 'piping' | 'cost' | 'residue' | 'gwp' | 'space' | 'retrofit'
  aerosol: Value
  halocarbon: Value
  inert: Value
  sprinkler: Value
}

const ROWS: Row[] = [
  { key: 'occupied', aerosol: 'yes', halocarbon: 'yes', inert: 'restricted', sprinkler: 'yes' },
  { key: 'piping', aerosol: 'no', halocarbon: 'yes', inert: 'yes', sprinkler: 'yes' },
  { key: 'cost', aerosol: 'low', halocarbon: 'high', inert: 'high', sprinkler: 'high' },
  { key: 'residue', aerosol: 'nondamaging', halocarbon: 'none', inert: 'none', sprinkler: 'water' },
  { key: 'gwp', aerosol: 'none', halocarbon: 'high', inert: 'none', sprinkler: 'none' },
  {
    key: 'space',
    aerosol: 'minimal',
    halocarbon: 'plantroom',
    inert: 'plantroom',
    sprinkler: 'plantroom',
  },
  // Last, on purpose.
  { key: 'retrofit', aerosol: 'yes', halocarbon: 'no', inert: 'no', sprinkler: 'no' },
]

const COLUMNS = ['aerosol', 'halocarbon', 'inert', 'sprinkler'] as const

export function Comparison() {
  const t = useTranslations('cmp')

  return (
    <section id="comparison" className="px-6 py-28 md:px-12 lg:px-20">
      <SceneModeOnView mode="rest" />
      <h2 className="display text-display-md font-semibold text-paper">{t('title')}</h2>

      <div className="mt-10 overflow-x-auto">
        <table className="w-full min-w-[42rem] border-collapse text-sm">
          <caption className="sr-only">{t('title')}</caption>
          <thead>
            <tr className="border-b border-graphite">
              <th scope="col" className="py-4 text-start font-medium text-steel" />
              {COLUMNS.map((column) => (
                <th
                  key={column}
                  scope="col"
                  className={`py-4 text-start font-medium ${
                    column === 'aerosol' ? 'text-paper' : 'text-steel'
                  }`}
                >
                  {t(`col.${column}` as 'col.halocarbon')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row) => (
              <tr key={row.key} className="border-b border-graphite">
                <th scope="row" className="py-4 text-start font-normal text-steel">
                  {t(row.key)}
                </th>
                {COLUMNS.map((column) => (
                  <td
                    key={column}
                    className={`py-4 ${column === 'aerosol' ? 'text-paper' : 'text-steel'}`}
                  >
                    {t(`val.${row[column]}` as 'val.yes')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Visible, not a footnote: it says which column is sourced and which is not. */}
      <p className="mt-8 max-w-measure text-sm text-steel">{t('note')}</p>
    </section>
  )
}
