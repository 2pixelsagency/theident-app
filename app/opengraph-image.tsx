import { ImageResponse } from 'next/og'

// Default social preview for theident.me pages (link shares on WhatsApp, iMessage, LinkedIn, X…)
export const alt = 'The Ident — castings, auditions and paid work for performers'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: 72, background: '#123127', color: '#ffffff' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 64, height: 64, borderRadius: 14, background: '#CBF24C', color: '#123127', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 30, fontWeight: 800 }}>Id</div>
          <div style={{ fontSize: 36, fontWeight: 700 }}>The Ident</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>Find the role. Get the recall.</div>
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, letterSpacing: -2, color: '#CBF24C' }}>Book the job.</div>
        </div>
        <div style={{ fontSize: 28, color: 'rgba(255,255,255,0.75)' }}>Castings, auditions &amp; paid work for performers · theident.me</div>
      </div>
    ),
    { ...size },
  )
}
