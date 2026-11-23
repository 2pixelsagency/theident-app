import Link from 'next/link'
import Icon from '@/components/rc/Icon'
import { Container, Cta } from './Chrome'

type Feature = { icon: string; title: string; body: string }
// Editorial layout for "For performers" / "For casting": big type, facts column, numbered
// feature lists under sticky headings, and a full-bleed closing band — no card grids.
export default function FeaturePage({ eyebrow, title, intro, cta, facts, groups, closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  facts: [string, string][]; groups: { title: string; features: Feature[] }[]; closing: string
}) {
  return (
    <>
      <section className="border-b border-line">
        <Container className="grid gap-14 pb-20 pt-32 md:grid-cols-[1.5fr_1fr] md:items-end md:pb-24 md:pt-44">
          <div>
            <p className="rise eyebrow text-[13px] font-semibold uppercase tracking-[0.12em] text-green-ink">{eyebrow}</p>
            <h1 className="rise mt-5 text-[44px] leading-[1.02] tracking-[-0.035em] md:text-[72px]" style={{ '--d': '100ms' } as React.CSSProperties}>{title}</h1>
            <p className="rise mt-6 max-w-[560px] text-[18px] leading-relaxed text-muted" style={{ '--d': '200ms' } as React.CSSProperties}>{intro}</p>
            <div className="rise mt-9 flex flex-wrap gap-3" style={{ '--d': '300ms' } as React.CSSProperties}><Cta href={cta.href}>{cta.label}</Cta><Cta href="/pricing" variant="outline">Pricing</Cta></div>
          </div>
          <dl className="rise divide-y divide-line border-y border-line" style={{ '--d': '400ms' } as React.CSSProperties}>
            {facts.map(([big, small]) => (
              <div key={small} className="flex items-baseline justify-between gap-6 py-5">
                <dt className="font-display text-[40px] font-bold leading-none tracking-[-0.03em] md:text-[48px]">{big}</dt>
                <dd className="text-right text-[14px] text-muted">{small}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {groups.map((g, gi) => (
        <section key={g.title} className="border-b border-line">
          <Container className="grid gap-10 py-20 md:grid-cols-[minmax(240px,340px)_1fr] md:gap-16 md:py-28">
            <div className="md:sticky md:top-28 md:self-start">
              <p className="font-display text-[15px] font-bold text-green-ink">{String(gi + 1).padStart(2, '0')}</p>
              <h2 className="mt-3 text-[34px] leading-[1.05] tracking-[-0.025em] md:text-[44px]">{g.title}</h2>
            </div>
            <ol className="divide-y divide-line border-t border-line">
              {g.features.map((f, i) => (
                <li key={f.title} className="group grid grid-cols-[48px_1fr] gap-5 py-7 md:grid-cols-[56px_1fr_auto] md:py-8">
                  <span className="flex size-12 items-center justify-center rounded-full border border-line text-green-ink transition group-hover:border-forest group-hover:bg-forest group-hover:text-lime md:size-14"><Icon name={f.icon} className="size-5" /></span>
                  <div>
                    <p className="text-[20px] font-semibold leading-snug md:text-[22px]">{f.title}</p>
                    <p className="mt-1.5 max-w-[520px] text-[16px] leading-relaxed text-muted">{f.body}</p>
                  </div>
                  <span className="hidden self-center font-display text-[15px] font-bold text-faint md:block">{String(i + 1).padStart(2, '0')}</span>
                </li>
              ))}
            </ol>
          </Container>
        </section>
      ))}

      <section className="bg-lime">
        <Container className="flex flex-col gap-10 py-24 md:flex-row md:items-end md:justify-between md:py-32">
          <h2 className="max-w-[860px] text-[44px] leading-[1.02] tracking-[-0.035em] md:text-[72px]">{closing}</h2>
          <Link href={cta.href} className="group inline-flex h-14 shrink-0 items-center gap-2 self-start rounded-full bg-forest pl-7 pr-2 text-[16px] font-semibold text-white md:self-auto">
            {cta.label}<span className="flex size-10 items-center justify-center rounded-full bg-lime text-ink transition group-hover:translate-x-0.5"><Icon name="arrow-right" className="size-5" /></span>
          </Link>
        </Container>
      </section>
    </>
  )
}
