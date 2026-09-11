import { useTranslations } from 'next-intl'

import { high, isRange, low, type Product, type SpecValue } from '@/lib/products'

/**
 * The one place a product spec becomes text.
 *
 * Every figure is read from the Product object, which comes from
 * assets/products.json through lib/products.ts. Nothing here is retyped — if a
 * number on screen disagrees with that file, the file wins and this component is
 * the bug.
 */

/**
 * SX 5/10 is one SKU sold in two charges, so its specs are pairs. Rendered as
 * "5 / 10" rather than flattened to one number, because both are real.
 */
export function specText(value: SpecValue): string {
  return isRange(value) ? `${low(value)} / ${high(value)}` : String(value)
}

/**
 * Model numbers and units are Latin inside Arabic sentences. Without an isolate
 * the digits reorder around Arabic punctuation and "SX 5/10" comes out wrong.
 */
export function ModelName({ name }: { name: string }) {
  return <bdi dir="ltr">{name}</bdi>
}

export interface SpecRow {
  key: string
  label: string
  value: string
  unit: string
}

/** Builds the five spec rows for a product, labels and units from messages. */
export function useSpecRows(product: Product): SpecRow[] {
  const spec = useTranslations('spec')
  const unit = useTranslations('unit')

  return [
    { key: 'agc', label: spec('agc'), value: specText(product.agc_g), unit: unit('g') },
    { key: 'total', label: spec('total'), value: specText(product.total_g), unit: unit('g') },
    {
      key: 'volume',
      label: spec('volume'),
      value: specText(product.volume_m3),
      unit: unit('m3'),
    },
    { key: 'time', label: spec('time'), value: specText(product.time_s), unit: unit('s') },
    {
      key: 'size',
      label: spec('size'),
      value: `${product.length_mm} × ${product.dia_mm}`,
      unit: unit('mm'),
    },
  ]
}

/**
 * `compact`: below md the five rows become a two-column grid, label under figure,
 * so the table takes three short rows instead of five full-width ones and leaves
 * the lower part of a phone screen to the product. From md up it is the table.
 */
export function SpecTable({
  product,
  className = '',
  compact = false,
}: {
  product: Product
  className?: string
  compact?: boolean
}) {
  const rows = useSpecRows(product)

  return (
    <dl className={compact ? `grid grid-cols-2 gap-x-6 md:block ${className}` : className}>
      {rows.map((row) => (
        <div
          key={row.key}
          className={
            compact
              ? 'hairline flex flex-col-reverse gap-0.5 border-b py-2.5 md:flex-row md:items-baseline md:justify-between md:gap-6 md:py-3'
              : 'hairline flex items-baseline justify-between gap-6 border-b py-3'
          }
        >
          <dt className="spec-label font-mono text-xs uppercase tracking-[0.12em] text-steel">
            {row.label}
          </dt>
          <dd className="figure text-lg font-medium text-paper">
            <bdi dir="ltr">
              {row.value} {row.unit}
            </bdi>
          </dd>
        </div>
      ))}
    </dl>
  )
}
