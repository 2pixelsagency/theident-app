import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Container, Cta } from '@/components/site/Chrome'
import { CtaBand, Eyebrow, cx } from '@/components/site/ds'
import JsonLd from '@/components/site/JsonLd'
import BlogArt from '@/components/site/BlogArt'
import { POSTS, postBySlug } from '@/lib/site/blog'
import { SITE_URL } from '@/lib/supabaseServer'

export const dynamicParams = false
export const generateStaticParams = () => POSTS.map(p => ({ slug: p.slug }))
type Props = { params: Promise<{ slug: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const post = postBySlug((await params).slug)
  if (!post) return {}
  return { title: post.title + ' | The Ident', description: post.description, alternates: { canonical: '/blog/' + post.slug },
    openGraph: { type: 'article', title: post.title, description: post.description, publishedTime: post.date } }
}

const fmt = (d: string) => new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export default async function BlogPost({ params }: Props) {
  const post = postBySlug((await params).slug)
  if (!post) notFound()
  const more = POSTS.filter(p => p.slug !== post.slug).slice(0, 3)
  return (
    <>
      <JsonLd data={{ '@context': 'https://schema.org', '@graph': [
        { '@type': 'BlogPosting', headline: post.title, description: post.description, datePublished: post.date, dateModified: post.date,
          author: { '@type': 'Organization', name: 'The Ident' }, publisher: { '@type': 'Organization', name: 'The Ident', logo: SITE_URL + '/icon-512.png' },
          mainEntityOfPage: SITE_URL + '/blog/' + post.slug },
        { '@type': 'BreadcrumbList', itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'The Ident', item: SITE_URL },
          { '@type': 'ListItem', position: 2, name: 'Blog', item: SITE_URL + '/blog' },
          { '@type': 'ListItem', position: 3, name: post.title, item: SITE_URL + '/blog/' + post.slug }] },
      ] }} />
      <article className="mx-auto max-w-[760px] px-6 pb-16 pt-32 md:pt-40">
        <nav aria-label="Breadcrumb" className="mb-6 text-[13px] text-muted"><Link href="/blog" className="hover:text-ink">Blog</Link> <span aria-hidden="true">/</span> <span className="text-ink">{post.tag}</span></nav>
        <Eyebrow>{post.tag}</Eyebrow>
        <h1 className="mt-4 font-display text-[40px] font-bold leading-[1.04] tracking-[-0.03em] md:text-[56px]">{post.title}</h1>
        <p className="mt-4 text-[15px] leading-[1.6] text-muted-strong">{post.description}</p>
        <p className="mt-4 text-[12px] font-medium text-muted">By The Ident team · {fmt(post.date)} · {post.readMins} min read</p>
        <div className={cx('relative mt-8 h-[220px] overflow-hidden rounded-[var(--radius-feature)] md:h-[300px]', post.tone)}>
          <BlogArt variant={post.art} />
        </div>
        <div className="mt-10 space-y-8">
          {post.blocks.map((b, i) => (
            <section key={i}>
              {b.h && <h2 className="font-display text-[24px] font-bold tracking-[-0.02em]">{b.h}</h2>}
              {b.p?.map((t, j) => <p key={j} className={cx('text-[15px] leading-[1.75] text-ink/85', b.h && 'mt-3')}>{t}</p>)}
              {b.list && (
                <ul className={cx('space-y-2.5', b.h && 'mt-4')}>
                  {b.list.map(t => (
                    <li key={t} className="flex items-start gap-3 text-[15px] leading-[1.6] text-ink/85">
                      <span className="mt-[3px] flex size-[18px] shrink-0 items-center justify-center rounded-full bg-forest text-bg"><svg aria-hidden="true" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg></span>{t}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      </article>
      <Container className="pb-16">
        <h2 className="mb-6 font-display text-[28px] font-bold tracking-[-0.02em]">More guides</h2>
        <ul className="grid gap-8 [grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr))]">
          {more.map(p => (
            <li key={p.slug}><Link href={'/blog/' + p.slug} className="group block h-full rounded-[var(--radius-feature)] bg-sand p-6 md:p-7">
              <span className={cx('inline-block rounded-[10px] px-3 py-1 text-[12px] font-semibold', p.tone)}>{p.tag}</span>
              <h3 className="mt-4 font-display text-[20px] font-bold leading-[1.2] group-hover:underline">{p.title}</h3>
              <p className="mt-2 text-[13px] leading-[1.6] text-muted-strong">{p.description}</p>
            </Link></li>
          ))}
        </ul>
      </Container>
      <Container className="pb-24">
        <CtaBand title="Put it into practice on The Ident." sub="Apply with your reel, send self-tapes and track every recall in one place."
          actions={<><Cta href="/start?role=performer" variant="lime">Join as a performer</Cta><Cta href="/start?role=caster" variant="ghost-light" arrow={false}>I’m casting</Cta></>} />
      </Container>
    </>
  )
}
