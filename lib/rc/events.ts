import type { Tone } from '@/components/rc/ui'
import { fmtTimeOfDay, money } from './format'

export type EventType = 'audition' | 'workshop' | 'talk' | 'webinar' | 'premiere' | 'other'

export type RCEvent = {
  id: string
  created_by: string | null
  host_name: string | null
  title: string
  event_type: EventType
  description: string | null
  cover_image_url: string | null
  start_date: string
  end_date: string | null
  start_time: string | null
  end_time: string | null
  all_day: boolean | null
  format: 'in_person' | 'online' | null
  venue: string | null
  online_url: string | null
  is_paid: boolean | null
  price: number | null
  capacity: number | null
  is_featured: boolean | null
  feature_requested: boolean
  status: string | null
  is_published: boolean | null
}

export const EVENT_SELECT = 'id, created_by, host_name, title, event_type, description, cover_image_url, start_date, end_date, start_time, end_time, all_day, format, venue, online_url, is_paid, price, capacity, is_featured, feature_requested, status, is_published'

export const EVENT_TYPES: { value: EventType; label: string; plural: string; tone: Tone }[] = [
  { value: 'audition', label: 'Audition', plural: 'Auditions', tone: 'green' },
  { value: 'workshop', label: 'Workshop', plural: 'Workshops', tone: 'purple' },
  { value: 'talk', label: 'Talk', plural: 'Talks', tone: 'pink' },
  { value: 'webinar', label: 'Webinar', plural: 'Webinars', tone: 'blue' },
  { value: 'premiere', label: 'Premiere', plural: 'Premieres', tone: 'amber' },
]

export function typeMeta(t: string) {
  return EVENT_TYPES.find(x => x.value === t) || { value: 'other' as EventType, label: 'Event', plural: 'Other', tone: 'neutral' as Tone }
}

export function priceLabel(e: Pick<RCEvent, 'is_paid' | 'price'>) {
  return e.is_paid && e.price ? money(Number(e.price), { pence: Number(e.price) % 1 !== 0 }) : 'Free'
}

export function whereLabel(e: Pick<RCEvent, 'format' | 'venue'>) {
  return e.format === 'online' ? 'Online' : e.venue || 'Venue TBC'
}

export function timeLabel(e: Pick<RCEvent, 'start_time' | 'all_day'>) {
  return e.all_day || !e.start_time ? 'All day' : fmtTimeOfDay(e.start_time)
}

// Featuring is a paid upsell (one-off). Payment isn't connected yet; the request is flagged for the team.
export const FEATURE_PRICE = 15
