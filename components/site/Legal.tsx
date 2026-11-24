import { Eyebrow } from './Chrome'

// Long-form legal page: readable column, numbered sections
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: { h: string; body: React.ReactNode }[] }) {
  return (
    <article className="hero-in mx-auto max-w-[760px] px-5 pb-28 pt-32 md:px-8 md:pt-40">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="mt-4 font-display text-[42px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px]">{title}</h1>
      <p className="mt-3 text-[14px] text-muted">Last updated {updated}</p>
      <p className="mt-6 rounded-[24px] bg-sand p-6 text-[14px] leading-[1.65] text-muted-strong">{intro}</p>
      <div className="mt-10 space-y-9">
        {sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="font-display text-[24px] font-bold tracking-[-0.02em]">{i + 1}. {s.h}</h2>
            <div className="mt-3 space-y-3 text-[14px] leading-[1.7] text-ink/85 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  )
}
