#!/usr/bin/env node
/**
 * check:rtl — bans physical CSS properties from src/.
 *
 * This project is Arabic-first. Every box model rule must be written once with logical
 * properties and flipped by `dir` on <html>. A `margin-left` in src/ is a bug, not a
 * style choice, so this exits 1 and fails the build.
 *
 * See .claude/skills/arabic-rtl-bilingual/SKILL.md.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'

const ROOT = process.cwd()
const SRC = join(ROOT, 'src')
const EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.css', '.scss', '.mdx']

/** Each rule: what is banned, and what to write instead. */
const RULES = [
  { re: /margin-left\b/g, fix: 'margin-inline-start' },
  { re: /margin-right\b/g, fix: 'margin-inline-end' },
  { re: /padding-left\b/g, fix: 'padding-inline-start' },
  { re: /padding-right\b/g, fix: 'padding-inline-end' },
  { re: /border-left\b/g, fix: 'border-inline-start' },
  { re: /border-right\b/g, fix: 'border-inline-end' },
  { re: /(?<![\w-])left\s*:/g, fix: 'inset-inline-start:' },
  { re: /(?<![\w-])right\s*:/g, fix: 'inset-inline-end:' },
  { re: /text-align\s*:\s*left/g, fix: 'text-align: start' },
  { re: /text-align\s*:\s*right/g, fix: 'text-align: end' },
  // Tailwind physical utilities, including responsive/state prefixes and
  // negatives. The lookahead demands a real utility VALUE — a digit, an arbitrary
  // value, or one of the keyword scales — so that ordinary English prose such as
  // "left-to-right" or "right-hand" is not reported as CSS. A checker that cries
  // wolf on comments gets suppressed, and then it is checking nothing.
  { re: /(?<![\w-])-?ml-(?=\d|\[|px\b|auto\b|full\b)/g, fix: 'ms-*' },
  { re: /(?<![\w-])-?mr-(?=\d|\[|px\b|auto\b|full\b)/g, fix: 'me-*' },
  { re: /(?<![\w-])-?pl-(?=\d|\[|px\b)/g, fix: 'ps-*' },
  { re: /(?<![\w-])-?pr-(?=\d|\[|px\b)/g, fix: 'pe-*' },
  { re: /(?<![\w-])-?left-(?=\d|\[|px\b|auto\b|full\b)/g, fix: 'start-*' },
  { re: /(?<![\w-])-?right-(?=\d|\[|px\b|auto\b|full\b)/g, fix: 'end-*' },
  { re: /(?<![\w-])text-left(?![\w-])/g, fix: 'text-start' },
  { re: /(?<![\w-])text-right(?![\w-])/g, fix: 'text-end' },
]

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (EXTENSIONS.some((e) => entry.endsWith(e))) files.push(full)
  }
  return files
}

let files = []
try {
  files = walk(SRC)
} catch {
  console.error(`check:rtl — no src/ directory at ${SRC}`)
  process.exit(1)
}

const hits = []
for (const file of files) {
  const lines = readFileSync(file, 'utf8').split(/\r?\n/)
  lines.forEach((line, i) => {
    // An explicit, justified exception must say so on the same line.
    if (line.includes('rtl-allow')) return
    for (const rule of RULES) {
      rule.re.lastIndex = 0
      const match = rule.re.exec(line)
      if (match) {
        hits.push({
          file: relative(ROOT, file).split(sep).join('/'),
          line: i + 1,
          found: match[0].trim(),
          fix: rule.fix,
          text: line.trim(),
        })
      }
    }
  })
}

if (hits.length === 0) {
  console.log(`check:rtl — ${files.length} files scanned, no physical CSS properties. ✓`)
  process.exit(0)
}

console.error(`\ncheck:rtl — ${hits.length} physical CSS ${hits.length === 1 ? 'property' : 'properties'} in src/\n`)
for (const h of hits) {
  console.error(`  ${h.file}:${h.line}`)
  console.error(`    ${h.text}`)
  console.error(`    "${h.found}" → use "${h.fix}"\n`)
}
console.error('This project uses logical properties only. See .claude/skills/arabic-rtl-bilingual/SKILL.md.\n')
process.exit(1)
