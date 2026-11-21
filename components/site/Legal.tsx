import { Eyebrow } from './Chrome'

// Long-form legal page: readable column, numbered sections
export function LegalPage({ title, updated, intro, sections }: { title: string; updated: string; intro: string; sections: { h: string; body: React.ReactNode }[] }) {
  return (
    <article className="mx-auto max-w-[760px] px-5 pb-20 pt-14 md:pt-20">
      <Eyebrow>Legal</Eyebrow>
      <h1 className="mt-3 text-[40px] leading-[1.05] md:text-[48px]">{title}</h1>
      <p className="mt-3 text-[14px] text-muted">Last updated {updated}</p>
      <p className="mt-6 text-[17px] leading-relaxed">{intro}</p>
      <div className="mt-10 space-y-9">
        {sections.map((s, i) => (
          <section key={s.h}>
            <h2 className="text-[22px]">{i + 1}. {s.h}</h2>
            <div className="mt-3 space-y-3 text-[16px] leading-relaxed text-ink/85 [&_li]:ml-5 [&_li]:list-disc [&_li]:pl-1 [&_ul]:space-y-1.5">{s.body}</div>
          </section>
        ))}
      </div>
    </article>
  )
}
