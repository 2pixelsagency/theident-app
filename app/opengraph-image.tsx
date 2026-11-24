import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { MARK_PATH } from '@/components/LogoMark'

// Social preview for link shares (WhatsApp, iMessage, LinkedIn, X…): the brand mark, the headline in
// Bricolage, the Forest panel with a lime stripe band, and a floating "Your castings" card.
export const alt = 'The Ident — find the role, get the recall, book the job. Castings, auditions and paid work for performers.'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

const FOREST = '#123127', LIME = '#CBF24C', PAPER = '#F6F4EE', INK = '#15211C', BUTTER = '#F4E79A', MINT = '#CDEBD6'

export default async function OgImage() {
  const [b700, b800] = await Promise.all([
    readFile(join(process.cwd(), 'app/fonts/bricolage-grotesque-latin-700-normal.woff')),
    readFile(join(process.cwd(), 'app/fonts/bricolage-grotesque-latin-800-normal.woff')),
  ])
  const row = (title: string, sub: string, label: string, bg: string) => (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0', borderTop: '1px solid #EEEBE3' }}>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: 21, color: INK }}>{title}</div>
        <div style={{ fontSize: 16, color: '#5C6862', marginTop: 4 }}>{sub}</div>
      </div>
      <div style={{ display: 'flex', background: bg, color: INK, fontSize: 16, padding: '7px 14px', borderRadius: 999 }}>{label}</div>
    </div>
  )
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', position: 'relative', background: `radial-gradient(120% 120% at 85% 0%, #2B5A47 0%, ${FOREST} 55%, #0D241C 100%)`, fontFamily: 'Bricolage', color: PAPER }}>
        {/* lime stripe band behind the card */}
        <div style={{ position: 'absolute', left: 0, right: 0, top: 250, height: 150, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          {Array.from({ length: 8 }, (_, i) => <div key={i} style={{ height: 10, background: 'rgba(203,242,76,0.10)' }} />)}
        </div>

        {/* left: brand + headline */}
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '64px 0 64px 72px', width: 640 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <svg width="46" height="46" viewBox="0 0 4 4"><path fill={LIME} d={MARK_PATH} /></svg>
            <div style={{ fontSize: 40, fontWeight: 800, letterSpacing: -1.2 }}>The Ident</div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5 }}>Find the role.</div>
            <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5 }}>Get the recall.</div>
            <div style={{ fontSize: 70, fontWeight: 800, lineHeight: 1.02, letterSpacing: -2.5, color: LIME }}>Book the job.</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ display: 'flex', background: LIME, color: FOREST, fontSize: 22, fontWeight: 700, padding: '12px 22px', borderRadius: 999 }}>7 days free</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: 'rgba(246,244,238,0.8)' }}>www.theident.me</div>
          </div>
        </div>

        {/* right: floating app card in a translucent frame */}
        <div style={{ position: 'absolute', right: 64, top: 118, display: 'flex', padding: 10, borderRadius: 34, background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.22)' }}>
          <div style={{ width: 430, display: 'flex', flexDirection: 'column', background: '#FFFFFF', borderRadius: 26, padding: '28px 30px 18px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 10 }}>
              <div style={{ fontSize: 30, fontWeight: 800, color: INK, letterSpacing: -0.8 }}>Your castings</div>
              <div style={{ fontSize: 16, color: '#5C6862' }}>This week</div>
            </div>
            {row('The Glass Orchard — Nell', 'Self-tape due Fri', 'Self-tape', BUTTER)}
            {row('Harbour Lights — Witness', 'Video call · Tue 14:00', 'Recall', MINT)}
            {row('Pulse — UK arena tour', 'Sign your contract', 'Booked', LIME)}
          </div>
        </div>
        <div style={{ position: 'absolute', right: 40, top: 470, display: 'flex', alignItems: 'center', gap: 14, background: '#FFFFFF', borderRadius: 22, padding: '12px 22px 12px 12px', boxShadow: '0 20px 40px rgba(0,0,0,0.35)' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: LIME, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={FOREST} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5L20 7" /></svg>
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: INK }}>You’re booked!</div>
        </div>
      </div>
    ),
    { ...size, fonts: [{ name: 'Bricolage', data: b700, weight: 700, style: 'normal' }, { name: 'Bricolage', data: b800, weight: 800, style: 'normal' }] },
  )
}
