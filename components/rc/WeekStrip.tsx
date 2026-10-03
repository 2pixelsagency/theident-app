import { KIND_COLOUR, type DiaryKind } from '@/lib/rc/diary'
import { toISODate, weekDays } from '@/lib/rc/format'
import { Card, cx } from './ui'

const LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export default function WeekStrip({ kinds }: { kinds: Map<string, Set<DiaryKind>> }) {
  const today = toISODate(new Date())
  return (
    <Card className="px-3 py-4">
      <ol className="grid grid-cols-7 text-center">
        {weekDays().map((d, i) => {
          const key = toISODate(d)
          const isToday = key === today
          const past = key < today
          const dots = Array.from(kinds.get(key) || []).slice(0, 3)
          return (
            <li key={key} className="flex flex-col items-center gap-1.5">
              <span className="text-[11px] text-faint">{LETTERS[i]}</span>
              <span className={cx('flex size-8 items-center justify-center rounded-full text-[15px]', isToday ? 'bg-dark text-white' : past ? 'text-faint' : 'text-ink')}>{d.getDate()}</span>
              <span className="flex h-1.5 gap-0.5">{dots.map(k => <span key={k} className={cx('size-1.5 rounded-full', KIND_COLOUR[k])} />)}</span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
