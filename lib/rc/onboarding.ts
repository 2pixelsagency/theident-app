import { supabase } from '@/lib/supabase'

// Onboarding runs before the account exists (role → profile → account), so the
// answers are kept on the device and written to the profile once signed in.

export type Role = 'performer' | 'caster'

export type OnboardingDraft = {
  role: Role
  firstName: string
  lastName: string
  crafts: string[]
  location: string
  skillIds: number[]
  reelUrl: string
  openToWork: boolean
  isGraduate: boolean
  graduateSchool: string
  graduateYear: string
  companyName: string
  photo: string | null // small JPEG data URL
}

const KEY = 'rc:onboarding'

export const emptyDraft = (role: Role = 'performer'): OnboardingDraft => ({
  role, firstName: '', lastName: '', crafts: [], location: '', skillIds: [], reelUrl: '',
  openToWork: true, isGraduate: false, graduateSchool: '', graduateYear: '', companyName: '', photo: null,
})

export function readDraft(): OnboardingDraft | null {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...emptyDraft(), ...JSON.parse(raw) } : null
  } catch { return null }
}

export function writeDraft(d: OnboardingDraft) {
  try { localStorage.setItem(KEY, JSON.stringify(d)) } catch { /* storage full or blocked: the flow still works in-memory */ }
}

export function clearDraft() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

// Downscale a picked photo so the draft stays small enough for localStorage.
export function shrinkImage(file: File, max = 720): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.width * scale)
      canvas.height = Math.round(img.height * scale)
      canvas.getContext('2d')?.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.onerror = reject
    img.src = url
  })
}

function slugify(s: string) {
  return s.toLowerCase().normalize('NFKD').replace(/[^\w\s-]/g, '').trim().replace(/[\s_]+/g, '-').replace(/-+/g, '-')
}

async function uniqueSlug(first: string, last: string, uid: string) {
  const base = slugify(first + ' ' + last) || 'performer'
  for (let i = 0; i < 20; i++) {
    const candidate = i === 0 ? base : base + '-' + (i + 1)
    const { data } = await supabase.from('profiles').select('id').eq('slug', candidate).maybeSingle()
    if (!data || data.id === uid) return candidate
  }
  return base + '-' + uid.slice(0, 6)
}

// Writes the saved onboarding answers to the signed-in user's profile.
// The profile row itself is created by the on_auth_user_created trigger.
export async function applyDraft(uid: string): Promise<{ ok: boolean; error?: string }> {
  const d = readDraft()
  if (!d) return { ok: true }

  let picture_url: string | undefined
  if (d.photo) {
    const blob = await (await fetch(d.photo)).blob()
    const path = uid + '/headshot-' + Date.now() + '.jpg'
    const { error } = await supabase.storage.from('headshots').upload(path, blob, { contentType: 'image/jpeg' })
    if (!error) picture_url = supabase.storage.from('headshots').getPublicUrl(path).data.publicUrl
  }

  const year = parseInt(d.graduateYear, 10)
  const update: Record<string, unknown> = {
    account_role: d.role,
    first_name: d.firstName.trim() || null,
    last_name: d.lastName.trim() || null,
    location: d.location.trim() || null,
    what_i_do: d.crafts.length ? d.crafts.join(', ') : null,
    company_name: d.role === 'caster' ? d.companyName.trim() || null : null,
    availability_status: d.role === 'performer' && d.openToWork ? 'available' : null,
    is_graduate: d.role === 'performer' && d.isGraduate,
    graduate_school: d.isGraduate ? d.graduateSchool.trim() || null : null,
    graduate_year: d.isGraduate && year ? year : null,
  }
  if (picture_url) update.picture_url = picture_url
  if (d.firstName.trim()) update.slug = await uniqueSlug(d.firstName, d.lastName, uid)

  const { error } = await supabase.from('profiles').update(update).eq('id', uid)
  if (error) return { ok: false, error: error.message }

  if (d.skillIds.length) {
    await supabase.from('profile_skills').upsert(d.skillIds.map(skill_id => ({ profile_id: uid, skill_id })), { onConflict: 'profile_id,skill_id', ignoreDuplicates: true })
  }
  if (d.reelUrl.trim()) {
    await supabase.from('reels').insert({ profile_id: uid, label: 'Showreel', url: d.reelUrl.trim(), sort_order: 0 })
  }

  clearDraft()
  return { ok: true }
}
