'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Subtle, premium scroll reveal for the marketing site: headings, cards and list rows fade up a few
// pixels as they enter the viewport, lightly staggered among siblings. Skips the hero (it has its own
// entrance), anything inside moving rows (marquee/carousel), and anyone who prefers reduced motion.
const TARGETS = 'main section:not(:first-child) :is(h2, h3, p, dl, li, details, figure, img, [data-reveal])'
const SKIP = '.cursor-grab, .snap-x, [data-no-reveal]'

export default function ScrollReveal() {
  const pathname = usePathname()
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return
    const els = Array.from(document.querySelectorAll<HTMLElement>(TARGETS))
      .filter(el => !el.closest(SKIP) && !el.classList.contains('rise') && !el.parentElement?.closest('[data-revealing]'))
    // Only animate the outermost match (a card, not every line inside it)
    const roots = els.filter(el => !els.some(o => o !== el && o.contains(el)))
    const io = new IntersectionObserver(entries => {
      for (const e of entries) {
        if (!e.isIntersecting) continue
        const el = e.target as HTMLElement
        io.unobserve(el)
        el.classList.add('reveal-in')
      }
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.12 })
    for (const el of roots) {
      const r = el.getBoundingClientRect()
      if (r.top < window.innerHeight * 0.92) continue // already on screen: leave as is
      const i = el.parentElement ? Array.from(el.parentElement.children).indexOf(el) : 0
      el.style.setProperty('--reveal-delay', Math.min(i, 6) * 70 + 'ms')
      el.classList.add('reveal')
      io.observe(el)
    }
    return () => io.disconnect()
  }, [pathname])
  return null
}
