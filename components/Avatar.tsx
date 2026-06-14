import Link from 'next/link'

export default function Avatar({
  src, name, size = 44, online = false, ring = '#e6e2d9', href,
}: {
  src?: string | null
  name?: string | null
  size?: number
  online?: boolean
  ring?: string
  href?: string
}) {
  const initial = (name || '?').trim()[0]?.toUpperCase() || '?'
  const inner = (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: src ? 'url(' + src + ') center/cover' : '#e8efea',
        backgroundSize: 'cover', border: '2px solid ' + ring,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
      }}>
        {!src && <span style={{ fontFamily: "'ITC Symbol',Georgia,serif", fontWeight: 500, color: '#92d7af', fontSize: size * 0.4 }}>{initial}</span>}
      </div>
      {online && <div style={{ position: 'absolute', bottom: size * 0.02, right: size * 0.02, width: size * 0.22, height: size * 0.22, borderRadius: '50%', background: '#4ade80', border: '2px solid #f1f0ee' }} />}
    </div>
  )
  return href ? <Link href={href} style={{ textDecoration: 'none' }}>{inner}</Link> : inner
}
