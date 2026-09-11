import { setRequestLocale } from 'next-intl/server'

import { Hero } from '@/components/sections/Hero'
import { Problem } from '@/components/sections/Problem'
import { Activation } from '@/components/sections/Activation'
import { Series } from '@/components/sections/Series'
import { ProductPins } from '@/components/sections/ProductPins'
import { Coverage } from '@/components/sections/Coverage'
import { Applications } from '@/components/sections/Applications'
import { Comparison } from '@/components/sections/Comparison'
import { Certifications } from '@/components/sections/Certifications'
import { About } from '@/components/sections/About'
import { Contact } from '@/components/sections/Contact'
import { ReviewNotes } from '@/components/ReviewNotes'

export default async function HomePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)

  return (
    <main id="main">
      <Hero />
      {/* Who the reader is dealing with, straight after the statement: the
          audience weighs the partner before it weighs the product. */}
      <About />
      <Problem />
      <Activation />
      <Series />
      <ProductPins />
      <Coverage />
      <Applications />
      <Comparison />
      <Certifications />
      <Contact />
      <ReviewNotes />
    </main>
  )
}
