import Link from 'next/link'
import { Container, Cta } from './Chrome'
import { CtaBand, SectionHeader } from './ds'
import Faq from './Faq'
import JsonLd from './JsonLd'
import { SITE_URL } from '@/lib/supabaseServer'
import { guideBySlug, type Guide } from '@/lib/site/guides'

// Long-form SEO guide: H1 + intro, sections, FAQ (FAQPage schema), related guides, CTA.
export function guideMetadata(g: Guide) {
  return { title: g.title, description: g.description, alternates: { canonical: '/' + g.slug }, openGraph: { title: g.title, description: g.description, url: SITE_URL + '/' + g.slug, type: 'article' as const } }
}

export default function GuidePage({ guide: g }: { guide: Guide }) {
  const related = g.related.map(guideBySlug).filter((x): x is Guide => !!x)
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'Article', headline: g.h1, description: g.description, url: SITE_URL + '/' + g.slug, publisher: { '@type': 'Organization', name: 'The Ident', url: SITE_URL }, about: g.keyword },
        { '@type': 'FAQPage', mainEntity: g.faq.map(([q, a]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })) },
        { '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'The Ident', item: SITE_URL }, { '@type': 'ListItem', position: 2, name: g.h1, item: SITE_URL + '/' + g.slug }] },
      ] }} />
      <Container className="pb-4 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow={g.keyword} title={g.h1} sub={g.intro}
          actions={<><Cta href="/start?role=performer" variant="dark">Start free trial</Cta><Cta href="/jobs" variant="outline" arrow={false}>Browse roles</Cta></>} />
      </Container>

      <Container className="py-10 md:py-14">
        <article className="mx-auto max-w-[760px] space-y-10">
          {g.sections.map(s => (
            <section key={s.h}>
              <h2 className="font-display text-[28px] font-bold leading-[1.1] tracking-[-0.02em] md:text-[34px]">{s.h}</h2>
              {s.p?.map((t, i) => <p key={i} className="mt-4 text-[16px] leading-[1.75] text-ink/85">{t}</p>)}
              {s.list && (
                <ul className="mt-5 space-y-3">
                  {s.list.map(t => (
                    <li key={t} className="flex items-start gap-3 text-[16px] leading-[1.6] text-ink/85">
                      <span className="mt-[3px] flex size-[20px] shrink-0 items-center justify-center rounded-full bg-forest text-bg"><svg aria-hidden="true" width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>{t}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </article>
      </Container>

      <Container className="grid gap-10 py-14 md:grid-cols-[minmax(240px,380px)_1fr] md:gap-16 md:py-16">
        <div className="md:sticky md:top-28 md:self-start">
          <h2 className="font-display text-[38px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[48px]">Questions</h2>
          <p className="mt-4 text-[13px] text-muted-strong">More on <Link href="/pricing" className="font-semibold text-forest underline">pricing</Link>, <Link href="/about" className="font-semibold text-forest underline">what The Ident is</Link> and <Link href="/auditions" className="font-semibold text-forest underline">auditions by city</Link>.</p>
        </div>
        <Faq items={g.faq} />
      </Container>

      {related.length > 0 && (
        <Container className="py-10">
          <h2 className="mb-6 font-display text-[28px] font-bold tracking-[-0.02em]">More guides</h2>
          <ul className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
            {related.map(r => (
              <li key={r.slug}><Link href={'/' + r.slug} className="group block h-full rounded-[var(--radius-feature)] bg-sand p-6 md:p-7">
                <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">{r.keyword}</span>
                <h3 className="mt-3 font-display text-[20px] font-bold leading-[1.2] group-hover:underline">{r.h1}</h3>
                <p className="mt-2 text-[13px] leading-[1.6] text-muted-strong">{r.description}</p>
              </Link></li>
            ))}
          </ul>
        </Container>
      )}

      <Container className="pb-24 pt-6">
        <CtaBand title="Try The Ident free for 7 days." sub="Find roles, apply with your reel and track every casting in one place. Open to everyone."
          actions={<><Cta href="/start?role=performer" variant="lime">Start free trial</Cta><Cta href="/pricing" variant="ghost-light" arrow={false}>See pricing</Cta></>} />
      </Container>
    </>
  )
}
