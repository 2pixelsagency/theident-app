import Icon from '@/components/rc/Icon'
import { Cta, Eyebrow } from './Chrome'

type Feature = { icon: string; title: string; body: string }
// Shared layout for the "For performers" / "For casting" pages
export default function FeaturePage({ eyebrow, title, intro, cta, groups, closing }: {
  eyebrow: string; title: string; intro: string; cta: { href: string; label: string }
  groups: { title: string; features: Feature[] }[]; closing: string
}) {
  return (
    <>
      <section className="bg-glow">
        <div className="mx-auto max-w-[1180px] px-5 pb-14 pt-14 md:pt-20">
          <Eyebrow>{eyebrow}</Eyebrow>
          <h1 className="mt-3 max-w-[820px] text-[40px] leading-[1.05] md:text-[56px]">{title}</h1>
          <p className="mt-4 max-w-[620px] text-[18px] text-muted">{intro}</p>
          <div className="mt-8 flex flex-wrap gap-3"><Cta href={cta.href}>{cta.label}</Cta><Cta href="/pricing" variant="outline">Pricing</Cta></div>
        </div>
      </section>
      {groups.map((g, gi) => (
        <section key={g.title} className={gi % 2 ? 'bg-surface' : ''}>
          <div className="mx-auto max-w-[1180px] px-5 py-14">
            <h2 className="text-[28px] leading-tight md:text-[34px]">{g.title}</h2>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {g.features.map(f => (
                <div key={f.title} className="rounded-[var(--radius)] border border-line bg-surface p-6 shadow-card">
                  <span className="flex size-11 items-center justify-center rounded-[10px] bg-mint text-green-ink"><Icon name={f.icon} className="size-5" /></span>
                  <p className="mt-4 text-[17px] font-semibold">{f.title}</p>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      ))}
      <section className="bg-forest text-white">
        <div className="mx-auto flex max-w-[1180px] flex-wrap items-center justify-between gap-6 px-5 py-14">
          <h2 className="max-w-[640px] text-[28px] leading-tight text-white md:text-[36px]">{closing}</h2>
          <Cta href={cta.href}>{cta.label}</Cta>
        </div>
      </section>
    </>
  )
}
