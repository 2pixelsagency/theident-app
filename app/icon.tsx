import { ImageResponse } from 'next/og'

// Favicon: the brand mark — Lime "Id" on a Forest rounded tile
export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#123127', borderRadius: 14, color: '#CBF24C', fontSize: 34, fontWeight: 800, letterSpacing: -2 }}>Id</div>,
    { ...size },
  )
}
