import { DiaryCard, GoalsCard, QuickApplyCard, StatsCard, TrackerCard } from './cards'
import { DEMO, type Application, type CastingItem, type Diary, type Goal, type Stat } from './types'

type Props = { castings?: CastingItem[]; application?: Application; goals?: Goal[]; diary?: Diary; stats?: Stat[] }

// "Castings" bento for the marketing site. Built from the approved design (castings-section-design.html).
// All card content comes in through props; DEMO fills them until real data is wired up.
export default function CastingsSection({ castings = DEMO.castings, application = DEMO.application, goals = DEMO.goals, diary = DEMO.diary, stats = DEMO.stats }: Props) {
  return (
    <section aria-labelledby="castings-heading" className="bg-bg px-6 py-24 text-ink">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-8 lg:gap-10">
        <div className="mb-4 flex max-w-[760px] flex-col gap-4">
          <p className="flex items-center gap-[5px] text-[11px] font-semibold uppercase tracking-[0.14em] text-forest">
            <span aria-hidden="true" className="size-1.5 rounded-full bg-forest" />Castings
          </p>
          <h2 id="castings-heading" className="font-display text-[40px] font-bold leading-[1.02] tracking-[-0.03em] md:text-[56px]">Every casting, from applied to booked, in one view.</h2>
          <p className="max-w-[560px] text-[15px] leading-[1.6] text-muted-strong">Apply with your reel in a tap, track every self-tape and recall, and see your next booking before your agent calls.</p>
        </div>

        <div className="grid gap-8 lg:gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,480px),1fr))]">
          <TrackerCard castings={castings} />
          <QuickApplyCard application={application} />
        </div>

        <div className="grid gap-8 lg:gap-10 [grid-template-columns:repeat(auto-fit,minmax(min(100%,320px),1fr))]">
          <GoalsCard goals={goals} />
          <DiaryCard diary={diary} />
          <StatsCard stats={stats} />
        </div>
      </div>
    </section>
  )
}
