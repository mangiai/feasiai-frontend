'use client'

import { useEffect, useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SAPagination } from '@/components/sa/sa-pagination'
import { cn } from '@/lib/utils'
import {
  CheckIcon,
  CopyIcon,
  InboxIcon,
  MailIcon,
  MessageSquareIcon,
  SearchIcon,
  XIcon,
} from 'lucide-react'

type ContactDetails = {
  name?: string
  email?: string
  subject?: string
  message?: string
}

export type ContactSubmission = {
  id: string
  created_at: string
  actor_email: string | null
  details: ContactDetails
}

const PAGE_SIZE = 10

function safePreview(s: string | undefined, max = 120) {
  if (!s) return ''
  const cleaned = s.replace(/\s+/g, ' ').trim()
  if (cleaned.length <= max) return cleaned
  return `${cleaned.slice(0, max)}…`
}

function clean(value?: string | null) {
  return (value || '').trim()
}

function getSenderEmail(submission: ContactSubmission) {
  return clean(submission.details?.email) || clean(submission.actor_email) || ''
}

function formatReceived(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatRelative(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffMs = Date.now() - date.getTime()
  const absMs = Math.abs(diffMs)
  const units = [
    { unit: 'day' as const, ms: 24 * 60 * 60 * 1000 },
    { unit: 'hour' as const, ms: 60 * 60 * 1000 },
    { unit: 'minute' as const, ms: 60 * 1000 },
  ]

  for (const { unit, ms } of units) {
    if (absMs >= ms) {
      return new Intl.RelativeTimeFormat('en', { numeric: 'auto' }).format(-Math.round(diffMs / ms), unit)
    }
  }

  return 'just now'
}

function initials(name?: string, email?: string) {
  const source = clean(name) || clean(email)
  if (!source) return 'NA'
  const parts = source.includes('@') ? source.split('@')[0].split(/[._-]+/) : source.split(/\s+/)
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || 'NA'
}

function isRecent(value: string, days = 7) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return false
  return Date.now() - date.getTime() <= days * 24 * 60 * 60 * 1000
}

export function ContactSubmissionsTable({ submissions }: { submissions: ContactSubmission[] }) {
  const [query, setQuery] = useState('')
  const [openId, setOpenId] = useState<string | null>(submissions[0]?.id ?? null)
  const [page, setPage] = useState(1)
  const [copiedEmail, setCopiedEmail] = useState(false)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return submissions
    return submissions.filter((s) => {
      const d = s.details || {}
      return (
        (d.name || '').toLowerCase().includes(q) ||
        (d.email || '').toLowerCase().includes(q) ||
        (d.subject || '').toLowerCase().includes(q) ||
        (d.message || '').toLowerCase().includes(q) ||
        (s.actor_email || '').toLowerCase().includes(q)
      )
    })
  }, [query, submissions])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedSubmissions = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const open = openId ? filtered.find((s) => s.id === openId) ?? submissions.find((s) => s.id === openId) : null
  const openEmail = open ? getSenderEmail(open) : ''

  useEffect(() => {
    setPage(1)
  }, [query])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  useEffect(() => {
    if (filtered.length === 0) {
      setOpenId(null)
      return
    }

    if (!openId || !filtered.some((submission) => submission.id === openId)) {
      setOpenId(filtered[0].id)
    }
  }, [filtered, openId])

  const copySenderEmail = async () => {
    if (!openEmail) return
    try {
      await navigator.clipboard.writeText(openEmail)
      setCopiedEmail(true)
      window.setTimeout(() => setCopiedEmail(false), 1600)
    } catch {
      setCopiedEmail(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/15 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search name, email, subject, or message..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 border-primary/15 bg-background pl-9 pr-9 focus-visible:ring-primary/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/20 bg-primary/5">
            {filtered.length.toLocaleString()} shown
          </Badge>
          <Badge variant="secondary" className="border-secondary/30 bg-secondary/15 text-secondary-foreground">
            {submissions.length.toLocaleString()} total
          </Badge>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex min-h-[320px] flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/10 px-6 py-12 text-center">
          <InboxIcon className="h-10 w-10 text-muted-foreground" />
          <div>
            <p className="text-sm font-medium text-foreground">No submissions found</p>
            <p className="mt-1 text-xs text-muted-foreground">Try a different search term or clear the search field.</p>
          </div>
          {query ? (
            <Button type="button" variant="outline" size="sm" onClick={() => setQuery('')}>
              Clear search
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
          <div className="space-y-3 xl:col-span-5">
            <div className="flex items-center justify-between px-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">Inbox</p>
              <p className="text-xs text-muted-foreground">Select a message to inspect</p>
            </div>

            <div className="overflow-hidden rounded-lg border border-border bg-card">
              <ul className="divide-y divide-border">
                {pagedSubmissions.map((s) => {
                  const d = s.details || {}
                  const email = getSenderEmail(s)
                  const selected = openId === s.id
                  const recent = isRecent(s.created_at)

                  return (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(s.id)}
                        className={cn(
                          'flex w-full gap-3 px-4 py-3.5 text-left transition-colors',
                          selected
                            ? 'border-l-[3px] border-l-secondary bg-gradient-to-r from-primary/10 via-primary/5 to-transparent'
                            : 'border-l-[3px] border-l-transparent hover:bg-muted/40',
                        )}
                      >
                        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary/15 to-secondary/10 text-xs font-semibold text-primary">
                          {initials(d.name, email)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="truncate text-sm font-semibold text-foreground">
                              {clean(d.name) || 'Unknown sender'}
                            </p>
                            <span
                              className="shrink-0 text-[11px] text-muted-foreground"
                              suppressHydrationWarning
                            >
                              {formatRelative(s.created_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{email || 'No email'}</p>
                          <p className="mt-1.5 truncate text-sm font-medium text-foreground/90">
                            {safePreview(d.subject, 72) || 'No subject'}
                          </p>
                          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {safePreview(d.message, 140) || 'No message body'}
                          </p>
                          {recent ? (
                            <Badge
                              variant="outline"
                              className="mt-2 border-secondary/30 bg-secondary/10 text-[10px] text-secondary"
                            >
                              Recent
                            </Badge>
                          ) : null}
                        </div>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>

            <SAPagination
              mode="buttons"
              currentPage={safePage}
              totalPages={totalPages}
              totalItems={filtered.length}
              pageSize={PAGE_SIZE}
              itemLabel="messages"
              onPageChange={setPage}
            />
          </div>

          <div className="xl:col-span-7">
            <div className="overflow-hidden rounded-lg border border-primary/15 bg-card shadow-[0_12px_40px_-28px_hsl(var(--primary)/0.4)] xl:sticky xl:top-6">
              <div className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-card to-secondary/12 px-5 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <MessageSquareIcon className="h-4 w-4 text-secondary" />
                    <div>
                      <p className="text-sm font-semibold">Message inspector</p>
                      <p className="text-xs text-muted-foreground">Full submission and quick actions</p>
                    </div>
                  </div>
                  {open ? (
                    <Badge variant="outline" className="shrink-0" suppressHydrationWarning>
                      {formatRelative(open.created_at)}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="p-5">
                {!open ? (
                  <div className="flex min-h-[280px] flex-col items-center justify-center gap-2 text-center text-muted-foreground">
                    <MailIcon className="h-8 w-8" />
                    <p className="text-sm font-medium text-foreground">No message selected</p>
                    <p className="max-w-xs text-xs">Choose a submission from the inbox to read the full message.</p>
                  </div>
                ) : (
                  <div className="space-y-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex items-start gap-3">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-gradient-to-br from-primary/15 to-secondary/10 text-sm font-semibold text-primary">
                          {initials(open.details?.name, openEmail)}
                        </div>
                        <div className="min-w-0">
                          <p className="text-base font-semibold">{clean(open.details?.name) || 'Unknown sender'}</p>
                          <p className="break-all text-sm text-muted-foreground">{openEmail || 'No email captured'}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 sm:justify-end">
                        <Button type="button" variant="outline" size="sm" onClick={copySenderEmail} disabled={!openEmail}>
                          {copiedEmail ? <CheckIcon className="mr-1.5 h-3.5 w-3.5" /> : <CopyIcon className="mr-1.5 h-3.5 w-3.5" />}
                          {copiedEmail ? 'Copied' : 'Copy email'}
                        </Button>
                        {openEmail ? (
                          <Button
                            type="button"
                            size="sm"
                            className="bg-gradient-to-r from-secondary to-secondary/90 text-secondary-foreground shadow-sm"
                            asChild
                          >
                            <a
                              href={`mailto:${openEmail}?subject=${encodeURIComponent(`Re: ${clean(open.details?.subject) || 'Contact form submission'}`)}`}
                            >
                              <MailIcon className="mr-1.5 h-3.5 w-3.5" />
                              Reply
                            </a>
                          </Button>
                        ) : (
                          <Button type="button" size="sm" disabled>
                            <MailIcon className="mr-1.5 h-3.5 w-3.5" />
                            Reply
                          </Button>
                        )}
                      </div>
                    </div>

                    <div className="grid gap-3 rounded-lg border border-border/80 bg-muted/15 p-4 sm:grid-cols-2">
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Subject</p>
                        <p className="mt-1 text-sm font-medium">{clean(open.details?.subject) || 'No subject'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Received</p>
                        <p className="mt-1 text-sm" suppressHydrationWarning>{formatReceived(open.created_at)}</p>
                      </div>
                    </div>

                    <div>
                      <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Message</p>
                      <div className="max-h-[min(28rem,50vh)] overflow-y-auto rounded-lg border border-border/80 bg-background/80 p-4 text-sm leading-relaxed whitespace-pre-wrap break-words text-foreground/90">
                        {clean(open.details?.message) || 'No message body'}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
