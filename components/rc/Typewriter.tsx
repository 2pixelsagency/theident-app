'use client'

import { useEffect, useState } from 'react'

const reduced = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

// Types `text` in, then (optionally) cycles through `words` after it: type, pause, delete, next.
// `once` = only animate the first time this key is seen in the session (e.g. the Home greeting).
export default function Typewriter({ text, words, speed = 42, once, className }: { text: string; words?: string[]; speed?: number; once?: string; className?: string }) {
  const [skip, setSkip] = useState(false)
  const [n, setN] = useState(0)
  const [w, setW] = useState({ i: 0, len: 0, del: false })
  const firstLen = words?.[0]?.length || 0
  // Decide after mount (same markup on server and client): reduced motion, or already typed this session → show it all
  useEffect(() => {
    let seen = false
    if (once) try { seen = !!sessionStorage.getItem('ident.typed.' + once); sessionStorage.setItem('ident.typed.' + once, '1') } catch { /* */ }
    if (reduced() || seen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSkip(true); setN(text.length); setW(s => ({ ...s, len: firstLen }))
    }
  }, [once, text.length, firstLen])

  useEffect(() => {
    if (!skip && n < text.length) { const t = setTimeout(() => setN(n + 1), speed); return () => clearTimeout(t) }
  }, [n, text.length, speed, skip])

  useEffect(() => {
    if (!words?.length || n < text.length || reduced()) return
    const word = words[w.i]
    const done = !w.del && w.len === word.length
    const t = setTimeout(() => setW(s => done ? { ...s, del: true }
      : s.del ? (s.len === 0 ? { i: (s.i + 1) % words.length, len: 0, del: false } : { ...s, len: s.len - 1 })
      : { ...s, len: s.len + 1 }), done ? 1800 : w.del ? 35 : speed + 18)
    return () => clearTimeout(t)
  }, [w, words, n, text.length, speed, skip])

  const typing = !skip && (n < text.length || !!words?.length)
  return (
    <span className={className} aria-label={text + (words?.[0] || '')}>
      <span aria-hidden>{text.slice(0, n)}{words?.length ? <span className="text-green-ink">{words[w.i].slice(0, w.len)}</span> : null}</span>
      {typing && <span aria-hidden className="type-caret" />}
    </span>
  )
}
