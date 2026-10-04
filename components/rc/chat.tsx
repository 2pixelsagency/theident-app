'use client'

import { useEffect, useRef, useState } from 'react'
import Icon from './Icon'
import { cx } from './ui'
import { fmtDate, fmtTime, toISODate } from '@/lib/rc/format'

export function dayLabel(iso: string) {
  const key = iso.slice(0, 10)
  const today = toISODate(new Date())
  const y = new Date(); y.setDate(y.getDate() - 1)
  if (key === today) return 'Today'
  if (key === toISODate(y)) return 'Yesterday'
  return fmtDate(iso, { weekday: 'long', day: 'numeric', month: 'short' })
}

export function DayDivider({ label }: { label: string }) {
  return <div className="my-4 flex items-center gap-3 text-xs text-faint"><span className="h-px flex-1 bg-line" />{label}<span className="h-px flex-1 bg-line" /></div>
}

export function Bubble({ mine, body, at, meta, read }: { mine: boolean; body: string; at: string; meta?: React.ReactNode; read?: boolean }) {
  return (
    <div className={cx('flex flex-col', mine ? 'items-end' : 'items-start')}>
      {meta}
      <div className={cx('max-w-[80%] whitespace-pre-wrap break-words rounded-[18px] px-4 py-2.5 text-[15px] leading-snug', mine ? 'rounded-br-md bg-green text-white' : 'rounded-bl-md border border-line bg-surface')}>{body}</div>
      {mine && <span className="mt-1 text-[11px] text-faint">You · {fmtTime(at)}{read ? ' · Read' : ''}</span>}
    </div>
  )
}

// Sticky composer; Enter sends, Shift+Enter adds a line
export function Composer({ placeholder, onSend, disabled }: { placeholder: string; onSend: (body: string) => Promise<boolean>; disabled?: boolean }) {
  const [body, setBody] = useState('')
  const [sending, setSending] = useState(false)
  const send = async () => {
    const text = body.trim()
    if (!text || sending) return
    setSending(true)
    const ok = await onSend(text)
    setSending(false)
    if (ok) setBody('')
  }
  return (
    <div className="sticky bottom-0 z-20 flex items-end gap-2 border-t border-line bg-surface px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-3">
      <textarea value={body} onChange={e => setBody(e.target.value)} rows={1} placeholder={placeholder} disabled={disabled} aria-label="Message"
        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
        className="max-h-32 min-h-11 flex-1 resize-none rounded-[22px] bg-chip/70 px-4 py-2.5 text-[15px] outline-none placeholder:text-faint" />
      <button type="button" onClick={send} disabled={!body.trim() || sending || disabled} aria-label="Send"
        className="flex size-11 shrink-0 items-center justify-center rounded-full bg-green text-white transition disabled:opacity-40">
        <Icon name="send" className="size-5" />
      </button>
    </div>
  )
}

// Scroll to the newest message whenever the list grows
export function useStickToBottom(count: number) {
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => { end.current?.scrollIntoView({ block: 'end' }) }, [count])
  return end
}
