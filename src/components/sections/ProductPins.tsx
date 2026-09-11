import { useTranslations } from 'next-intl'

import { PinnedSection } from '@/components/scroll/PinnedSection'
import { ModelName, SpecTable } from '@/components/product/SpecTable'
import { Link } from '@/i18n/navigation'
import { products, seriesOf, type Product } from '@/lib/products'

/**
 * Section 05 — one pinned section per SKU, eleven of them, 180vh each.
 *
 * Identical grammar every time, so the run reads as a system rather than as
 * repetition:
 *   0.00–0.30  product to centre, turntable starts, model name masks up
 *   0.30–0.55  spec figures appear — AGC, total, volume, discharge, dimensions
 *   0.55–0.80  exploded view, leader lines to labelled hotspots
 *   0.80–1.00  reassemble, recede, the next product bleeds in
 *
 * Every figure comes from assets/products.json via lib/products.ts. The beats are
 * the same array in every pin, so the copy and the 3D cannot drift apart.
 */

const BEATS = [0.3, 0.55, 0.8] as const

export function ProductPins() {
  return (
    // overflow: clip, so the sticky index below cannot hang out of this container
    // over the next section. Clip, not hidden: it creates no scroll container, so
    // the index still sticks, and pinned sections still pin.
    <div id="products" className="relative [overflow:clip]">
      <ProductRail />
      {products.map((product) => (
        <ProductPin key={product.id} product={product} />
      ))}
    </div>
  )
}

/**
 * Sticky sub-nav listing all eleven. Forty screens of scroll is a long way to go
 * without a map, and this is also the fastest route to any single spec sheet.
 */
function ProductRail() {
  const nav = useTranslations('nav')

  return (
    <nav
      aria-label={nav('products')}
      // Zero height, so it adds none; the list hangs below it. When the products
      // end it parks on the container's bottom edge with the list still hanging,
      // and it was running straight down over the coverage calculator — the
      // container's overflow: clip is what stops it there.
      className="pointer-events-none sticky top-0 z-30 hidden h-0 lg:block"
    >
      <ul className="pointer-events-auto absolute end-6 top-24 space-y-1 text-xs">
        {products.map((product) => (
          <li key={product.id}>
            <a
              href={`#product-${product.id}`}
              className="block px-2 py-1 text-steel transition-colors duration-200 hover:text-paper"
              data-rail={product.id}
            >
              <ModelName name={product.name} />
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}

/**
 * The four exploded-view callouts.
 *
 * OUT OF FLOW, deliberately. In flow they added ~150px to every product section,
 * which pushed the Arabic section to 837px against a 720px viewport — and a
 * pinned section taller than the viewport is not merely ugly, it is unreachable:
 * the overflow cannot be scrolled to for the entire pin duration, so the
 * datasheet link below them was invisible for the whole of section 05. Absolute
 * positioning keeps them real DOM text in the accessibility tree while removing
 * them from the height calculation.
 *
 * The fixed positions are only legitimate because of screen-space anchoring: the
 * camera holds the product at a constant fraction of the viewport for the whole
 * pin, so a callout parked at a fixed percentage genuinely points at the same
 * part every time, in both languages.
 *
 * Ordered as the parts separate along the axis — outlet at the top, bracket to
 * the side at the bottom.
 */
const HOTSPOTS = [
  { role: 'outlet', top: '34%' },
  { role: 'charge', top: '47%' },
  { role: 'actuator', top: '60%' },
  { role: 'bracket', top: '73%' },
] as const

function Hotspots() {
  const t = useTranslations('product')

  return (
    <ul
      // The callouts sit just outside the product on the far side of it from the
      // copy. The camera anchors the product at 66% of the viewport width from
      // the reading edge, so the leader lines start at 76% and run back toward it.
      className="pointer-events-none absolute inset-y-0 start-[76%] hidden split:block"
      aria-label={t('explode')}
    >
      {HOTSPOTS.map(({ role, top }) => (
        <li
          key={role}
          className="beat beat-veiled beat-2 absolute flex items-center gap-3 whitespace-nowrap"
          style={{ insetBlockStart: top }}
          data-anim
        >
          {/* The leader line, running back toward the part it names. */}
          <span aria-hidden="true" className="h-px w-12 bg-gold" />
          <span className="text-sm text-steel">{t(`hotspot.${role}` as 'hotspot.actuator')}</span>
        </li>
      ))}
    </ul>
  )
}

function ProductPin({ product }: { product: Product }) {
  const t = useTranslations('product')
  const seriesLabel = useTranslations('series')
  const series = seriesOf(product.id)
  const seriesName = (id: string) => seriesLabel(`${id}.name` as 'px.name')

  return (
    <PinnedSection
      id={`product-${product.id}`}
      length="180%"
      channel="product"
      mode="product"
      active={product.id}
      beats={BEATS}
      // Stacked: copy at the top, the lower part of the screen left to the product
      // (CameraRig productFraming anchors it there). Side by side: centred.
      className="relative flex min-h-dvh items-start px-6 pb-10 pt-24 md:px-12 md:pt-28 lg:px-20 split:items-center split:py-16"
    >
      <div className="w-full max-w-md">
        <p className="eyebrow beat beat-0" data-anim>
          {series ? seriesName(series.id) : null}
        </p>

        <h2 className="display beat beat-0 mt-2 text-display-md font-semibold text-paper md:mt-3" data-anim>
          <ModelName name={product.name} />
        </h2>

        {/* Spec figures — beat 1, once the product has settled. */}
        <SpecTable product={product} compact className="beat beat-1 mt-4 md:mt-7" />

        <p className="beat beat-1 mt-4 md:mt-7" data-anim>
          <Link
            href={`/products/${product.id}`}
            className="text-sm font-medium text-accent-on-dark underline underline-offset-4"
          >
            {t('datasheet')}
          </Link>
        </p>
      </div>

      <Hotspots />
    </PinnedSection>
  )
}
