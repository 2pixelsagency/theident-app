import { Container, Cta } from './Chrome'
import { CtaBand, IconCard, SectionHeader } from './ds'
import PlanCard, { PlanGrid, type PlanCardProps } from './PlanCard'

type Feature = { icon: string; title: string; body: string }
const TONES = ['bg-lime', 'bg-mint', 'bg-butter', 'bg-blossom']

// "For performers" / "For casting" in the website design system: split header, pricing-style cards,
// a section per group with icon cards, and the Forest call-to-action band.
export default function FeaturePage({ eyebrow, title, intro, cta, plans, groups, closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  plans: PlanCardProps[]; groups: { title: string; features: Feature[] }[]; closing: string
}) {
  return (
    <>
      <Container className="pb-10 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow={eyebrow} title={title} sub={intro}
          actions={<><Cta href={cta.href} variant="dark">{cta.label}</Cta><Cta href="/pricing" variant="outline" arrow={false}>Pricing</Cta></>} />
        <PlanGrid>{plans.map(pl => <PlanCard key={pl.name} {...pl} />)}</PlanGrid>
      </Container>

      {groups.map((g, gi) => (
        <Container key={g.title} className="py-16 md:py-20">
          <SectionHeader eyebrow={String(gi + 1).padStart(2, '0') + ' · ' + eyebrow} title={g.title} />
          <ul className="grid items-start gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
            {g.features.map((f, i) => <IconCard key={f.title} icon={f.icon} tone={TONES[(i + gi) % TONES.length]} title={f.title} body={f.body} />)}
          </ul>
        </Container>
      ))}

      <Container className="pb-24 pt-8">
        <CtaBand title={closing} actions={<><Cta href={cta.href} variant="lime">{cta.label}</Cta><Cta href="/pricing" variant="ghost-light" arrow={false}>See pricing</Cta></>} />
      </Container>
    </>
  )
}
