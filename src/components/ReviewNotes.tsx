'use client'

import { useEffect, useState } from 'react'

import { brochureNotes, coverageRuleViolations } from '@/lib/products'

/**
 * The two brochure corrections, available on demand in development.
 *
 * This used to render permanently, in English, over the primary composition, on
 * every section, saying "do not publish". That was the wrong mechanism for the
 * right concern: the figures genuinely do need GENEFIRE's confirmation, but a
 * standing overlay across the whole design is not how you carry an open question
 * — it just makes every screenshot and every demo unpresentable.
 *
 * docs/LAUNCH-CHECKLIST.md is the durable record. This is a convenience: press
 * `r` in development to read the notes without leaving the page.
 */
const isDev = process.env.NODE_ENV !== 'production'

export function ReviewNotes() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!isDev) return
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      if (event.key === 'r' || event.key === 'R') setOpen((value) => !value)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!isDev || !open) return null

  const violations = coverageRuleViolations()

  return (
    <aside
      dir="ltr"
      className="fixed bottom-3 start-3 z-50 max-w-sm rounded-sm border border-gold bg-ink/95 p-4 text-xs text-steel"
      aria-label="Data review notes"
    >
      <p className="font-semibold text-accent-on-dark">
        Awaiting GENEFIRE confirmation — see docs/LAUNCH-CHECKLIST.md
      </p>

      <ul className="mt-3 space-y-3">
        {brochureNotes.map((note) => (
          <li key={note.id}>
            <span className="text-paper">{note.name}</span>
            <span className="block">{note.note}</span>
          </li>
        ))}
      </ul>

      {violations.length > 0 && (
        <p className="mt-3 text-fire">
          Coverage rule broken by: {violations.map((v) => v.id).join(', ')}
        </p>
      )}

      <p className="mt-3 text-[10px] text-graphite">press r to hide</p>
    </aside>
  )
}
