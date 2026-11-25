import { supabase } from '@/lib/supabase'

export type FullProfile = {
  id: string; first_name: string | null; last_name: string | null; slug: string | null; picture_url: string | null; banner_url: string | null
  location: string | null; what_i_do: string | null; bio: string | null; summary: string | null; height: string | null
  minimum_age: number | null; maximum_age: number | null; availability_status: string | null; show_talent: boolean | null
  hair_colour_id: number | null; eye_colour_id: number | null; is_graduate: boolean; graduate_school: string | null; graduate_year: number | null
  agent_name: string | null; agent_email: string | null; agent_phone: string | null; is_verified: boolean; account_role: string; company_name: string | null
  cv_path: string | null; show_agent_contact: boolean; pronouns?: string | null; gender_id?: number | null; vocal_range?: string | null; extra_locations?: string[] | null; nationalities?: string[] | null; right_to_work?: string[] | null; appearance?: string[] | null; playing_genders?: string[] | null; multiple_birth?: string | null; hair_length?: string | null; hair_type?: string | null; agency_name?: string | null; agent_address?: string | null; pro_verified?: boolean; pro_verified_via?: string | null; graduate_verified?: boolean; website?: string | null; specialisms?: string[] | null; boosted_until?: string | null
  email_alerts_enabled: boolean | null; notification_prefs: { matches?: boolean; applications?: boolean; messages?: boolean; marketing?: boolean } | null
}

// Public link to a profile: performers at /performers/<slug>, casting pages at /<slug>
export const profilePath = (p: { slug: string | null; account_role?: string | null }) =>
  p.slug ? (p.account_role === 'caster' ? '/' : '/performers/') + p.slug : null

// Disability & access details: private unless the member chose to show them (RLS returns nothing otherwise)
export type Access = { disabilities: string[] | null; access_notes: string | null; visible: boolean }

export type Reel = { id: string; label: string | null; url: string; sort_order: number | null; poster_url?: string | null; duration_s?: number | null }
export type Credit = { id: string; title: string | null; role: string | null; year: number | null; production_company: string | null; director: string | null; production_type_id: number | null; production_types?: { name: string } | null }
export type Brand = { id: string; brand_name: string; logo_url: string | null }
export type Testimonial = { id: string; quote: string; author_name: string | null; author_title: string | null }
export type Lookup = { id: number; name: string }

// Columns safe to show to other people. Agent email/phone are private: they come from
// profile_contact(), which only returns them to the owner or when the owner chose to show them.
export const PUBLIC_PROFILE_COLS = 'id, first_name, last_name, slug, picture_url, banner_url, location, what_i_do, bio, summary, height, minimum_age, maximum_age, availability_status, show_talent, hair_colour_id, eye_colour_id, is_graduate, graduate_school, graduate_year, agent_name, is_verified, account_role, company_name, cv_path, show_agent_contact, website, specialisms, boosted_until, pronouns, gender_id, vocal_range, extra_locations, nationalities, right_to_work, appearance, playing_genders, multiple_birth, hair_length, hair_type, agency_name, agent_address, pro_verified, pro_verified_via, graduate_verified'
// The owner also reads their own settings (never select('*') — profiles is granted per column)
const OWNER_PROFILE_COLS = PUBLIC_PROFILE_COLS + ', email_alerts_enabled, notification_prefs'

export type FullProfileData = Awaited<ReturnType<typeof loadFullProfile>>

// self=true also loads the owner's own settings
export async function loadFullProfile(id: string, self = true, db: typeof supabase = supabase) {
  const [p, contact, reels, skills, credits, brands, testimonials, gallery, hair, eyes, conns, access] = await Promise.all([
    db.from('profiles').select(self ? OWNER_PROFILE_COLS : PUBLIC_PROFILE_COLS).eq('id', id).maybeSingle(),
    db.rpc('profile_contact', { pid: id }).maybeSingle(),
    db.from('reels').select('id, label, url, sort_order, poster_url, duration_s').eq('profile_id', id).order('sort_order'),
    db.from('profile_skills').select('skills(id, name)').eq('profile_id', id),
    db.from('credits').select('id, title, role, year, production_company, director, production_type_id, production_types(name)').eq('profile_id', id).order('year', { ascending: false }),
    db.from('profile_brands').select('id, brand_name, logo_url').eq('profile_id', id).order('sort_order'),
    db.from('testimonials').select('id, quote, author_name, author_title').eq('profile_id', id).order('sort_order'),
    db.from('gallery_images').select('id, url').eq('profile_id', id).order('sort_order'),
    db.from('hair_colours').select('id, name').order('id'),
    db.from('eye_colours').select('id, name').order('id'),
    db.from('connections').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${id},receiver_id.eq.${id}`),
    db.from('profile_access').select('disabilities, access_notes, visible').eq('profile_id', id).maybeSingle(),
  ])
  return {
    profile: p.data ? { ...(p.data as unknown as FullProfile), ...((contact.data as { agent_email: string | null; agent_phone: string | null } | null) ?? { agent_email: null, agent_phone: null }) } : null,
    reels: (reels.data || []) as Reel[],
    skills: (skills.data || []).map(s => (s as unknown as { skills: { id: number; name: string } | null }).skills).filter((s): s is { id: number; name: string } => !!s),
    credits: (credits.data || []) as unknown as Credit[],
    brands: (brands.data || []) as Brand[],
    testimonials: (testimonials.data || []) as Testimonial[],
    gallery: (gallery.data || []) as { id: string; url: string }[],
    hair: (hair.data || []) as Lookup[],
    eyes: (eyes.data || []) as Lookup[],
    connections: conns.count || 0,
    access: (access.data as Access | null) ?? null,
  }
}

export const SUPPORT_EMAIL = 'hello@theident.me'
