'use client'

import { useEffect, useMemo, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { SAPagination } from '@/components/sa/sa-pagination'
import { cn } from '@/lib/utils'
import { SearchIcon, XIcon } from 'lucide-react'

interface AuditEvent {
  id: string
  action: string
  actor_email: string | null
  actor_role: string | null
  resource_type: string | null
  resource_id: string | null
  details: unknown
  created_at: string
}

const PAGE_SIZE = 15

export function SystemAuditLog({ events }: { events: AuditEvent[] }) {
  const [filter, setFilter] = useState('')
  const [page, setPage] = useState(1)

  const uniqueActions = useMemo(
    () => Array.from(new Set(events.map((e) => e.action).filter(Boolean))).slice(0, 10),
    [events],
  )

  const filtered = useMemo(() => {
    if (!filter) return events
    const q = filter.toLowerCase()
    return events.filter(
      (e) =>
        (e.action || '').toLowerCase().includes(q) ||
        (e.actor_email || '').toLowerCase().includes(q) ||
        (e.resource_type || '').toLowerCase().includes(q) ||
        (e.actor_role || '').toLowerCase().includes(q),
    )
  }, [events, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  useEffect(() => {
    setPage(1)
  }, [filter])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-border/80 bg-muted/15 p-3 space-y-3">
        <div className="relative max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter by action, email, resource, or role..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="h-10 border-primary/15 bg-background pl-9 pr-9 focus-visible:ring-primary/30"
          />
          {filter ? (
            <button
              type="button"
              onClick={() => setFilter('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear filter"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2">
          {uniqueActions.map((action) => (
            <button
              key={action}
              type="button"
              onClick={() => setFilter(filter === action ? '' : action)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-medium transition-all',
                filter === action
                  ? 'border-primary/30 bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-sm'
                  : 'border-border/80 bg-background text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground',
              )}
            >
              {action.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actor</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resource</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((event) => (
              <tr key={event.id} className="border-b border-border last:border-0 transition-colors hover:bg-primary/5">
                <td className="px-4 py-3">
                  <Badge variant="outline" className="capitalize">
                    {event.action?.replace(/_/g, ' ') || '—'}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs font-medium">{event.actor_email || 'System'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {event.resource_type || '—'}
                  {event.resource_id ? (
                    <span className="mt-0.5 block font-mono text-[10px]">{event.resource_id.slice(0, 8)}…</span>
                  ) : null}
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{event.actor_role || '—'}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">
                  {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No audit events match the filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SAPagination
        mode="buttons"
        currentPage={safePage}
        totalPages={totalPages}
        totalItems={filtered.length}
        pageSize={PAGE_SIZE}
        itemLabel="events"
        onPageChange={setPage}
      />
    </div>
  )
}
