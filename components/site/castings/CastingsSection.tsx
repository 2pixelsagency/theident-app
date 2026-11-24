import Link from 'next/link'
import { DiaryCard, GoalsCard, QuickApplyCard, StatsCard, TrackerCard } from './cards'
import { DEMO, type Application, type CastingItem, type Diary, type Goal, type Stat } from './types'

type Props = { castings?: CastingItem[]; application?: Application; goals?: Goal[]; diary?: Diary; stats?: Stat[] }

// "Castings" bento for the marketing site. Built from the approved design (castings-section-design.html).
// All card content comes in through props; DEMO fills them until real data is wired up.
export default function CastingsSection({ castings = DEMO.castings, application = DEMO.application, goals = DEMO.goals, diary = DEMO.diary, stats = DEMO.stats }: Props) {
  return (
    <section aria-labelledby="castings-heading" className="bg-bg px-6 py-24 text-ink">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-8">
          <div className="flex min-w-0 flex-[1_1_560px] flex-col gap-4">
            <p className="flex items-center gap-2.5 text-[14px] font-semibold uppercase tracking-[0.14em] text-forest">
              <span aria-hidden="true" className="size-2 rounded-full bg-forest" />Castings
            </p>
            <h2 id="castings-heading" className="max-w-[720px] font-display text-[40px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px]">Every casting, from applied to booked, in one view.</h2>
          </div>
          <div className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-5">
            <p className="text-[18px] leading-[1.55] text-muted-strong">Apply with your reel in a tap, track every self-tape and recall, and see your next booking before your agent calls.</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/start?role=performer" className="inline-flex min-h-12 items-center rounded-full bg-forest px-6 text-[16px] font-semibold text-bg transition-colors duration-300 hover:bg-lime hover:text-ink">Join as a performer</Link>
              <Link href="/start?role=caster" className="inline-flex min-h-12 items-center rounded-full border-[1.5px] border-forest px-6 text-[16px] font-semibold text-forest transition-colors duration-300 hover:bg-forest hover:text-bg">Post a role — free</Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))]">
          <TrackerCard castings={castings} />
          <QuickApplyCard application={application} />
        </div>

        <div className="grid gap-6 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <GoalsCard goals={goals} />
          <DiaryCard diary={diary} />
          <StatsCard stats={stats} />
        </div>
      </div>
    </section>
  )
}
