import { Container, Cta } from './Chrome'
import { CtaBand, IconCard, SandCard, SectionHeader } from './ds'

type Feature = { icon: string; title: string; body: string }
const TONES = ['bg-lime', 'bg-mint', 'bg-butter', 'bg-blossom']

// "For performers" / "For casting" in the website design system: split header, sand stat tiles,
// a section per group with icon cards, and the Forest call-to-action band.
export default function FeaturePage({ eyebrow, title, intro, cta, facts, groups, closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  facts: [string, string][]; groups: { title: string; features: Feature[] }[]; closing: string
}) {
  return (
    <>
      <Container className="pb-10 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow={eyebrow} title={title} sub={intro}
          actions={<><Cta href={cta.href} variant="dark">{cta.label}</Cta><Cta href="/pricing" variant="outline" arrow={false}>Pricing</Cta></>} />
        <dl className="grid gap-4 [grid-template-columns:repeat(auto-fit,minmax(min(100%,220px),1fr))]">
          {facts.map(([big, small], i) => (
            <SandCard key={small} dark={i === 0} className="flex min-h-[150px] flex-col justify-between">
              <dt className="font-display text-[44px] font-extrabold leading-none tracking-[-0.03em]">{big}</dt>
              <dd className={'mt-4 text-[15px] font-medium ' + (i === 0 ? 'text-on-dark-muted' : 'text-muted-strong')}>{small}</dd>
            </SandCard>
          ))}
        </dl>
      </Container>

      {groups.map((g, gi) => (
        <Container key={g.title} className="py-16 md:py-20">
          <SectionHeader eyebrow={String(gi + 1).padStart(2, '0') + ' · ' + eyebrow} title={g.title} />
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))]">
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
