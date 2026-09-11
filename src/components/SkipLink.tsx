import { useTranslations } from 'next-intl'

/**
 * First focusable element in the document. The page is roughly forty screens of
 * scroll-driven content; a keyboard user must be able to step over the chrome.
 */
export function SkipLink() {
  const t = useTranslations('a11y')
  return (
    <a href="#main" className="skip-link">
      {t('skip')}
    </a>
  )
}
