#!/usr/bin/env node
/**
 * Builds the product decal atlas: one texture carrying the GENEFIRE wordmark, the
 * eleven model numbers, and the discharge arrow, for every product on the site.
 *
 * SOURCE ARTWORK, NOT PHOTOGRAPHY. The wordmark is lifted from the flat printed
 * mark on assets/brand/brochure_page1.jpg — the one on white in the centre panel —
 * and reduced to a silhouette: white fill, alpha from ink coverage, nothing else.
 * It is NOT cropped off a product photo. A label cut from a photo carries that
 * photo's highlight and perspective baked in, so mapping it onto a lit cylinder
 * lights the label twice and pins a specular streak to the texture that then
 * refuses to move when the camera does.
 *
 * The model numbers are SET IN TYPE, not traced: Bahnschrift, the DIN-derived
 * squared face, which is the closest match to the squared techno letterforms of
 * the GENEFIRE mark and to the numbers printed on the real units in
 * assets/photos/. Type is baked into the PNG here, so the site carries no font
 * dependency for it at runtime.
 *
 * Colour and alpha only. Everything in the atlas is pure white with an alpha
 * channel; tint happens in the material, which is what lets one atlas serve white
 * marks on the red anodized and polymer bodies and dark marks on the stainless.
 *
 * ONE ATLAS FOR ALL ELEVEN, per the byte budget — not one texture each.
 *
 * Emits:
 *   public/textures/decals.png   the atlas
 *   src/lib/decalAtlas.ts        the cell rectangles, in UV space
 *
 * The rectangles are written from the same layout object that positions the DOM,
 * so the coordinates in the TS file cannot drift from the pixels in the PNG.
 */
import sharp from 'sharp'
import { existsSync, statSync, writeFileSync } from "node:fs"

/* ------------------------------------------------------------ CI: keep it -- */

/*
  NOT REGENERATED ON A BUILD SERVER. Both outputs are committed, and they are the
  correct ones: the model numbers are set in Bahnschrift, which ships with Windows.
  A Linux build machine (Vercel) has no Chromium for Playwright — the deploy failed
  on exactly that — and even with one it would set the numbers in a fallback face
  and quietly commit a different-looking atlas to production.

  So on CI the committed atlas is kept. Regenerate locally with `npm run
  build:decals` and commit both files; FORCE_DECALS=1 overrides this on CI.
*/
const OUT_PNG = 'public/textures/decals.png'
const OUT_TS = 'src/lib/decalAtlas.ts'
const committed = existsSync(OUT_PNG) && existsSync(OUT_TS)

if ((process.env.CI || process.env.VERCEL) && !process.env.FORCE_DECALS && committed) {
  console.log('decals — CI build: keeping the committed atlas (' + OUT_PNG + ')')
  process.exit(0)
}

/* ---------------------------------------------------------------- wordmark -- */

// Measured from the scan by ink profile, not estimated by eye: the mark's ink
// spans x 892-1528, y 500-632 in the 2400x1682 page.
const MARK = { left: 892, top: 500, width: 637, height: 133 }

const { data, info } = await sharp('assets/brand/brochure_page1.jpg')
  .extract(MARK)
  .raw()
  .toBuffer({ resolveWithObject: true })

// Flatten to white + alpha. Alpha is ink coverage against the paper, taken from
// the darkest channel so the red half of the mark comes out as opaque as the
// black half — the wordmark becomes one solid silhouette rather than two tones.
const rgba = Buffer.alloc(MARK.width * MARK.height * 4)
for (let i = 0, j = 0; i < data.length; i += info.channels, j += 4) {
  const ink = 255 - Math.min(data[i], data[i + 1], data[i + 2])
  // Scanned paper is not pure white; below this the pixel is background.
  const a = ink <= 40 ? 0 : Math.min(255, Math.round(((ink - 40) / 215) * 255 * 1.35))
  rgba[j] = 255
  rgba[j + 1] = 255
  rgba[j + 2] = 255
  rgba[j + 3] = a
}
const wordmarkPng = await sharp(rgba, {
  raw: { width: MARK.width, height: MARK.height, channels: 4 },
})
  .png()
  .toBuffer()

const WORDMARK_ASPECT = MARK.width / MARK.height

/* ------------------------------------------------------------------ layout -- */

const ATLAS = { width: 1024, height: 1024 }
const PAD = 8

/** Model numbers, exactly as printed. Order is the products.json order. */
const NUMBERS = [
  'PX1M',
  'PX1E',
  'PX 5',
  'SX 5/10',
  'SX 25',
  'SX 50',
  'SX 100',
  'SX 300',
  'SX 500',
  'SX 750',
  'SX 1500',
]

const cells = []

// The wordmark takes the full top band at its native aspect.
const wmW = ATLAS.width - PAD * 2
const wmH = Math.round(wmW / WORDMARK_ASPECT)
cells.push({ id: 'wordmark', x: PAD, y: PAD, w: wmW, h: wmH })

// Model numbers, three to a row beneath it.
const COLS = 3
const cellW = Math.floor((ATLAS.width - PAD * (COLS + 1)) / COLS)
const cellH = 120
const numbersTop = PAD + wmH + PAD * 2
NUMBERS.forEach((label, i) => {
  cells.push({
    id: 'n' + i,
    label,
    x: PAD + (i % COLS) * (cellW + PAD),
    y: numbersTop + Math.floor(i / COLS) * (cellH + PAD),
    w: cellW,
    h: cellH,
  })
})

// The discharge arrow, last row.
const arrowTop = numbersTop + Math.ceil(NUMBERS.length / COLS) * (cellH + PAD)
cells.push({ id: 'arrow', x: PAD, y: arrowTop, w: 180, h: 120 })

const byId = Object.fromEntries(cells.map((c) => [c.id, c]))

/* ------------------------------------------------------------------- paint -- */

const wordmarkUri = 'data:image/png;base64,' + wordmarkPng.toString('base64')

const numberDivs = NUMBERS.map((label, i) => {
  const c = byId['n' + i]
  return (
    '<div class="cell" style="left:' + c.x + 'px;top:' + c.y + 'px;width:' + c.w +
    'px;height:' + c.h + 'px"><span class="num">' + label + '</span></div>'
  )
}).join('\n  ')

const html =
  '<!doctype html><html><head><meta charset="utf-8"><style>' +
  'html,body{margin:0;padding:0;background:transparent}' +
  '#atlas{position:relative;width:' + ATLAS.width + 'px;height:' + ATLAS.height + 'px}' +
  '.cell{position:absolute;display:flex;align-items:center;justify-content:center;overflow:hidden}' +
  '.num{font-family:"Bahnschrift SemiBold Condensed","Bahnschrift Condensed","Bahnschrift",sans-serif;' +
  'font-weight:600;color:#fff;white-space:nowrap;letter-spacing:0.04em;font-size:96px;line-height:1}' +
  '</style></head><body><div id="atlas">' +
  '<div class="cell" style="left:' + byId.wordmark.x + 'px;top:' + byId.wordmark.y +
  'px;width:' + byId.wordmark.w + 'px;height:' + byId.wordmark.h + 'px">' +
  '<img src="' + wordmarkUri + '" style="width:100%;height:100%;display:block"></div>' +
  numberDivs +
  '<div class="cell" style="left:' + byId.arrow.x + 'px;top:' + byId.arrow.y +
  'px;width:' + byId.arrow.w + 'px;height:' + byId.arrow.h + 'px">' +
  '<svg viewBox="0 0 180 120" width="180" height="120">' +
  '<polygon points="10,20 170,60 10,100 40,60" fill="#fff"/></svg></div>' +
  '</div></body></html>'

// Imported here rather than at the top, so the CI path above never loads it.
const { chromium } = await import('@playwright/test')

// No browser installed (a fresh clone before `npx playwright install`): keep the
// committed atlas rather than failing the whole build over a texture that exists.
let browser
try {
  browser = await chromium.launch()
} catch (error) {
  if (!committed) throw error
  console.warn(
    'decals — no Playwright browser (' + String(error.message).split('\n')[0] +
      '); keeping the committed atlas. Run `npx playwright install chromium` to rebuild it.',
  )
  process.exit(0)
}
const page = await browser.newPage({
  viewport: { width: ATLAS.width, height: ATLAS.height },
  deviceScaleFactor: 1,
})
await page.setContent(html)
await page.evaluate(() => document.fonts.ready)

// Shrink any number that overflows its cell, so "SX 1500" and "SX 5/10" stay on
// one line rather than being clipped.
await page.evaluate(() => {
  for (const span of document.querySelectorAll('.num')) {
    const cell = span.parentElement
    let size = 96
    while (span.scrollWidth > cell.clientWidth - 16 && size > 24) {
      size -= 2
      span.style.fontSize = size + 'px'
    }
  }
})

await page.screenshot({
  path: 'public/textures/decals.png',
  omitBackground: true,
  clip: { x: 0, y: 0, width: ATLAS.width, height: ATLAS.height },
})
await browser.close()

/* -------------------------------------------------------------- emit rects -- */

/** Pixel rect to a UV rect, with V flipped: three's textures put v=0 at the bottom. */
const uv = (c) => ({
  u0: +(c.x / ATLAS.width).toFixed(6),
  v0: +(1 - (c.y + c.h) / ATLAS.height).toFixed(6),
  u1: +((c.x + c.w) / ATLAS.width).toFixed(6),
  v1: +(1 - c.y / ATLAS.height).toFixed(6),
  aspect: +(c.w / c.h).toFixed(4),
})

const numberEntries = NUMBERS.map(
  (label, i) => '    ' + JSON.stringify(label) + ': ' + JSON.stringify(uv(byId['n' + i])) + ',',
).join('\n')

const ts = `// GENERATED by scripts/build-decal-atlas.mjs — do not edit by hand.
//
// Cell rectangles in the decal atlas, in UV space with v=0 at the bottom, plus
// each cell's aspect ratio so geometry can be built without distorting the art.
// Written from the same layout that positioned the pixels, so these cannot drift
// from public/textures/decals.png.

export interface AtlasCell {
  u0: number
  v0: number
  u1: number
  v1: number
  /** width / height of the cell, for sizing panels without stretching type. */
  aspect: number
}

export const DECAL_ATLAS: {
  wordmark: AtlasCell
  arrow: AtlasCell
  numbers: Record<string, AtlasCell | undefined>
} = {
  wordmark: ${JSON.stringify(uv(byId.wordmark))},
  arrow: ${JSON.stringify(uv(byId.arrow))},
  numbers: {
${numberEntries}
  },
}

/** Model number as printed, by product id. Order matches assets/products.json. */
export const MODEL_NUMBER: Record<string, string> = {
  px1m: 'PX1M',
  px1e: 'PX1E',
  px5: 'PX 5',
  sx5_10: 'SX 5/10',
  sx25: 'SX 25',
  sx50: 'SX 50',
  sx100: 'SX 100',
  sx300: 'SX 300',
  sx500: 'SX 500',
  sx750: 'SX 750',
  sx1500: 'SX 1500',
}
`
writeFileSync('src/lib/decalAtlas.ts', ts)

const meta = await sharp('public/textures/decals.png').metadata()
console.log(
  'decals — atlas ' + ATLAS.width + 'x' + ATLAS.height + ', ' + cells.length + ' cells, ' +
    (statSync("public/textures/decals.png").size / 1024).toFixed(0) + ' KB -> public/textures/decals.png',
)
