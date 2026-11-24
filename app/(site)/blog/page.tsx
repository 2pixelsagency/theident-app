import type { Metadata } from 'next'
import Link from 'next/link'
import { Container } from '@/components/site/Chrome'
import { SectionHeader, cx } from '@/components/site/ds'
import JsonLd from '@/components/site/JsonLd'
import BlogArt from '@/components/site/BlogArt'
import { POSTS } from '@/lib/site/blog'
import { SITE_URL } from '@/lib/supabaseServer'

export const metadata: Metadata = {
  title: 'Blog — self-tapes, auditions and performer guides | The Ident',
  description: 'Practical guides for performers and casting teams: self-tapes, recalls, showreels and money.',
  alternates: { canonical: '/blog' },
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default function BlogIndex() {
  const [lead, ...rest] = POSTS
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Blog', name: 'The Ident blog', url: SITE_URL + '/blog',
        blogPost: POSTS.map(p => ({ '@type': 'BlogPosting', headline: p.title, url: SITE_URL + '/blog/' + p.slug, datePublished: p.date })) }} />
      <Container className="pb-24 pt-32 md:pt-40">
        <SectionHeader level={1} eyebrow="Blog" title="Guides for working performers" sub="Self-tapes, recalls, showreels and money — practical advice from The Ident team." />
        <Link href={'/blog/' + lead.slug} className="group grid overflow-hidden rounded-[var(--radius-feature)] bg-sand md:grid-cols-[1.1fr_1fr]">
          <div className={cx('relative min-h-[220px] md:min-h-[340px]', lead.tone)}>
            <BlogArt variant={lead.art} />
            <span className="absolute left-7 top-7 rounded-[10px] bg-surface px-3 py-1.5 text-[13px] font-semibold">{lead.tag}</span>
          </div>
          <div className="flex flex-col justify-center gap-3 p-7 md:p-10">
            <p className="text-[12px] font-medium text-muted">{fmt(lead.date)} · {lead.readMins} min read</p>
            <h2 className="font-display text-[30px] font-bold leading-[1.08] tracking-[-0.02em] group-hover:underline md:text-[38px]">{lead.title}</h2>
            <p className="text-[15px] leading-[1.6] text-muted-strong">{lead.description}</p>
          </div>
        </Link>
        <ul className="mt-8 grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,300px),1fr))] lg:mt-10 lg:gap-10">
          {rest.map(p => (
            <li key={p.slug}>
              <Link href={'/blog/' + p.slug} className="group flex h-full flex-col overflow-hidden rounded-[var(--radius-feature)] bg-sand">
                <div className={cx('relative h-[180px]', p.tone)}>
                  <BlogArt variant={p.art} />
                  <span className="absolute left-6 top-6 rounded-[10px] bg-surface px-3 py-1.5 text-[13px] font-semibold">{p.tag}</span>
                </div>
                <div className="flex flex-1 flex-col gap-2 p-6 md:p-7">
                  <p className="text-[12px] font-medium text-muted">{fmt(p.date)} · {p.readMins} min read</p>
                  <h2 className="font-display text-[22px] font-bold leading-[1.15] tracking-[-0.02em] group-hover:underline">{p.title}</h2>
                  <p className="text-[13px] leading-[1.6] text-muted-strong">{p.description}</p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </Container>
    </>
  )
}
