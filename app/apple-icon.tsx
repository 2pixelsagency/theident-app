import { ImageResponse } from 'next/og'
import { MARK_PATH } from '@/components/LogoMark'

// iOS home-screen icon (iOS rounds the corners itself)
export const size = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#123127' }}>
      <svg width={92} height={92} viewBox="0 0 4 4"><path fill="#CBF24C" d={MARK_PATH} /></svg>
    </div>,
    { ...size },
  )
}
