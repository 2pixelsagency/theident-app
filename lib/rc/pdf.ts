// Small PDF writer shared by the CV and invoices (runs in the browser).
// Brand colours are read from the tokens.css variables at runtime, so nothing is hard-coded here.
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFImage, type PDFPage, type RGB } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'

export const A4 = { w: 595.28, h: 841.89 }

function cssColor(name: string): RGB {
  const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  let m = v.match(/^#([0-9a-f]{6})$/i)
  if (m) { const n = parseInt(m[1], 16); return rgb((n >> 16) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255) }
  m = v.match(/^#([0-9a-f]{3})$/i)
  if (m) { const [r, g, b] = m[1].split('').map(c => parseInt(c + c, 16) / 255); return rgb(r, g, b) }
  const r = v.match(/rgba?\(\s*(\d+)[ ,]+(\d+)[ ,]+(\d+)/)
  if (r) return rgb(+r[1] / 255, +r[2] / 255, +r[3] / 255)
  return rgb(0.1, 0.1, 0.1)
}

export type Brand = { ink: RGB; muted: RGB; line: RGB; green: RGB; dark: RGB; tint: RGB; white: RGB }

export class PdfWriter {
  doc!: PDFDocument
  page!: PDFPage
  display!: PDFFont
  regular!: PDFFont
  bold!: PDFFont
  c!: Brand
  margin = 48
  y = 0
  private charsets = new Map<PDFFont, Set<number>>()
  onNewPage?: (w: PdfWriter) => void

  static async create() {
    const w = new PdfWriter()
    w.doc = await PDFDocument.create()
    w.doc.registerFontkit(fontkit)
    w.regular = await w.doc.embedFont(StandardFonts.Helvetica)
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold)
    try {
      const res = await fetch('/fonts/ITC-Symbol-Std-Bold.otf')
      w.display = res.ok ? await w.doc.embedFont(await res.arrayBuffer(), { subset: false }) : w.bold
    } catch { w.display = w.bold }
    w.c = { ink: cssColor('--ink'), muted: cssColor('--muted'), line: cssColor('--line'), green: cssColor('--green'), dark: cssColor('--dark'), tint: cssColor('--bg'), white: rgb(1, 1, 1) }
    w.addPage()
    return w
  }

  get width() { return A4.w - this.margin * 2 }

  addPage() {
    this.page = this.doc.addPage([A4.w, A4.h])
    this.y = A4.h - this.margin
    this.onNewPage?.(this)
  }

  // Leave room for a block of height h, starting a new page if needed
  ensure(h: number) { if (this.y - h < this.margin + 20) this.addPage() }

  // Drop characters the font can't draw (e.g. emoji) instead of throwing
  clean(s: string, font: PDFFont) {
    let set = this.charsets.get(font)
    if (!set) { set = new Set(font.getCharacterSet()); this.charsets.set(font, set) }
    return Array.from(s.replace(/\r/g, '')).map(ch => (ch === '\n' || set!.has(ch.codePointAt(0)!) ? ch : ch === ' ' ? ' ' : '')).join('')
  }

  wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
    const lines: string[] = []
    for (const para of this.clean(text, font).split('\n')) {
      let line = ''
      for (const word of para.split(/\s+/)) {
        const next = line ? line + ' ' + word : word
        if (font.widthOfTextAtSize(next, size) <= maxWidth || !line) line = next
        else { lines.push(line); line = word }
      }
      lines.push(line)
    }
    return lines
  }

  textWidth(text: string, font: PDFFont, size: number) { return font.widthOfTextAtSize(this.clean(text, font), size) }

  // Draw wrapped text at the cursor and move down. Returns the height used.
  text(text: string, o: { size?: number; font?: PDFFont; color?: RGB; x?: number; maxWidth?: number; gap?: number } = {}) {
    const size = o.size ?? 10, font = o.font ?? this.regular, x = o.x ?? this.margin
    const lh = size * (o.gap ?? 1.35)
    const lines = this.wrap(text, font, size, o.maxWidth ?? this.width - (x - this.margin))
    for (const line of lines) {
      this.ensure(lh)
      this.y -= lh
      this.page.drawText(line, { x, y: this.y + size * 0.28, size, font, color: o.color ?? this.c.ink })
    }
    return lines.length * lh
  }

  // Text at an absolute position (no wrapping, cursor unchanged)
  at(text: string, x: number, y: number, o: { size?: number; font?: PDFFont; color?: RGB; align?: 'left' | 'right' } = {}) {
    const size = o.size ?? 10, font = o.font ?? this.regular, s = this.clean(text, font)
    const dx = o.align === 'right' ? font.widthOfTextAtSize(s, size) : 0
    this.page.drawText(s, { x: x - dx, y, size, font, color: o.color ?? this.c.ink })
  }

  rule(color = this.c.line, thickness = 0.75) {
    this.page.drawLine({ start: { x: this.margin, y: this.y }, end: { x: A4.w - this.margin, y: this.y }, thickness, color })
  }

  space(h: number) { this.y -= h }

  async image(url: string | null | undefined): Promise<PDFImage | null> {
    if (!url) return null
    try {
      const res = await fetch(url)
      if (!res.ok) return null
      const bytes = new Uint8Array(await res.arrayBuffer())
      const png = bytes[0] === 0x89 && bytes[1] === 0x50
      return png ? await this.doc.embedPng(bytes) : await this.doc.embedJpg(bytes)
    } catch { return null } // webp/heic or blocked — the PDF just goes without
  }

  // Footer on every page: left text + "Page n of m"
  footer(left: string) {
    const pages = this.doc.getPages()
    pages.forEach((pg, i) => {
      const s = this.clean(left, this.regular)
      pg.drawText(s, { x: this.margin, y: 26, size: 8, font: this.regular, color: this.c.muted })
      const right = 'Page ' + (i + 1) + ' of ' + pages.length
      pg.drawText(right, { x: A4.w - this.margin - this.regular.widthOfTextAtSize(right, 8), y: 26, size: 8, font: this.regular, color: this.c.muted })
    })
  }

  async bytes() { return this.doc.save() }
}

export function downloadBytes(bytes: Uint8Array, filename: string) {
  const url = URL.createObjectURL(new Blob([bytes as BlobPart], { type: 'application/pdf' }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 30_000)
}

export function fileSafe(s: string) {
  return s.replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '-') || 'document'
}
