// Infinite ticker: content is rendered twice and slid -50% (pauses on hover, stops for reduced motion)
export default function Marquee({ items, speed = 40, className = '' }: { items: React.ReactNode[]; speed?: number; className?: string }) {
  const row = items.map((it, i) => <span key={i} className="shrink-0">{it}</span>)
  return (
    <div className={'marquee-wrap marquee-fade overflow-hidden ' + className}>
      <div className="marquee gap-3 pr-3" style={{ '--speed': speed + 's' } as React.CSSProperties}>
        {row}{items.map((it, i) => <span key={'b' + i} aria-hidden className="shrink-0">{it}</span>)}
      </div>
    </div>
  )
}
