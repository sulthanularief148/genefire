'use client'

import { useEffect, useRef, useState } from 'react'
import { useTranslations } from 'next-intl'

import { useScene } from '@/lib/useScene'
import { SECTIONS } from './sections'

/**
 * The progress rail, down the inline-end edge.
 *
 * Not optional at this scroll depth. The document is roughly forty-four screens;
 * without a map most visitors never reach the contact form, and the ones who do
 * have no idea how much is left.
 *
 * Real links, keyboard reachable, with the section name visible on hover and on
 * focus. The marker follows the scroll through a CSS custom property written from
 * an IntersectionObserver — no React render per scroll tick.
 */
export function ProgressRail() {
  const t = useTranslations('section')
  const a11y = useTranslations('a11y')
  const [current, setCurrent] = useState(SECTIONS[0].id)
  const rail = useRef<HTMLElement>(null)

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return

    // rootMargin biases toward whatever occupies the middle band of the viewport,
    // so a pinned section stays "current" for its whole pin rather than handing
    // over the moment the next one peeks in.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (visible?.target.id) {
          const id = visible.target.id
          setCurrent(id)
          // Published so the locale switch can bring the reader back here.
          useScene.getState().setSection(id)

          // replaceState, never pushState. Pushing would put forty-odd history
          // entries between the reader and the page they arrived from, so the
          // back button would walk them up the document one section at a time.
          if (window.location.hash !== `#${id}`) {
            window.history.replaceState(null, '', `#${id}`)
          }
        }
      },
      { rootMargin: '-40% 0px -40% 0px', threshold: [0, 0.25, 0.5, 1] },
    )

    for (const section of SECTIONS) {
      const el = document.getElementById(section.id)
      if (el) observer.observe(el)
    }
    return () => observer.disconnect()
  }, [])

  return (
    <nav
      ref={rail}
      aria-label={a11y('progress')}
      // pointer-events-none on the column, auto on the links.
      //
      // The rail spans the full viewport height on the inline-end edge, which is
      // exactly where the nav's language switch sits. As a solid hit area it
      // swallowed those clicks: Playwright waited for actionability that never
      // came and the locale switch was unreachable by pointer in RTL, where the
      // second language link falls under the rail.
      className="pointer-events-none fixed inset-y-0 end-0 z-40 hidden items-center pe-3 lg:flex"
    >
      <ol className="space-y-1">
        {SECTIONS.map((section) => {
          const isCurrent = section.id === current
          return (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                aria-current={isCurrent ? 'true' : undefined}
                className="pointer-events-auto group flex items-center justify-end gap-3 py-1 ps-3"
              >
                <span
                  className={`whitespace-nowrap text-xs opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 ${
                    isCurrent ? 'text-paper' : 'text-steel'
                  }`}
                >
                  {t(section.key as 'hero')}
                </span>
                <span
                  aria-hidden="true"
                  className={`block h-px transition-all duration-300 ease-stage ${
                    isCurrent ? 'w-8 bg-gold' : 'w-4 bg-graphite group-hover:bg-steel'
                  }`}
                />
              </a>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
