import { inflateRawSync } from 'node:zlib'

// Minimal .docx text extraction (server only, no dependencies): a .docx is a zip; read the central
// directory, inflate word/document.xml and turn its paragraphs into plain text lines.
export function docxToText(buf: Buffer): string {
  // End of central directory record: signature 0x06054b50, within the last 64KB
  let eocd = -1
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 65557); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break }
  }
  if (eocd < 0) throw new Error('not a zip file')
  const entries = buf.readUInt16LE(eocd + 10)
  let p = buf.readUInt32LE(eocd + 16)
  for (let n = 0; n < entries; n++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) break
    const method = buf.readUInt16LE(p + 10)
    const compSize = buf.readUInt32LE(p + 20)
    const nameLen = buf.readUInt16LE(p + 28), extraLen = buf.readUInt16LE(p + 30), commentLen = buf.readUInt16LE(p + 32)
    const localOffset = buf.readUInt32LE(p + 42)
    const name = buf.toString('utf8', p + 46, p + 46 + nameLen)
    if (name === 'word/document.xml') {
      const lNameLen = buf.readUInt16LE(localOffset + 26), lExtraLen = buf.readUInt16LE(localOffset + 28)
      const start = localOffset + 30 + lNameLen + lExtraLen
      const data = buf.subarray(start, start + compSize)
      const xml = (method === 8 ? inflateRawSync(data) : data).toString('utf8')
      return xml
        .replace(/<w:tab\/>/g, '\t')
        .replace(/<w:br\/>|<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
        .replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
    }
    p += 46 + nameLen + extraLen + commentLen
  }
  throw new Error('no document.xml in file')
}
