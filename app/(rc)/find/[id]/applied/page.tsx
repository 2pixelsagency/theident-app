'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Card } from '@/components/rc/ui'
import { supabase } from '@/lib/supabase'
import { useAsync } from '@/lib/rc/useAsync'
import { jobTitle } from '@/lib/rc/pipeline'

export default function AppliedPage() {
  const { id: jobId } = useParams<{ id: string }>()
  const { data: job } = useAsync(async () => {
    const { data } = await supabase.from('jobs').select('is_side_hustle, job_title, project_in, project_role, production_company').eq('id', jobId).maybeSingle()
    return data
  }, [jobId])

  return (
    <div className="flex min-h-dvh flex-col px-6 pb-[max(20px,env(safe-area-inset-bottom))]">
      <div className="flex flex-1 flex-col items-center justify-center pt-16 text-center">
        <span className="flex size-24 items-center justify-center rounded-full bg-green text-white shadow-[0_16px_40px_-12px_var(--green)]">
          <Icon name="check" className="size-11" strokeWidth={2.4} />
        </span>
        <h1 className="mt-7 text-[26px]">Application sent!</h1>
        <p className="mt-2 max-w-80 text-[15px] leading-relaxed text-muted">
          Your reel and materials are on their way{job ? <> for <span className="font-medium text-ink">{jobTitle(job)}</span></> : ''}. You’ll hear back here and in notifications.
        </p>

        <Card className="mt-8 w-full divide-y divide-line overflow-hidden text-left">
          <Link href="/castings" className="flex items-center gap-3 px-4 py-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-green-tint text-green-ink"><Icon name="briefcase" /></span>
            <span className="flex-1"><span className="block text-[15px] font-medium">Track it in Castings</span><span className="block text-[13px] text-muted">Applied → Self-tape → Recall → Booked</span></span>
            <Icon name="chevron-right" className="size-4 text-faint" />
          </Link>
          <Link href="/me/edit" className="flex items-center gap-3 px-4 py-4">
            <span className="flex size-10 items-center justify-center rounded-xl bg-purple-tint text-purple-ink"><Icon name="user" /></span>
            <span className="flex-1"><span className="block text-[15px] font-medium">Keep your profile sharp</span><span className="block text-[13px] text-muted">Panels look here before they reply</span></span>
            <Icon name="chevron-right" className="size-4 text-faint" />
          </Link>
        </Card>
      </div>
      <div className="space-y-3 pt-8">
        <Button variant="dark" size="lg" full href="/castings">Track application</Button>
        <Button variant="outline" size="lg" full href="/find">Keep browsing roles</Button>
      </div>
    </div>
  )
}
