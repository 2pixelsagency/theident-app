import { Container } from './Chrome'
import { SectionHeader } from './ds'
import type { Testimonial } from '@/lib/site/testimonials'

// Quote cards from real members. Renders nothing until there are real quotes to show.
export default function Testimonials({ items, eyebrow = 'In their words', title }: { items: Testimonial[]; eyebrow?: string; title: string }) {
  if (!items.length) return null
  return (
    <Container className="py-16 md:py-20">
      <SectionHeader eyebrow={eyebrow} title={title} />
      <ul className="grid items-start gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))] lg:gap-10">
        {items.map((t, i) => (
          <li key={t.name + i} className={i % 3 === 1 ? 'rounded-[var(--radius-feature)] bg-forest p-7 text-bg md:p-8' : 'rounded-[var(--radius-feature)] bg-sand p-7 md:p-8'}>
            <blockquote className="font-display text-[20px] font-bold leading-[1.3] tracking-[-0.01em]">“{t.quote}”</blockquote>
            <figcaption className="mt-6 flex items-center gap-3">
              {t.picture
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={t.picture} alt="" className="size-10 rounded-full object-cover" />
                : <span className="flex size-10 items-center justify-center rounded-full bg-lime text-[13px] font-bold text-forest">{t.name.split(' ').map(w => w[0]).slice(0, 2).join('')}</span>}
              <span><span className="block text-[14px] font-semibold">{t.name}</span><span className={i % 3 === 1 ? 'block text-[13px] text-on-dark-muted' : 'block text-[13px] text-muted-strong'}>{t.role}</span></span>
            </figcaption>
          </li>
        ))}
      </ul>
    </Container>
  )
}
