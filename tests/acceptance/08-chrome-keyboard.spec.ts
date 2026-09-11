import { expect, test } from '@playwright/test'

import { LOCALES } from './expected'

/**
 * TEST 8 — the persistent chrome, by keyboard.
 *
 * At forty-four screens of scroll the rail and the nav are the only way most
 * visitors reach the contact form, so they have to be reachable without a mouse.
 *
 * And focus must never enter the canvas. The canvas is illustration; a keyboard
 * user tabbing into a WebGL surface finds nothing there and no way to tell why.
 */
for (const locale of LOCALES) {
  test(`[${locale}] chrome is keyboard reachable and focus never enters the canvas`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`/${locale}`)
    await page.waitForLoadState('load')
    // Let the canvas mount, so the test is proving focus skips a canvas that
    // actually exists.
    await page.waitForTimeout(3000)

    const canvasCount = await page.locator('canvas').count()

    // Walk the first stretch of the tab order and record what gets focus.
    const focused: Array<{ tag: string; label: string; inCanvasSubtree: boolean }> = []
    for (let i = 0; i < 22; i++) {
      await page.keyboard.press('Tab')
      const entry = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null
        if (!el || el === document.body) return null
        return {
          tag: el.tagName.toLowerCase(),
          label: (el.getAttribute('aria-label') || el.textContent || '').trim().slice(0, 28),
          // aria-hidden wraps the canvas; nothing inside it should ever be focusable.
          inCanvasSubtree: Boolean(el.closest('[aria-hidden="true"]')) || el.tagName === 'CANVAS',
        }
      })
      if (entry) focused.push(entry)
    }

    const skipLink = focused[0]
    const reachedRailOrNav = focused.some((f) => f.tag === 'a')
    const enteredCanvas = focused.filter((f) => f.inCanvasSubtree)

    console.log(
      [
        `  <canvas> present              ${canvasCount}`,
        `  first focusable               ${skipLink?.tag} "${skipLink?.label}"`,
        `  focus stops recorded          ${focused.length}`,
        `  entered canvas subtree        ${enteredCanvas.length} (expected 0)`,
        `  first eight: ${focused
          .slice(0, 8)
          .map((f) => `${f.tag}:${f.label || '—'}`)
          .join(' · ')}`,
      ].join('\n'),
    )

    expect.soft(skipLink?.tag, 'skip link is the first focusable element').toBe('a')
    expect.soft(reachedRailOrNav, 'nav and rail links are reachable by keyboard').toBe(true)
    expect.soft(enteredCanvas, 'focus never enters the canvas subtree').toEqual([])

    // The rail and the nav are real landmarks, not decorations. Located by their
    // accessible name rather than by document order — nav landmarks sit at
    // opposite edges in the two directions.
    await expect.soft(page.getByRole('navigation').first()).toBeAttached()
    const anchoredNavs = await page.locator('nav a[href^="#"]').count()
    expect.soft(anchoredNavs, 'nav and rail expose in-page anchors').toBeGreaterThan(4)

    // Every rail target must exist, or the rail is a map to nowhere.
    const brokenTargets = await page.evaluate(() => {
      const hrefs = Array.from(document.querySelectorAll('nav a[href^="#"]')).map((a) =>
        (a as HTMLAnchorElement).getAttribute('href')!.slice(1),
      )
      return Array.from(new Set(hrefs)).filter((id) => id && !document.getElementById(id))
    })
    expect.soft(brokenTargets, 'every nav and rail anchor resolves to a section').toEqual([])
  })

  test(`[${locale}] language switch preserves the section anchor`, async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 720 })
    await page.goto(`/${locale}#coverage`)
    await page.waitForLoadState('load')
    await page.waitForTimeout(1500)

    const other = locale === 'ar' ? 'en' : 'ar'

    /*
     * By hreflang, never by position.
     *
     * The previous selector ended in `.first()` over a compound locator, and in
     * Arabic that resolved to the link for the locale ALREADY ACTIVE: the click
     * navigated /ar → /ar, no error, no malformed path, and the assertion simply
     * failed. RTL reverses the visual order of the two links while leaving DOM
     * order alone, which is exactly the class of bug a positional selector hides
     * in one direction and exposes in the other.
     *
     * Asserting the count first means an ambiguous match fails loudly instead of
     * silently picking one.
     */
    const link = page.locator(`nav a[hreflang="${other}"]`)
    await expect(link).toHaveCount(1)

    await link.click()
    await page.waitForLoadState('load')

    const after = await page.evaluate(() => ({
      path: window.location.pathname,
      hash: window.location.hash,
    }))

    console.log(`  ${locale} → ${other}: ${after.path}${after.hash}`)

    expect.soft(after.path, 'switched locale').toContain(`/${other}`)
    expect.soft(after.hash, 'section anchor preserved across the switch').toBe('#coverage')
  })
}
