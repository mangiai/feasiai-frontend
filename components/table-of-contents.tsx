'use client'

import { useMemo } from 'react'
import { cn } from '@/lib/utils'

interface TocItem {
  id: string
  text: string
  level: 1 | 2 | 3
}

interface TableOfContentsProps {
  content: string
}

/** Extracts h1/h2/h3 headings from HTML or markdown-style content */
function parseHeadings(content: string): TocItem[] {
  const items: TocItem[] = []

  // Match HTML headings <h1>…</h1>, <h2>…</h2>, <h3>…</h3>
  const htmlRe = /<h([1-3])[^>]*>([^<]+)<\/h\1>/gi
  let m: RegExpExecArray | null
  while ((m = htmlRe.exec(content)) !== null) {
    const level = parseInt(m[1], 10) as 1 | 2 | 3
    const text = m[2].trim()
    const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    items.push({ id, text, level })
  }

  // If no HTML headings found, try markdown headings (# / ## / ###)
  if (items.length === 0) {
    const mdRe = /^(#{1,3})\s+(.+)$/gm
    while ((m = mdRe.exec(content)) !== null) {
      const level = m[1].length as 1 | 2 | 3
      const text = m[2].trim()
      const id = text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      items.push({ id, text, level })
    }
  }

  return items
}

export default function TableOfContents({ content }: TableOfContentsProps) {
  const headings = useMemo(() => parseHeadings(content), [content])

  if (headings.length === 0) return null

  function scrollTo(id: string) {
    const el = document.getElementById(id)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  return (
    <nav className="sticky top-24 space-y-1" aria-label="Table of contents">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        On this page
      </p>
      <ul className="space-y-0.5">
        {headings.map((h, i) => (
          <li key={`${h.id}-${i}`}>
            <button
              type="button"
              onClick={() => scrollTo(h.id)}
              className={cn(
                'block w-full text-left text-sm leading-snug text-muted-foreground transition-colors hover:text-foreground',
                h.level === 1 && 'pl-0 font-medium',
                h.level === 2 && 'pl-3',
                h.level === 3 && 'pl-6 text-xs',
              )}
            >
              {h.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}
