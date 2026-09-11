'use client'

import { useId, type FormEvent } from 'react'
import { useLocale, useTranslations } from 'next-intl'

import { SceneModeOnView } from '@/components/scroll/SceneModeOnView'
import { brand, recommendUnit } from '@/lib/products'
import { useScene } from '@/lib/useScene'

/**
 * Section 10 — contact.
 *
 * The details sit at the inline-start edge over the globe's horizon — Riyadh lit
 * on the curve of the Earth (NetworkGlobe, mode 'contact') — and the enquiry form
 * sits beside them on a glass panel.
 *
 * SENDING. There is no backend in this build, and a form that posts nowhere and
 * says "thank you" silently loses enquiries. So the form composes the enquiry as
 * an email to the address on the client's own brochure and opens the reader's mail
 * app with it written — a channel that genuinely reaches the client, stated as
 * exactly that under the button. Replacing it with a real endpoint later is a
 * change to onSubmit and nothing else.
 *
 * The enclosure volume is pre-filled from whatever the visitor entered in the
 * calculator, so the figures they worked out arrive with the enquiry instead of
 * being retyped from memory. Same store, no round trip.
 *
 * Every contact detail is the brochure's: two mobile numbers, one email, one
 * address. Nothing else — no hours, no WhatsApp, no social links — because nothing
 * else has been supplied.
 */

/** The brochure address, as a maps search. A search, not a pin: no coordinates were supplied. */
const MAPS_URL = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
  'Othman Bin Affan Road, Al Nuzha, Riyadh, Saudi Arabia',
)}`

export function Contact() {
  const t = useTranslations('contact')
  const calc = useTranslations('calc')
  const unit = useTranslations('unit')
  const section = useTranslations('section')
  const brandT = useTranslations('brand')
  const locale = useLocale() as 'ar' | 'en'
  const ids = useId()

  const room = useScene((s) => s.room)
  const volume = Math.round(room.l * room.w * room.h * 100) / 100
  const recommended = recommendUnit(volume)

  const onSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const field = (name: string) => String(form.get(name) ?? '').trim()
    const appIndex = brand.applications_en.indexOf(field('application'))
    const application =
      appIndex >= 0
        ? locale === 'ar'
          ? brand.applications_ar[appIndex]
          : brand.applications_en[appIndex]
        : field('application')

    const lines = [
      `${t('name')}: ${field('name')}`,
      `${t('company')}: ${field('company')}`,
      `${t('phone')}: ${field('phone')}`,
      `${calc('application')}: ${application}`,
      `${calc('volume')}: ${field('volume')} ${unit('m3')}`,
      `${calc('result')}: ${recommended.name}`,
      '',
      field('message'),
    ]
    const subject = `${t('subject')} — ${field('name')}${field('company') ? ` (${field('company')})` : ''}`
    window.location.href = `mailto:${brand.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join('\n'))}`
  }

  return (
    <section id="contact" className="relative min-h-dvh px-6 py-24 md:px-12 md:py-28 lg:px-20">
      <SceneModeOnView mode="contact" />

      <div className="relative z-10 grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <p className="eyebrow flex items-center gap-3" data-reveal>
            <span aria-hidden="true" className="h-px w-8 shrink-0 bg-gold/70" />
            {section('contact')}
          </p>
          <h2 className="display mt-4 text-display-md font-semibold text-paper" data-reveal>
            {t('title')}
          </h2>
          <p className="mt-4 max-w-measure text-lg text-steel" data-reveal>
            {brandT('role')}
          </p>

          <ul className="mt-10 grid max-w-lg gap-3">
            <li className="contact-card" data-reveal>
              <Icon kind="phone" />
              <div>
                <p className="text-xs text-steel">{t('phone')}</p>
                <div className="mt-1 flex flex-wrap gap-x-5 gap-y-1">
                  {brand.phones.map((phone) => (
                    // Phone numbers never flip.
                    <a key={phone} href={`tel:${phone}`} className="contact-link figure text-lg" dir="ltr">
                      {phone}
                    </a>
                  ))}
                </div>
              </div>
            </li>
            <li className="contact-card" data-reveal>
              <Icon kind="mail" />
              <div>
                <p className="text-xs text-steel">{t('email')}</p>
                <a href={`mailto:${brand.email}`} className="contact-link mt-1 inline-block text-lg" dir="ltr">
                  {brand.email}
                </a>
              </div>
            </li>
            <li className="contact-card" data-reveal>
              <Icon kind="pin" />
              <div>
                {/* A label, not the address itself — the key the label used to read
                    holds the address, so it was printed twice. */}
                <p className="text-xs text-steel">{t('addressLabel')}</p>
                <p className="mt-1 text-base text-paper">{t('address')}</p>
                <a
                  href={MAPS_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-link mt-2 inline-block text-sm text-gold"
                >
                  {t('maps')}
                </a>
              </div>
            </li>
          </ul>
        </div>

        <form className="glass-panel space-y-5 p-6 md:p-8" onSubmit={onSubmit} data-reveal>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id={`${ids}-name`} name="name" label={t('name')} autoComplete="name" required />
            <Field id={`${ids}-company`} name="company" label={t('company')} autoComplete="organization" />
          </div>
          <Field id={`${ids}-phone`} name="phone" label={t('phone')} type="tel" autoComplete="tel" required />

          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label htmlFor={`${ids}-application`} className="block text-sm text-steel">
                {calc('application')}
              </label>
              <select id={`${ids}-application`} name="application" className="field mt-2 w-full">
                {brand.applications_en.map((app, i) => (
                  <option key={app} value={app} className="bg-ink">
                    {locale === 'ar' ? brand.applications_ar[i] : app}
                  </option>
                ))}
              </select>
            </div>

            {/* Pre-filled from §06. Editable — the calculator is indicative sizing,
                and the person enquiring may know better than it does. */}
            <div>
              <label htmlFor={`${ids}-volume`} className="block text-sm text-steel">
                {calc('volume')} ({unit('m3')})
              </label>
              <input
                id={`${ids}-volume`}
                name="volume"
                type="number"
                inputMode="decimal"
                min={0.1}
                step={0.1}
                defaultValue={volume}
                key={volume}
                className="field figure mt-2 w-full"
              />
            </div>
          </div>
          <p className="-mt-2 text-xs text-steel">
            {calc('result')}: <bdi dir="ltr">{recommended.name}</bdi>
          </p>

          <div>
            <label htmlFor={`${ids}-message`} className="block text-sm text-steel">
              {t('message')}
            </label>
            <textarea id={`${ids}-message`} name="message" rows={4} className="field mt-2 w-full" />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
            <button type="submit" className="btn-primary">
              {t('submit')}
            </button>
            <p className="max-w-xs text-xs text-steel">{t('sendNote')}</p>
          </div>

          {/* The same qualifier the calculator carries: the volume above came from
              indicative sizing, and it travels with the enquiry. */}
          <p className="hairline border-t pt-4 text-xs text-steel">{calc('disclaimer')}</p>
        </form>
      </div>
    </section>
  )
}

function Field({
  id,
  name,
  label,
  type = 'text',
  autoComplete,
  required,
}: {
  id: string
  name: string
  label: string
  type?: string
  autoComplete?: string
  required?: boolean
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm text-steel">
        {label}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        autoComplete={autoComplete}
        required={required}
        className="field mt-2 w-full"
      />
    </div>
  )
}

/** Line icons, decorative. Never mirrored: a phone is not a direction. */
function Icon({ kind }: { kind: 'phone' | 'mail' | 'pin' }) {
  const paths = {
    phone:
      'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2a1 1 0 0 1 1-.25 11.4 11.4 0 0 0 3.6.57 1 1 0 0 1 1 1V20a1 1 0 0 1-1 1A17 17 0 0 1 3 4a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.25.2 2.45.57 3.57a1 1 0 0 1-.25 1z',
    mail: 'M3 6h18v12H3zM3 6l9 7 9-7',
    pin: 'M12 21s-7-6.2-7-11.5A7 7 0 0 1 19 9.5C19 14.8 12 21 12 21zm0-9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  } as const
  return (
    <span aria-hidden="true" className="contact-icon">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
        <path d={paths[kind]} />
      </svg>
    </span>
  )
}
