'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Icon from '@/components/rc/Icon'
import { Button, Steps, cx } from '@/components/rc/ui'
import { emptyDraft, readDraft, writeDraft, type Role } from '@/lib/rc/onboarding'

const CHOICES: { role: Role; icon: string; title: string; sub: string; tile: string }[] = [
  { role: 'performer', icon: 'user', title: 'I’m a performer', sub: 'Find roles & side hustles, apply with your reel, track your work and career.', tile: 'bg-green' },
  { role: 'caster', icon: 'briefcase', title: 'I’m casting or hiring', sub: 'Post roles, review applicants, shortlist and book talent fast.', tile: 'bg-dark' },
]

export default function RoleSelect() {
  const router = useRouter()
  // Perform / Cast on the entry screen arrives as ?role=; otherwise keep the draft's choice
  const [role, setRole] = useState<Role>(() => {
    const q = new URLSearchParams(window.location.search).get('role')
    return q === 'caster' || q === 'performer' ? q : readDraft()?.role ?? 'performer'
  })

  const next = () => {
    const d = readDraft() ?? emptyDraft(role)
    writeDraft({ ...d, role })
    router.push('/start/profile')
  }

  return (
    <>
      <div className="flex items-center gap-3 py-2">
        <button type="button" aria-label="Back" onClick={() => router.push('/welcome')} className="-ml-1 inline-flex size-9 items-center justify-center rounded-full hover:bg-chip">
          <Icon name="chevron-left" className="size-6" />
        </button>
        <Steps step={1} total={3} />
      </div>

      <h1 className="mt-6 text-[26px]">What brings you here?</h1>
      <p className="mt-2 text-[15px] text-muted">You can switch or add the other side later.</p>

      <div role="radiogroup" className="mt-7 space-y-4">
        {CHOICES.map(c => {
          const on = role === c.role
          return (
            <button key={c.role} type="button" role="radio" aria-checked={on} onClick={() => setRole(c.role)}
              className={cx('relative w-full rounded-[20px] border-2 bg-surface p-5 text-left shadow-card transition', on ? 'border-green shadow-[0_10px_30px_-12px_var(--green)]' : 'border-transparent')}>
              <span className={cx('mb-4 flex size-12 items-center justify-center rounded-xl text-white', c.tile)}>
                <Icon name={c.icon} className="size-6" />
              </span>
              <span className="block text-[19px] font-medium">{c.title}</span>
              <span className="mt-1 block text-[14px] leading-relaxed text-muted">{c.sub}</span>
              {on && (
                <span className="absolute right-4 top-4 flex size-7 items-center justify-center rounded-full bg-green text-white">
                  <Icon name="check" className="size-4" strokeWidth={2.2} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="mt-auto pt-10">
        <Button variant="dark" size="lg" full trailingIcon="arrow-right" onClick={next}>Continue</Button>
      </div>
    </>
  )
}
