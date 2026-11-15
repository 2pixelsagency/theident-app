import { supabase } from '@/lib/supabase'

// Profile completeness: nudges (never blocks) toward 100%. Weights favour what casting looks at first.
export type CompletenessItem = { key: string; label: string; done: boolean; weight: number; href: string }

type Input = {
  role: string
  picture_url: string | null; first_name: string | null; what_i_do: string | null; location: string | null
  bio: string | null; summary: string | null; minimum_age: number | null; maximum_age: number | null; height: string | null
  hair_colour_id: number | null; eye_colour_id: number | null; company_name: string | null
  skills: number; reels: number; credits: number
}

export function completeness(p: Input) {
  const caster = p.role === 'caster'
  const items: CompletenessItem[] = caster
    ? [
        { key: 'name', label: 'Add your name', done: !!p.first_name, weight: 15, href: '/me/edit#basics' },
        { key: 'company', label: 'Add your company or production', done: !!p.company_name, weight: 30, href: '/me/edit#basics' },
        { key: 'photo', label: 'Add a photo or logo', done: !!p.picture_url, weight: 20, href: '/me/edit#photo' },
        { key: 'location', label: 'Say where you’re based', done: !!p.location, weight: 15, href: '/me/edit#basics' },
        { key: 'about', label: 'Write a short “about”', done: !!(p.bio || p.summary), weight: 20, href: '/me/edit#about' },
      ]
    : [
        { key: 'photo', label: 'Add a headshot', done: !!p.picture_url, weight: 15, href: '/me/edit#photo' },
        { key: 'reel', label: 'Add a showreel', done: p.reels > 0, weight: 15, href: '/me/edit#media' },
        { key: 'headline', label: 'Add a headline', done: !!p.what_i_do, weight: 10, href: '/me/edit#basics' },
        { key: 'about', label: 'Write your “about”', done: !!(p.bio || p.summary), weight: 10, href: '/me/edit#about' },
        { key: 'age', label: 'Set your playing age', done: !!(p.minimum_age && p.maximum_age), weight: 10, href: '/me/edit#playing' },
        { key: 'skills', label: 'Add 3 or more skills', done: p.skills >= 3, weight: 10, href: '/me/edit#skills' },
        { key: 'credits', label: 'Add a credit', done: p.credits > 0, weight: 10, href: '/me/edit#credits' },
        { key: 'name', label: 'Add your name', done: !!p.first_name, weight: 5, href: '/me/edit#basics' },
        { key: 'location', label: 'Say where you’re based', done: !!p.location, weight: 5, href: '/me/edit#basics' },
        { key: 'height', label: 'Add your height', done: !!p.height, weight: 5, href: '/me/edit#playing' },
        { key: 'looks', label: 'Add hair & eye colour', done: !!(p.hair_colour_id && p.eye_colour_id), weight: 5, href: '/me/edit#playing' },
      ]
  const total = items.reduce((s, i) => s + i.weight, 0)
  const score = Math.round((items.filter(i => i.done).reduce((s, i) => s + i.weight, 0) / total) * 100)
  const next = items.filter(i => !i.done).sort((a, b) => b.weight - a.weight)
  return { score, items, next }
}

// Light query for places that don't already have the full profile loaded (e.g. Home)
export async function loadCompleteness(id: string) {
  const [p, skills, reels, credits] = await Promise.all([
    supabase.from('profiles').select('account_role, picture_url, first_name, what_i_do, location, bio, summary, minimum_age, maximum_age, height, hair_colour_id, eye_colour_id, company_name').eq('id', id).maybeSingle(),
    supabase.from('profile_skills').select('skill_id', { count: 'exact', head: true }).eq('profile_id', id),
    supabase.from('reels').select('id', { count: 'exact', head: true }).eq('profile_id', id),
    supabase.from('credits').select('id', { count: 'exact', head: true }).eq('profile_id', id),
  ])
  if (!p.data) return null
  return completeness({ ...(p.data as Omit<Input, 'role' | 'skills' | 'reels' | 'credits'> & { account_role: string }), role: p.data.account_role, skills: skills.count || 0, reels: reels.count || 0, credits: credits.count || 0 })
}

// From an already-loaded full profile (My profile, Customise profile)
export function completenessOf(data: { profile: (Omit<Input, 'role' | 'skills' | 'reels' | 'credits'> & { account_role: string }) | null; skills: unknown[]; reels: unknown[]; credits: unknown[] }) {
  if (!data.profile) return null
  return completeness({ ...data.profile, role: data.profile.account_role, skills: data.skills.length, reels: data.reels.length, credits: data.credits.length })
}
