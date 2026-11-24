import { Container, Cta } from './Chrome'
import { CtaBand, Eyebrow, IconCard, SectionHeader } from './ds'
import PlanCard, { type PlanCardProps } from './PlanCard'
import TabShowcase from './TabShowcase'
import CardSlider from './CardSlider'
import Testimonials from './Testimonials'
import type { Testimonial } from '@/lib/site/testimonials'

type Feature = { icon: string; title: string; body: string; widget?: React.ReactNode }
type Group = { title: string; features: Feature[]; layout?: 'grid' | 'tabs' | 'slider' }
const TONES = ['bg-lime', 'bg-mint', 'bg-butter', 'bg-blossom']
const PANELS = ['var(--panel-mint)', 'var(--panel-butter)', 'var(--panel-lime)']

// "For performers" / "For casting": header, the one plan card, then a section per feature group laid out
// as a grid of + cards, a tabbed showcase with app screens, or a slider. Testimonials (real only) and the
// closing band finish the page.
export default function FeaturePage({ eyebrow, title, intro, cta, plan, groups, testimonials = [], closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  plan: PlanCardProps; groups: Group[]; testimonials?: Testimonial[]; closing: string
}) {
  return (
    <>
      <Container className="pb-10 pt-32 md:pt-40">
        {/* Heading, intro and buttons on the left; the plan (cost) on the right */}
        <div className="grid items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,440px)] lg:gap-16">
          <div className="hero-in flex flex-col gap-5">
            <Eyebrow>{eyebrow}</Eyebrow>
            <h1 className="font-display text-[44px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[60px]">{title}</h1>
            <p className="max-w-[560px] text-[15px] leading-[1.6] text-muted-strong">{intro}</p>
            <div className="mt-2 flex flex-wrap gap-3"><Cta href={cta.href} variant="dark">{cta.label}</Cta><Cta href="/pricing" variant="outline" arrow={false}>Pricing</Cta></div>
          </div>
          <div className="rise" style={{ '--d': '380ms' } as React.CSSProperties}><PlanCard {...plan} /></div>
        </div>
      </Container>

      {groups.map((g, gi) => (
        <Container key={g.title} className="py-16 md:py-20">
          <SectionHeader eyebrow={String(gi + 1).padStart(2, '0') + ' · ' + eyebrow} title={g.title} />
          {g.layout === 'tabs' ? (
            <TabShowcase label={g.title} steps={g.features.map((f, i) => ({ title: f.title, body: f.body, badge: TONES[(i + 1) % TONES.length], panel: PANELS[i % PANELS.length], widget: f.widget }))} />
          ) : g.layout === 'slider' ? (
            <CardSlider label={g.title}>
              {g.features.map((f, i) => <IconCard key={f.title} icon={f.icon} tone={TONES[(i + gi) % TONES.length]} title={f.title} body={f.body} />)}
            </CardSlider>
          ) : (
            <ul className="grid items-start gap-8 lg:gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
              {g.features.map((f, i) => <IconCard key={f.title} icon={f.icon} tone={TONES[(i + gi) % TONES.length]} title={f.title} body={f.body} />)}
            </ul>
          )}
        </Container>
      ))}

      <Testimonials items={testimonials} title={eyebrow === 'For casting teams' ? 'Casting teams on The Ident' : 'Performers on The Ident'} />

      <Container className="pb-24 pt-8">
        <CtaBand title={closing} actions={<><Cta href={cta.href} variant="lime">{cta.label}</Cta><Cta href="/pricing" variant="ghost-light" arrow={false}>See pricing</Cta></>} />
      </Container>
    </>
  )
}
