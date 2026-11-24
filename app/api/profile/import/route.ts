import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { docxToText } from '@/lib/rc/docx'

export const runtime = 'nodejs'
export const maxDuration = 300

// "Create my profile from my CV": a performer uploads a CV (PDF or Word — e.g. the CV PDF they download
// from Spotlight or Mandy). Claude reads it and returns the details as structured JSON. Nothing is saved
// here — the app shows the result for the member to check and choose what to add.
//
// Uses the Messages API over HTTP (fetch): package installs are not available in this repo's build
// environment, so the official @anthropic-ai/sdk isn't a dependency yet. Swap to the SDK when it is.

// Sonnet: CV reading is straightforward extraction, at about half Opus's price per import
const MODEL = 'claude-sonnet-5-5'
const MAX_BYTES = 8 * 1024 * 1024
const DAILY_LIMIT = 5

const str = { type: 'string' }
const schemaFor = (categories: string[]) => ({
  type: 'object',
  additionalProperties: false,
  required: ['first_name', 'last_name', 'what_i_do', 'location', 'bio', 'height', 'playing_age_min', 'playing_age_max', 'agent_name', 'agent_email', 'agent_phone', 'website', 'drama_school', 'graduation_year', 'vocal_range', 'credits', 'skills', 'training'],
  properties: {
    first_name: str, last_name: str,
    what_i_do: { type: 'string', description: 'Short craft line, e.g. "Actor & Singer". Empty if unclear.' },
    location: str, bio: { type: 'string', description: 'A 2–4 sentence third-person summary built only from facts in the CV. Empty if there is too little to go on.' },
    height: { type: 'string', description: 'As written, e.g. 5\'9" or 175cm. Empty if absent.' },
    playing_age_min: { type: 'integer', description: '0 if not stated' }, playing_age_max: { type: 'integer', description: '0 if not stated' },
    agent_name: str, agent_email: str, agent_phone: str, website: str,
    drama_school: { type: 'string', description: 'Main drama school / training institution if the CV names one.' },
    graduation_year: { type: 'integer', description: '0 if not stated' },
    vocal_range: { type: 'string', description: 'Singing range exactly as written, e.g. "F2 to D3 (belt to F2)". Empty if absent. Not repeated in skills.' },
    credits: {
      type: 'array',
      items: {
        type: 'object', additionalProperties: false,
        required: ['title', 'role', 'type', 'year', 'director', 'company'],
        properties: {
          title: { type: 'string', description: 'Production title' }, role: { type: 'string', description: 'Part played' },
          type: { type: 'string', enum: ['Theatre', 'Musical Theatre', 'TV Series', 'Feature Film', 'Film', 'Commercial', 'Music Video', 'Dance', 'Voice Over', 'Web / Digital Content', 'Physical Theatre', 'Other'] },
          year: { type: 'integer', description: '0 if not stated' }, director: str, company: { type: 'string', description: 'Theatre, production company or broadcaster' },
        },
      },
    },
    skills: {
      type: 'array',
      description: 'Every skill on the CV: accents, dance styles, voice type, instruments, sports, licences, languages, stage combat… (not vocal range).',
      items: {
        type: 'object', additionalProperties: false, required: ['as_written', 'match', 'name', 'category'],
        properties: {
          as_written: { type: 'string', description: 'The skill as written on the CV' },
          match: { type: 'string', description: 'The name from <skills_list> that means the same thing (e.g. "Jazz Dancing" → "Jazz Dance", "American-Standard" accent → "American General Accent"), copied exactly. Empty if none is the same skill.' },
          name: { type: 'string', description: 'If match is empty: a short, clean name for a new skill in the style of the list, e.g. "Pas de Deux", "Dance Captain", "Songwriting". Otherwise the match.' },
          category: { type: 'string', enum: categories },
        },
      },
    },
    training: { type: 'array', items: str, description: 'Training lines, e.g. "BA Acting, Mountview (2021)".' },
  },
})

const PROMPT = `You are filling in a performer's profile on The Ident, a UK casting app, from their CV.
Extract only what the CV actually says. Never guess, embellish or invent credits, dates, schools or skills.
Use an empty string (or 0, or an empty list) for anything that isn't in the CV.
Keep credit titles, roles and companies exactly as written. Use British spelling.`

export async function POST(req: NextRequest) {
  if (!process.env.ANTHROPIC_API_KEY) return NextResponse.json({ error: 'CV import isn’t switched on yet.' }, { status: 503 })

  const jwt = (req.headers.get('authorization') || '').replace('Bearer ', '').trim()
  const anon = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, { auth: { persistSession: false } })
  const { data: { user } } = await anon.auth.getUser(jwt)
  if (!user) return NextResponse.json({ error: 'Please log in again.' }, { status: 401 })

  const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString()
  const { count } = await admin.from('cv_imports').select('id', { count: 'exact', head: true }).eq('profile_id', user.id).gte('created_at', since)
  if ((count ?? 0) >= DAILY_LIMIT) return NextResponse.json({ error: 'You’ve imported a few CVs today — try again tomorrow.' }, { status: 429 })

  const form = await req.formData().catch(() => null)
  const file = form?.get('file')
  if (!(file instanceof File)) return NextResponse.json({ error: 'Choose a CV to upload.' }, { status: 400 })
  if (file.size > MAX_BYTES) return NextResponse.json({ error: 'That file is over 8 MB.' }, { status: 413 })
  const buf = Buffer.from(await file.arrayBuffer())
  const name = file.name.toLowerCase()
  const isPdf = file.type === 'application/pdf' || name.endsWith('.pdf')
  const isDocx = name.endsWith('.docx') || file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  if (!isPdf && !isDocx) return NextResponse.json({ error: 'Upload a PDF or Word (.docx) CV.' }, { status: 415 })

  let content: unknown[]
  if (isPdf) {
    content = [{ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: buf.toString('base64') } }, { type: 'text', text: PROMPT }]
  } else {
    let text = ''
    try { text = docxToText(buf) } catch { return NextResponse.json({ error: 'We couldn’t read that Word file — try saving it as a PDF.' }, { status: 422 }) }
    if (text.length < 40) return NextResponse.json({ error: 'That file looks empty.' }, { status: 422 })
    content = [{ type: 'text', text: '<cv>\n' + text.slice(0, 200_000) + '\n</cv>\n\n' + PROMPT }]
  }

  // Our skills list, so Claude can match each CV skill to one we have (or file a new one under a category)
  const [{ data: skillRows }, { data: catRows }] = await Promise.all([
    admin.from('skills').select('name, skills_categories(name)').order('name'),
    admin.from('skills_categories').select('name').order('name'),
  ])
  const categories = (catRows || []).map(c => c.name as string)
  if (!categories.length) categories.push('Miscellaneous')
  const list = (skillRows || []).map(r => r.name + ' (' + ((r.skills_categories as unknown as { name: string } | null)?.name || 'Miscellaneous') + ')').join('\n')
  content.push({ type: 'text', text: '<skills_list>\n' + list + '\n</skills_list>' })

  const { data: row } = await admin.from('cv_imports').insert({ profile_id: user.id }).select('id').single()
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2026-10-21',
      // Server-side fallback: if the model declines (refusal), the API retries on another model in the same call
      'anthropic-beta': 'server-side-fallback-2026-07-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 32000,
      fallbacks: 'default',
      output_config: { effort: 'low', format: { type: 'json_schema', schema: schemaFor(categories) } },
      messages: [{ role: 'user', content }],
    }),
  }).catch(() => null)

  if (!res || !res.ok) {
    const status = res?.status
    console.error('cv import: anthropic error', status, res ? (await res.text().catch(() => '')).slice(0, 300) : 'network')
    return NextResponse.json({ error: status === 429 || status === 529 ? 'Our CV reader is busy — please try again in a minute.' : 'We couldn’t read that CV just now. Please try again.' }, { status: 502 })
  }
  const msg = await res.json()
  if (msg.stop_reason === 'refusal' || msg.stop_reason === 'max_tokens') return NextResponse.json({ error: 'We couldn’t read that CV. Try a different file.' }, { status: 422 })
  const text = (msg.content || []).filter((b: { type: string }) => b.type === 'text').map((b: { text: string }) => b.text).join('')
  let profile
  try { profile = JSON.parse(text) } catch { return NextResponse.json({ error: 'We couldn’t read that CV. Try a different file.' }, { status: 422 }) }
  if (row?.id) await admin.from('cv_imports').update({ ok: true }).eq('id', row.id)
  return NextResponse.json({ profile })
}
