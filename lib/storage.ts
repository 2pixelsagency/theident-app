import { supabase } from '@/lib/supabase'

// Private buckets (applications, receipts) store the object *path* in the DB and
// are read through short-lived signed URLs. Rows written before the buckets went
// private hold a full public URL, so accept either form.

export function toStoragePath(bucket: string, value: string): string {
  const marker = '/storage/v1/object/public/' + bucket + '/'
  const i = value.indexOf(marker)
  return i === -1 ? value : decodeURIComponent(value.slice(i + marker.length).split('?')[0])
}

// Returns a map of original value -> signed URL. Values that can't be signed are omitted.
export async function signStorageUrls(bucket: string, values: (string | null | undefined)[], expiresIn = 3600) {
  const out = new Map<string, string>()
  const unique = Array.from(new Set(values.filter((v): v is string => !!v)))
  const signable = unique.filter(v => !/^https?:\/\//.test(v) || v.includes('/storage/v1/object/public/' + bucket + '/'))
  if (!signable.length) return out
  const { data } = await supabase.storage.from(bucket).createSignedUrls(signable.map(v => toStoragePath(bucket, v)), expiresIn)
  ;(data || []).forEach((d, i) => { if (d.signedUrl) out.set(signable[i], d.signedUrl) })
  return out
}
