import type { Metadata } from 'next'
import JsonLd from '@/components/site/JsonLd'
import { supabaseServer, SITE_URL } from '@/lib/supabaseServer'

// Server layer for public job pages: real titles/descriptions for search + schema.org JobPosting (Google Jobs).
// The page itself stays a client component.
export const revalidate = 600

type Props = { params: Promise<{ id: string }>; children: React.ReactNode }
type Row = {
  id: string; is_side_hustle: boolean; project_in: string | null; project_role: string | null; job_title: string | null
  production_company: string | null; company: string | null; location: string | null; description: string | null; short_summary: string | null
  created_at: string; application_deadline: string | null; pay_amount: number | null; pay_unit: string | null; pay_currency: string | null
  is_demo: boolean | null; is_published: boolean | null; production_types: { name: string } | null
}

async function load(id: string) {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null
  const { data } = await supabaseServer.from('jobs')
    .select('id, is_side_hustle, project_in, project_role, job_title, production_company, company, location, description, short_summary, created_at, application_deadline, pay_amount, pay_unit, pay_currency, is_demo, is_published, production_types(name)')
    .eq('id', id).maybeSingle()
  return data as unknown as Row | null
}
const titleOf = (j: Row) => j.is_side_hustle ? j.job_title || 'Side hustle' : [j.project_in || j.production_company, j.project_role || j.job_title].filter(Boolean).join(' — ') || 'Role'
const UNIT: Record<string, string> = { hour: 'HOUR', day: 'DAY', week: 'WEEK', month: 'MONTH', year: 'YEAR' }

export async function generateMetadata({ params }: Omit<Props, 'children'>): Promise<Metadata> {
  const { id } = await params
  const j = await load(id)
  if (!j || !j.is_published) return { title: 'Role not available · The Ident', robots: { index: false } }
  const title = `${titleOf(j)}${j.location ? ' · ' + j.location.split(',')[0] : ''} | Casting on The Ident`
  const description = (j.short_summary || j.description || `${titleOf(j)} — apply on The Ident.`).replace(/\s+/g, ' ').slice(0, 160)
  return {
    title, description, alternates: { canonical: `/jobs/${j.id}` },
    robots: j.is_demo ? { index: false, follow: true } : { index: true, follow: true },
    openGraph: { title, description, url: `${SITE_URL}/jobs/${j.id}`, type: 'website' },
  }
}

export default async function JobLayout({ params, children }: Props) {
  const { id } = await params
  const j = await load(id)
  const posting = j && j.is_published && !j.is_demo ? {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: titleOf(j),
    description: (j.description || j.short_summary || titleOf(j)).replace(/\n/g, '<br>'),
    datePosted: j.created_at,
    validThrough: j.application_deadline ? j.application_deadline + 'T23:59:59Z' : undefined,
    employmentType: j.is_side_hustle ? 'PART_TIME' : 'CONTRACTOR',
    hiringOrganization: { '@type': 'Organization', name: j.production_company || j.company || 'The Ident member' },
    jobLocation: j.location ? { '@type': 'Place', address: { '@type': 'PostalAddress', addressLocality: j.location.split(',')[0].trim(), addressCountry: 'GB' } } : undefined,
    occupationalCategory: j.production_types?.name || (j.is_side_hustle ? 'Side hustle' : 'Performing arts'),
    baseSalary: j.pay_amount ? { '@type': 'MonetaryAmount', currency: j.pay_currency || 'GBP', value: { '@type': 'QuantitativeValue', value: Number(j.pay_amount), unitText: UNIT[j.pay_unit || ''] || 'DAY' } } : undefined,
    directApply: true,
    url: `${SITE_URL}/jobs/${j.id}`,
  } : null
  return <>{posting && <JsonLd data={posting} />}{children}</>
}
