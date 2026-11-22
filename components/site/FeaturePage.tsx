import Icon from '@/components/rc/Icon'
import { Container, Cta, Eyebrow, SECTION } from './Chrome'

type Feature = { icon: string; title: string; body: string }
// Shared layout for the "For performers" / "For casting" pages
export default function FeaturePage({ eyebrow, title, intro, cta, groups, closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  groups: { title: string; features: Feature[] }[]; closing: string
}) {
  return (
    <>
      <section className="bg-bg">
        <Container className="pb-20 pt-32 md:pb-24 md:pt-40">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-4 max-w-[860px] text-[42px] leading-[1.03] tracking-[-0.03em] md:text-[64px]">{title}</h1>
          <p className="mt-4 max-w-[620px] text-[18px] text-muted">{intro}</p>
          <div className="mt-9 flex flex-wrap gap-3"><Cta href={cta.href}>{cta.label}</Cta><Cta href="/pricing" variant="outline">Pricing</Cta></div>
        </Container>
      </section>
      {groups.map((g, gi) => (
        <section key={g.title} className={(gi % 2 ? 'bg-surface ' : '') + SECTION}>
          <Container>
            <h2 className="text-[32px] leading-[1.06] tracking-[-0.02em] md:text-[44px]">{g.title}</h2>
            <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.features.map(f => (
                <div key={f.title} className="rounded-[16px] border border-line bg-surface p-7 shadow-card transition hover:-translate-y-0.5 hover:shadow-[0_20px_40px_-24px_rgb(18_49_39/0.35)]">
                  <span className="flex size-11 items-center justify-center rounded-[10px] bg-mint text-green-ink"><Icon name={f.icon} className="size-5" /></span>
                  <p className="mt-4 text-[17px] font-semibold">{f.title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </Container>
        </section>
      ))}
      <section className={SECTION}>
        <Container>
          <div className="flex flex-wrap items-center justify-between gap-8 rounded-[16px] bg-forest px-8 py-14 text-white md:px-14">
            <h2 className="max-w-[640px] text-[30px] leading-tight text-white md:text-[40px]">{closing}</h2>
            <Cta href={cta.href}>{cta.label}</Cta>
          </div>
        </Container>
      </section>
    </>
  )
}
