'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SAPagination } from '@/components/sa/sa-pagination'
import { buildRegistryRows } from '@/lib/sa/model-catalog'
import { SearchIcon, XIcon, ExternalLinkIcon } from 'lucide-react'

const PAGE_SIZE = 12

export function ModelRegistryTable({
  activeModels,
  pipelineName,
  llmGateway,
}: {
  activeModels?: Record<string, string>
  pipelineName?: string | null
  llmGateway?: string | null
}) {
  const [query, setQuery] = useState('')
  const [page, setPage] = useState(1)

  const rows = useMemo(() => buildRegistryRows(activeModels), [activeModels])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(
      (r) =>
        r.modelId.toLowerCase().includes(q) ||
        r.label.toLowerCase().includes(q) ||
        r.provider.toLowerCase().includes(q) ||
        r.tasks.some((t) => t.toLowerCase().includes(q)),
    )
  }, [query, rows])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paged = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const activeCount = rows.filter((r) => r.status === 'active').length

  useEffect(() => {
    setPage(1)
  }, [query])

  useEffect(() => {
    if (page !== safePage) setPage(safePage)
  }, [page, safePage])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-md">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Filter models, providers, tasks..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="h-10 border-primary/15 bg-background pl-9 pr-9 focus-visible:ring-primary/30"
          />
          {query ? (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground hover:bg-muted"
              aria-label="Clear search"
            >
              <XIcon className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className="border-primary/20 bg-primary/5">
            {activeCount} active
          </Badge>
          <Badge variant="secondary" className="border-secondary/30 bg-secondary/15 text-secondary-foreground">
            {rows.length} catalog
          </Badge>
          {pipelineName ? (
            <Badge variant="outline" className="max-w-[180px] truncate">
              Pipeline: {pipelineName}
            </Badge>
          ) : null}
          <Button asChild variant="outline" size="sm">
            <Link href="/sa/models">
              Edit pipeline
              <ExternalLinkIcon className="ml-1 h-3.5 w-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Provider</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Assigned tasks</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tier</th>
              <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((row) => (
              <tr key={row.modelId} className="border-b border-border last:border-0 transition-colors hover:bg-primary/5">
                <td className="px-4 py-3">
                  <p className="font-medium font-mono text-xs">{row.modelId}</p>
                  <p className="text-xs text-muted-foreground">{row.label}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant="outline" className="capitalize">
                    {llmGateway === 'openrouter' && row.providerId === 'anthropic' && row.status === 'active'
                      ? 'OpenRouter → Anthropic'
                      : row.provider}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {row.tasks.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {row.tasks.map((task) => (
                        <Badge key={task} variant="secondary" className="text-[10px] font-normal capitalize">
                          {task}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span>—</span>
                  )}
                </td>
                <td className="px-4 py-3 capitalize text-muted-foreground">{row.tier}</td>
                <td className="px-4 py-3">
                  <Badge
                    variant={row.status === 'active' ? 'default' : 'outline'}
                    className={
                      row.status === 'active'
                        ? 'border-secondary/30 bg-secondary/15 text-secondary'
                        : ''
                    }
                  >
                    {row.status}
                  </Badge>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-muted-foreground">
                  No models match your filter.
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
        itemLabel="models"
        onPageChange={setPage}
      />
    </div>
  )
}
