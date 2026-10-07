// Branded one-click CV (PDF) built from a profile: headshot, stats, credits, skills, training, reels.
import { clip, endPath, popGraphicsState, pushGraphicsState, rectangle } from 'pdf-lib'
import { PdfWriter, A4, downloadBytes, fileSafe } from './pdf'
import { fullName } from './format'
import { craftTag, playingAge } from './talent'
import { supabase } from '@/lib/supabase'
import type { Credit, FullProfileData } from './profile'

export async function buildCv(data: FullProfileData) {
  const p = data.profile!
  const w = await PdfWriter.create()
  const name = fullName(p) || 'RoleCall member'
  const link = p.slug ? window.location.host + '/' + p.slug : window.location.host

  // ---- Header: headshot left, name + facts right, green rule under ----
  const top = w.y
  const photo = await w.image(p.picture_url)
  const photoW = 118, photoH = 148
  let textX = w.margin
  if (photo) {
    const s = Math.max(photoW / photo.width, photoH / photo.height) // cover-crop into the frame
    const dw = photo.width * s, dh = photo.height * s
    // clip to the frame so a landscape/portrait photo is cover-cropped, not squashed
    w.page.pushOperators(pushGraphicsState(), rectangle(w.margin, top - photoH, photoW, photoH), clip(), endPath())
    w.page.drawImage(photo, { x: w.margin + (photoW - dw) / 2, y: top - photoH + (photoH - dh) / 2, width: dw, height: dh })
    w.page.pushOperators(popGraphicsState())
    textX = w.margin + photoW + 22
  }
  const colW = A4.w - w.margin - textX
  w.y = top + 4
  w.text(name, { font: w.display, size: 26, x: textX, maxWidth: colW, gap: 1.1 })
  const craft = p.account_role === 'caster' ? p.company_name : craftTag(p)
  if (craft) { w.space(4); w.text(craft.toUpperCase(), { font: w.bold, size: 8.5, color: w.c.green, x: textX, maxWidth: colW }) }
  w.space(8)
  const eyes = data.eyes.find(e => e.id === p.eye_colour_id)?.name
  const hair = data.hair.find(h => h.id === p.hair_colour_id)?.name
  const facts: [string, string | null | undefined][] = [
    ['Playing age', playingAge(p)], ['Height', p.height], ['Base', p.location], ['Eyes', eyes], ['Hair', hair],
  ]
  for (const [k, v] of facts.filter(([, v]) => !!v)) {
    w.ensure(14); w.y -= 14
    w.at(k, textX, w.y + 3, { size: 9, color: w.c.muted })
    w.at(String(v), textX + 70, w.y + 3, { size: 9.5 })
  }
  if (p.agent_name) {
    w.space(8)
    w.text('Represented by ' + p.agent_name, { font: w.bold, size: 9.5, x: textX, maxWidth: colW })
    const contact = [p.agent_email, p.agent_phone].filter(Boolean).join('  ·  ')
    if (contact) w.text(contact, { size: 9, color: w.c.muted, x: textX, maxWidth: colW })
  }
  w.y = Math.min(w.y, top - (photo ? photoH : 0)) - 18
  w.rule(w.c.green, 2)
  w.space(6)

  const section = (title: string) => {
    w.ensure(40)
    w.space(16)
    w.text(title, { font: w.display, size: 13 })
    w.space(5)
    w.rule()
    w.space(4)
  }

  if (p.bio || p.summary) {
    section('About')
    w.text((p.bio || p.summary)!, { size: 10, gap: 1.45 })
  }

  if (data.credits.length) {
    section('Credits')
    const groups = data.credits.reduce<Record<string, Credit[]>>((acc, c) => { const k = c.production_types?.name || 'Other'; (acc[k] ||= []).push(c); return acc }, {})
    for (const [group, list] of Object.entries(groups)) {
      w.ensure(30)
      w.space(6)
      w.text(group.toUpperCase(), { font: w.bold, size: 8, color: w.c.muted })
      for (const c of list) {
        w.ensure(28)
        const yTop = w.y
        w.text([c.title, c.role].filter(Boolean).join(' — ') || 'Untitled', { font: w.bold, size: 10, maxWidth: w.width - 50 })
        const sub = [c.production_company, c.director && 'dir. ' + c.director].filter(Boolean).join(' · ')
        if (sub) w.text(sub, { size: 9, color: w.c.muted, maxWidth: w.width - 50 })
        if (c.year) w.at(String(c.year), A4.w - w.margin, yTop - 10 + 2.8, { size: 9.5, color: w.c.muted, align: 'right' })
        w.space(4)
      }
    }
  }

  if (data.skills.length) {
    section('Skills')
    w.text(data.skills.map(s => s.name).join('  ·  '), { size: 10, gap: 1.5 })
  }

  if (p.is_graduate && p.graduate_school) {
    section('Training')
    w.text(p.graduate_school + (p.graduate_year ? '  —  ' + p.graduate_year : ''), { size: 10 })
  }

  if (data.reels.length) {
    section('Showreels')
    for (const r of data.reels) {
      w.text(r.label || 'Showreel', { font: w.bold, size: 10 })
      w.text(r.url, { size: 8.5, color: w.c.green })
      w.space(3)
    }
  }

  if (data.brands.length) {
    section('Worked with')
    w.text(data.brands.map(b => b.brand_name).join('  ·  '), { size: 10, gap: 1.5 })
  }

  w.footer(name + '  ·  ' + link + '  ·  CV created with RoleCall')
  return w.bytes()
}

export async function downloadCv(data: FullProfileData) {
  const bytes = await buildCv(data)
  downloadBytes(bytes, fileSafe(fullName(data.profile) || 'CV') + '-CV.pdf')
}

// The member's own uploaded CV file (private bucket, signed link)
export async function openUploadedCv(path: string) {
  const { data } = await supabase.storage.from('cvs').createSignedUrl(path, 300, { download: true })
  if (!data?.signedUrl) return false
  window.location.assign(data.signedUrl)
  return true
}
