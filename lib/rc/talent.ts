import { supabase } from '@/lib/supabase'
import { startConversation } from '@/lib/startConversation'

export type Talent = {
  id: string
  first_name: string | null
  last_name: string | null
  picture_url: string | null
  slug: string | null
  location: string | null
  what_i_do: string | null
  bio: string | null
  summary: string | null
  height: string | null
  minimum_age: number | null
  maximum_age: number | null
  availability_status: string | null
  is_graduate: boolean
  graduate_school: string | null
  graduate_year: number | null
  account_role: string
  show_talent: boolean | null
  is_verified: boolean
  last_active: string | null
}

export const TALENT_SELECT = 'id, first_name, last_name, picture_url, slug, location, what_i_do, bio, summary, height, minimum_age, maximum_age, availability_status, is_graduate, graduate_school, graduate_year, account_role, show_talent, is_verified, last_active'

export function playingAge(t: Pick<Talent, 'minimum_age' | 'maximum_age'>) {
  if (t.minimum_age && t.maximum_age) return t.minimum_age + '–' + t.maximum_age
  return t.minimum_age ? t.minimum_age + '+' : null
}

export function craftTag(t: Pick<Talent, 'what_i_do'>) {
  return (t.what_i_do || '').split(',').map(s => s.trim()).filter(Boolean).slice(0, 2).join(' & ')
}

export function graduateLabel(t: Pick<Talent, 'is_graduate' | 'graduate_school' | 'graduate_year'>) {
  if (!t.is_graduate) return null
  return ['Graduate', t.graduate_school, t.graduate_year].filter(Boolean).join(' · ')
}

// Messaging needs an accepted connection (RLS). Without one, send a request instead.
export async function messageOrConnect(me: string, other: string): Promise<{ conversationId?: string; requested?: boolean; error?: boolean }> {
  const convo = await startConversation(me, other)
  if (convo) return { conversationId: convo }
  const { data: existing } = await supabase.from('connections').select('id, status')
    .or(`and(requester_id.eq.${me},receiver_id.eq.${other}),and(requester_id.eq.${other},receiver_id.eq.${me})`).maybeSingle()
  if (existing) return { requested: true }
  const { error } = await supabase.from('connections').insert({ requester_id: me, receiver_id: other, status: 'pending' })
  return error ? { error: true } : { requested: true }
}
