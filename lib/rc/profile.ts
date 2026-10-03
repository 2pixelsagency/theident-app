import { supabase } from '@/lib/supabase'

export type FullProfile = {
  id: string; first_name: string | null; last_name: string | null; slug: string | null; picture_url: string | null; banner_url: string | null
  location: string | null; what_i_do: string | null; bio: string | null; summary: string | null; height: string | null
  minimum_age: number | null; maximum_age: number | null; availability_status: string | null; show_talent: boolean | null
  hair_colour_id: number | null; eye_colour_id: number | null; is_graduate: boolean; graduate_school: string | null; graduate_year: number | null
  agent_name: string | null; agent_email: string | null; agent_phone: string | null; is_verified: boolean; account_role: string; company_name: string | null
  email_alerts_enabled: boolean | null; notification_prefs: { matches?: boolean; applications?: boolean; messages?: boolean; marketing?: boolean } | null
}

export type Reel = { id: string; label: string | null; url: string; sort_order: number | null }
export type Credit = { id: string; title: string | null; role: string | null; year: number | null; production_company: string | null; director: string | null; production_type_id: number | null; production_types?: { name: string } | null }
export type Brand = { id: string; brand_name: string; logo_url: string | null }
export type Testimonial = { id: string; quote: string; author_name: string | null; author_title: string | null }
export type Lookup = { id: number; name: string }

export async function loadFullProfile(id: string) {
  const [p, reels, skills, credits, brands, testimonials, gallery, hair, eyes, conns] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', id).maybeSingle(),
    supabase.from('reels').select('id, label, url, sort_order').eq('profile_id', id).order('sort_order'),
    supabase.from('profile_skills').select('skills(id, name)').eq('profile_id', id),
    supabase.from('credits').select('id, title, role, year, production_company, director, production_type_id, production_types(name)').eq('profile_id', id).order('year', { ascending: false }),
    supabase.from('profile_brands').select('id, brand_name, logo_url').eq('profile_id', id).order('sort_order'),
    supabase.from('testimonials').select('id, quote, author_name, author_title').eq('profile_id', id).order('sort_order'),
    supabase.from('gallery_images').select('id, url').eq('profile_id', id).order('sort_order'),
    supabase.from('hair_colours').select('id, name').order('id'),
    supabase.from('eye_colours').select('id, name').order('id'),
    supabase.from('connections').select('id', { count: 'exact', head: true }).eq('status', 'accepted').or(`requester_id.eq.${id},receiver_id.eq.${id}`),
  ])
  return {
    profile: p.data as FullProfile | null,
    reels: (reels.data || []) as Reel[],
    skills: (skills.data || []).map(s => (s as unknown as { skills: { id: number; name: string } | null }).skills).filter((s): s is { id: number; name: string } => !!s),
    credits: (credits.data || []) as unknown as Credit[],
    brands: (brands.data || []) as Brand[],
    testimonials: (testimonials.data || []) as Testimonial[],
    gallery: (gallery.data || []) as { id: string; url: string }[],
    hair: (hair.data || []) as Lookup[],
    eyes: (eyes.data || []) as Lookup[],
    connections: conns.count || 0,
  }
}

export const SUPPORT_EMAIL = 'hello@theident.me'
