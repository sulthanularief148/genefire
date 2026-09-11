#!/usr/bin/env node
/**
 * check:messages — ar/en parity in messages/.
 *
 * Parity is the contract, not a key count. A hardcoded number goes stale the first
 * time a string is added; this compares the two key sets directly and reports what
 * is missing on which side.
 *
 * Also catches the two ways a translation silently rots: a key present but empty,
 * and an ICU placeholder like {n} that exists in one language and not the other.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = process.cwd()
const read = (locale) =>
  JSON.parse(readFileSync(join(ROOT, 'messages', `${locale}.json`), 'utf8'))

const ar = read('ar')
const en = read('en')

/** Every leaf path in the tree, dot-joined. */
function leaves(obj, prefix = '') {
  return Object.entries(obj).flatMap(([k, v]) =>
    v && typeof v === 'object' && !Array.isArray(v)
      ? leaves(v, `${prefix}${k}.`)
      : [`${prefix}${k}`],
  )
}

/** Value at a dot path. */
function at(obj, path) {
  return path.split('.').reduce((o, k) => (o == null ? o : o[k]), obj)
}

/** ICU placeholder names, e.g. {n} in calc.multiple. */
function placeholders(value) {
  return new Set(String(value).match(/\{[^}]+\}/g) ?? [])
}

const arKeys = new Set(leaves(ar))
const enKeys = new Set(leaves(en))
const errors = []

for (const k of arKeys) if (!enKeys.has(k)) errors.push(`en is missing  ${k}`)
for (const k of enKeys) if (!arKeys.has(k)) errors.push(`ar is missing  ${k}`)

for (const k of arKeys) {
  if (!enKeys.has(k)) continue

  const a = at(ar, k)
  const e = at(en, k)

  if (typeof a !== 'string' || a.trim() === '') errors.push(`ar is empty    ${k}`)
  if (typeof e !== 'string' || e.trim() === '') errors.push(`en is empty    ${k}`)

  if (typeof a === 'string' && typeof e === 'string') {
    const [pa, pe] = [placeholders(a), placeholders(e)]
    for (const p of pa) if (!pe.has(p)) errors.push(`en is missing ${p} in ${k}`)
    for (const p of pe) if (!pa.has(p)) errors.push(`ar is missing ${p} in ${k}`)
  }
}

if (errors.length) {
  console.error(`\ncheck:messages — ${errors.length} problem${errors.length === 1 ? '' : 's'}\n`)
  for (const e of errors) console.error(`  ${e}`)
  console.error('\nEvery string on this site lives in messages/ar.json and messages/en.json.')
  console.error('Arabic is written first; English is the translation.\n')
  process.exit(1)
}

console.log(`check:messages — ${arKeys.size} keys, ar/en parity OK. ✓`)
