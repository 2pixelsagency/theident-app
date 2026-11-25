'use client'

import { useState } from 'react'
import Icon from './Icon'
import { Card } from './ui'
import type { Agent } from '@/lib/rc/profile'

type P = { agent_name?: string | null; agency_name?: string | null; agent_email?: string | null; agent_phone?: string | null }
type Entry = { key: string; title: string; kind: string; email: string | null; phone: string | null }

// Representation. Phones: an inline card. Desktop: a fixed tab on the right edge that pops up the agent details,
// so casting can reach the agent from anywhere on the profile.
export default function AgentDock({ p, agents }: { p: P; agents: Agent[] }) {
  const [open, setOpen] = useState(false)
  const list: Entry[] = [
    ...(p.agent_name || p.agency_name ? [{ key: 'main', title: p.agency_name || p.agent_name!, kind: p.agency_name && p.agent_name && p.agent_name !== p.agency_name ? 'Agent: ' + p.agent_name : 'Agent', email: p.agent_email || null, phone: p.agent_phone || null }] : []),
    ...agents.filter(a => a.agency_name !== p.agency_name).map(a => ({ key: a.id, title: a.agency_name, kind: (a.kind || 'Other') + ' agent', email: a.email, phone: a.phone })),
  ]
  if (!list.length) return null

  const rows = list.map(a => (
    <div key={a.key} className="flex items-center gap-3">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-dark text-sm font-semibold text-lime">{a.title.slice(0, 1)}</span>
      <span className="min-w-0 flex-1"><span className="block truncate text-[15px] font-medium">{a.title}</span><span className="block truncate text-[13px] text-muted">{a.kind}{a.email ? ' · ' + a.email : a.phone ? ' · ' + a.phone : ''}</span></span>
      {a.phone && <a href={'tel:' + a.phone.replace(/\s/g, '')} aria-label={'Call ' + a.title} className="inline-flex size-10 items-center justify-center rounded-full bg-chip"><Icon name="phone" className="size-5" /></a>}
      {a.email && <a href={'mailto:' + a.email} aria-label={'Email ' + a.title} className="inline-flex size-10 items-center justify-center rounded-full bg-chip"><Icon name="mail" className="size-5" /></a>}
    </div>
  ))

  return (
    <>
      {/* phones / tablets: inline */}
      <div className="lg:hidden">
        <h2 className="mb-3 mt-6 text-[18px]">Representation</h2>
        <Card className="space-y-3 p-4">{rows}</Card>
      </div>

      {/* desktop: fixed tab on the right → popup */}
      <div className="fixed right-0 top-1/2 z-40 hidden -translate-y-1/2 lg:block">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open} aria-controls="agent-pop"
          className="flex flex-col items-center gap-2 rounded-l-2xl bg-forest px-3 py-5 text-[13px] font-semibold text-lime shadow-card">
          <Icon name="mail" className="size-4" /><span className="[writing-mode:vertical-rl] rotate-180 whitespace-nowrap">Contact agent</span>
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-40 hidden lg:block" onClick={() => setOpen(false)}>
          <div id="agent-pop" role="dialog" aria-label="Representation" onClick={e => e.stopPropagation()}
            className="absolute right-14 top-1/2 w-[380px] -translate-y-1/2 rounded-[var(--radius)] bg-surface p-5 shadow-card ring-1 ring-line">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[18px]">Representation</h2>
              <button type="button" onClick={() => setOpen(false)} aria-label="Close" className="inline-flex size-8 items-center justify-center rounded-full bg-chip"><Icon name="x" className="size-4" /></button>
            </div>
            <div className="space-y-3">{rows}</div>
          </div>
        </div>
      )}
    </>
  )
}
