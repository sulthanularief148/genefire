#!/usr/bin/env node
/**
 * Extracts the Almaghrabi calligraphic mark from the brochure as flat art.
 *
 * Same method as the GENEFIRE wordmark in build-decal-atlas.mjs, and for the same
 * reason: this is the company's own identity, so it is lifted from the printed
 * lockup rather than redrawn, and it is reduced to a silhouette rather than
 * cropped as a picture. A JPEG crop would carry the paper, the scan's cast and a
 * rectangle of white around it.
 *
 * The mark is GOLD on white, so the alpha comes from warm-ink coverage — a
 * darkness threshold would also pick up the black "ALMAGHRABI / FOR TRADING
 * SERVICES" type set beneath it, which is a separate piece of artwork and is
 * already on the page as real text.
 *
 * Output is WHITE with an alpha channel, not gold. The page paints it through
 * `mask-image` so its colour comes from the --gold token, and the mark cannot
 * drift away from the palette in assets/products.json.
 */
import sharp from 'sharp'
import { mkdirSync, statSync } from 'node:fs'

// Located by ink profile over the centre panel, not estimated: warm ink spans
// x 1112-1313, y 32-237 in the 2400x1682 scan.
const MARK = { left: 1108, top: 28, width: 210, height: 214 }

const { data, info } = await sharp('assets/brand/brochure_page1.jpg')
  .extract(MARK)
  .raw()
  .toBuffer({ resolveWithObject: true })

const out = Buffer.alloc(MARK.width * MARK.height * 4)
for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
  const r = data[i]
  const g = data[i + 1]
  const b = data[i + 2]
  // Warmth is what separates the gold mark from the paper and from black type.
  const warmth = r - b
  // Coverage: how far this pixel is from paper white, weighted by warmth so a
  // grey speck in the scan contributes nothing.
  const ink = 255 - Math.min(r, g, b)
  const a = warmth > 18 && ink > 25 ? Math.min(255, Math.round((ink / 190) * 255)) : 0
  out[j] = 255
  out[j + 1] = 255
  out[j + 2] = 255
  out[j + 3] = a
}

mkdirSync('public/brand', { recursive: true })
await sharp(out, { raw: { width: MARK.width, height: MARK.height, channels: 4 } })
  .png()
  .toFile('public/brand/almaghrabi-mark.png')

const size = statSync('public/brand/almaghrabi-mark.png').size
console.log(
  `brand:mark — ${MARK.width}x${MARK.height}, ${(size / 1024).toFixed(1)} KB ` +
    '-> public/brand/almaghrabi-mark.png',
)
