// Data shapes for the Castings section cards. Today they're filled with demo content (DEMO below);
// later each can be fed real Supabase data for a signed-in member without touching the markup.

export type CastingStatus = 'self-tape' | 'recall' | 'booked'
// `then` / `thenDetail`: what the row turns into when the card is hovered (the card tells its story)
export type CastingItem = { title: string; detail: string; status: CastingStatus; then?: CastingStatus; thenDetail?: string }

export type Application = {
  to: { name: string; initials: string }
  role: string
  attachments: { kind: 'reel' | 'cv' | 'tape'; label: string }[]
}

export type Goal = { label: string; percent: number; then?: number }

export type DiaryDay = { day: string; text: string; free: boolean; then?: string }
export type Diary = { openToTours: boolean; days: DiaryDay[] }

export type Stat = { value: number; label: string; tone: 'raised' | 'butter' | 'mint' | 'lime'; then?: number }

export const DEMO = {
  castings: [
    { title: 'The Glass Orchard — Nell', detail: 'Self-tape due Fri', status: 'self-tape' },
    { title: 'Harbour Lights — Young witness', detail: 'Video call · Tue 14:00', status: 'recall', then: 'booked', thenDetail: 'Booked · sign your contract' },
    { title: 'Pulse — UK arena tour', detail: 'Sign your contract', status: 'booked' },
  ] as CastingItem[],
  application: {
    to: { name: 'Jo Kendrick, Casting', initials: 'JK' },
    role: 'Nell (lead) · The Glass Orchard',
    attachments: [{ kind: 'reel', label: 'Showreel · 1:42' }, { kind: 'cv', label: 'CV.pdf' }, { kind: 'tape', label: 'Self-tape' }],
  } as Application,
  goals: [{ label: 'Dance class ×2', percent: 100 }, { label: 'New showreel', percent: 60, then: 100 }, { label: 'Update headshots', percent: 30, then: 70 }] as Goal[],
  diary: {
    openToTours: true,
    days: [{ day: 'M', text: 'Free all day', free: true }, { day: 'T', text: 'Rehearsal 10:00–16:00', free: false }, { day: 'W', text: 'Free from 13:00', free: true, then: 'Recall · 14:00' }],
  } as Diary,
  stats: [
    { value: 6, label: 'Applied', tone: 'raised', then: 7 }, { value: 2, label: 'Self-tapes', tone: 'butter' },
    { value: 1, label: 'Recall', tone: 'mint' }, { value: 1, label: 'Booked', tone: 'lime', then: 2 },
  ] as Stat[],
}
