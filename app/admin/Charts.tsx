'use client'

import { useState } from 'react'

// Small, dependency-free SVG charts for the admin dashboard.
// Single-series charts (no legend — the card title names the series); thin marks, recessive grid, hover tooltip.
export type Point = { day: string; value: number }
const W = 600, H = 200, PAD = { l: 28, r: 8, t: 12, b: 24 }
const fmtDay = (d: string) => new Date(d + 'T12:00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
const niceMax = (m: number) => { if (m <= 4) return 4; const p = Math.pow(10, Math.floor(Math.log10(m))); return Math.ceil(m / p) * p }

function Frame({ data, max, children, hover, setHover, unit }: { data: Point[]; max: number; children: React.ReactNode; hover: number | null; setHover: (i: number | null) => void; unit: string }) {
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const ticks = [0, max / 2, max]
  const step = Math.max(1, Math.ceil(data.length / 5))
  const x = (i: number) => PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
  const move = (e: React.PointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    setHover(Math.max(0, Math.min(data.length - 1, Math.round(((px - PAD.l) / iw) * (data.length - 1)))))
  }
  const h = hover != null ? data[hover] : null
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full touch-none" onPointerMove={move} onPointerLeave={() => setHover(null)} role="img" aria-label={'Chart of ' + unit + ' per day'}>
        {ticks.map(t => {
          const y = PAD.t + ih - (t / max) * ih
          return <g key={t}><line x1={PAD.l} x2={W - PAD.r} y1={y} y2={y} stroke="var(--line)" strokeWidth="1" /><text x={PAD.l - 6} y={y + 3} textAnchor="end" fontSize="10" fill="var(--muted)">{Math.round(t)}</text></g>
        })}
        {data.map((d, i) => i % step === 0 && <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="10" fill="var(--muted)">{fmtDay(d.day)}</text>)}
        {children}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={PAD.t} y2={PAD.t + ih} stroke="var(--ink)" strokeOpacity="0.25" strokeWidth="1" />}
      </svg>
      {h && (
        <div className="pointer-events-none absolute top-0 rounded-lg bg-ink px-2.5 py-1.5 text-[12px] text-white shadow-card"
          style={{ left: `clamp(0px, calc(${(x(hover!) / W) * 100}% - 50px), calc(100% - 110px))` }}>
          <span className="block text-white/60">{fmtDay(h.day)}</span><span className="font-semibold">{h.value} {unit}</span>
        </div>
      )}
    </div>
  )
}

export function AreaChart({ data, unit, color = 'var(--forest)' }: { data: Point[]; unit: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(1, ...data.map(d => d.value)))
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const pts = data.map((d, i) => [PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw), PAD.t + ih - (d.value / max) * ih] as const)
  const line = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join(' ')
  const area = line + ` L${pts[pts.length - 1][0]} ${PAD.t + ih} L${pts[0][0]} ${PAD.t + ih} Z`
  return (
    <Frame data={data} max={max} hover={hover} setHover={setHover} unit={unit}>
      <path d={area} fill={color} opacity="0.1" />
      <path d={line} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
      {hover != null && <circle cx={pts[hover][0]} cy={pts[hover][1]} r="4.5" fill={color} stroke="var(--surface)" strokeWidth="2" />}
    </Frame>
  )
}

export function BarChart({ data, unit, color = 'var(--forest)' }: { data: Point[]; unit: string; color?: string }) {
  const [hover, setHover] = useState<number | null>(null)
  const max = niceMax(Math.max(1, ...data.map(d => d.value)))
  const iw = W - PAD.l - PAD.r, ih = H - PAD.t - PAD.b
  const slot = iw / Math.max(1, data.length - 1)
  const bw = Math.max(3, Math.min(18, slot - 2)) // ≥2px gap between bars
  return (
    <Frame data={data} max={max} hover={hover} setHover={setHover} unit={unit}>
      {data.map((d, i) => {
        const cx = PAD.l + (data.length === 1 ? iw / 2 : (i / (data.length - 1)) * iw)
        const h = (d.value / max) * ih
        if (!h) return null
        const r = Math.min(4, bw / 2, h)
        const x0 = cx - bw / 2, y0 = PAD.t + ih - h, y1 = PAD.t + ih
        // rounded top, square at the baseline
        return <path key={d.day} d={`M${x0} ${y1} V${y0 + r} Q${x0} ${y0} ${x0 + r} ${y0} H${x0 + bw - r} Q${x0 + bw} ${y0} ${x0 + bw} ${y0 + r} V${y1} Z`} fill={color} opacity={hover == null || hover === i ? 1 : 0.45} />
      })}
    </Frame>
  )
}

// Two-part split as one bar with direct labels (identity never by colour alone)
export function SplitBar({ parts }: { parts: { label: string; value: number; color: string }[] }) {
  const total = parts.reduce((s, p) => s + p.value, 0) || 1
  return (
    <div>
      <div className="flex h-3 gap-[2px] overflow-hidden rounded-full">
        {parts.map(p => <span key={p.label} style={{ width: (p.value / total) * 100 + '%', background: p.color }} title={p.label + ': ' + p.value} />)}
      </div>
      <div className="mt-3 space-y-2">
        {parts.map(p => (
          <div key={p.label} className="flex items-center gap-2 text-[13px]">
            <span className="size-2.5 rounded-full" style={{ background: p.color }} />
            <span className="flex-1 text-ink">{p.label}</span>
            <span className="font-semibold text-ink">{p.value.toLocaleString('en-GB')}</span>
            <span className="w-10 text-right text-muted">{Math.round((p.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
