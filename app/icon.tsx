import { ImageResponse } from 'next/og'
import { MARK_PATH } from '@/components/LogoMark'

// Favicon: the brand mark — Lime mark on a Forest rounded tile
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#123127', borderRadius: 14 }}>
      <svg width={36} height={36} viewBox="0 0 4 4"><path fill="#CBF24C" d={MARK_PATH} /></svg>
    </div>,
    { ...size },
  )
}
