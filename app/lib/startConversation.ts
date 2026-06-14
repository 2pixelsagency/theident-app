import { supabase } from '@/lib/supabase'

// Always orders the pair the same way so there's never a duplicate conversation
export async function startConversation(myId: string, otherId: string): Promise<string | null> {
  const [a, b] = [myId, otherId].sort()
  const { data: existing } = await supabase.from('conversations').select('id').eq('user_a', a).eq('user_b', b).maybeSingle()
  if (existing) return existing.id
  const { data, error } = await supabase.from('conversations').insert({ user_a: a, user_b: b }).select('id').single()
  if (error) { console.error('startConversation', error); return null }
  return data.id
}
