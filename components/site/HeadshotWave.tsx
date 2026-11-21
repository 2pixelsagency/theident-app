'use client'

import WavyMarquee from './WavyMarquee'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'

type Face = { id: string; first_name: string | null; picture_url: string; what_i_do: string | null }

// Headshots of performers who've opted in to being featured on the website (Settings → Profile & visibility).
// Until enough members opt in, the clearly-fictional demo performers fill the wave.
export default function HeadshotWave() {
  const { data } = useAsync(async () => {
    const cols = 'id, first_name, picture_url, what_i_do'
    const { data: real } = await supabase.from('profiles').select(cols).eq('account_role', 'performer').eq('feature_on_site', true).eq('is_demo', false).not('picture_url', 'is', null).limit(30)
    let faces = (real || []) as Face[]
    if (faces.length < 8) {
      const { data: demo } = await supabase.from('profiles').select(cols).eq('account_role', 'performer').eq('is_demo', true).not('picture_url', 'is', null).limit(20)
      faces = [...faces, ...((demo || []) as Face[])]
    }
    return faces
  }, [])
  if (!data?.length) return <div className="h-[clamp(9em,13vw,22em)]" />
  return (
    <WavyMarquee items={data} className="py-[clamp(2em,4vw,5em)]" render={f => (
      <figure className="relative w-[clamp(7.5em,10vw,20em)]">
        <div className="aspect-square overflow-hidden rounded-full bg-chip ring-4 ring-surface shadow-[0_18px_40px_-22px_rgb(18_49_39/0.55)]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={f.picture_url} alt="" draggable={false} loading="lazy" className="size-full object-cover" />
        </div>
        <figcaption className="absolute -bottom-2 left-1/2 max-w-[90%] -translate-x-1/2 truncate whitespace-nowrap rounded-full bg-surface px-3 py-1 text-[12px] font-semibold shadow-card">
          {f.first_name}{f.what_i_do ? <span className="font-medium text-muted"> · {f.what_i_do.split(',')[0]}</span> : null}
        </figcaption>
      </figure>
    )} />
  )
}
