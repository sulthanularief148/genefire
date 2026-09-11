/*
  GENERATED — do not edit.
  Regenerate: node scripts/gen-product-components.mjs
*/
import type { ComponentType } from 'react'
import type { ThreeElements } from '@react-three/fiber'

import { PX1E } from './PX1E'
import { PX1M } from './PX1M'
import { PX5 } from './PX5'
import { SX100 } from './SX100'
import { SX1500 } from './SX1500'
import { SX25 } from './SX25'
import { SX300 } from './SX300'
import { SX50 } from './SX50'
import { SX500 } from './SX500'
import { SX5_10 } from './SX5_10'
import { SX750 } from './SX750'

export type ProductModelProps = ThreeElements['group']

/** Keyed by the product id in assets/products.json. */
export const PRODUCT_MODELS: Record<string, ComponentType<ProductModelProps>> = {
  px1e: PX1E,
  px1m: PX1M,
  px5: PX5,
  sx100: SX100,
  sx1500: SX1500,
  sx25: SX25,
  sx300: SX300,
  sx50: SX50,
  sx500: SX500,
  sx5_10: SX5_10,
  sx750: SX750,
}

export { PX1E, PX1M, PX5, SX100, SX1500, SX25, SX300, SX50, SX500, SX5_10, SX750 }
