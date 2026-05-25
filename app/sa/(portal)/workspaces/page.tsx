'use client'

import { useState, useEffect, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { SearchIcon, FolderOpenIcon, LockIcon, ArrowRightIcon } from 'lucide-react'
import Link from 'next/link'
import type { Workspace } from '@/types/database'

interface WorkspaceWithMembers extends Workspace {
  workspace_memberships: { id: string }[]
}

const PAGE_SIZE = 15

function isWorkspaceLocked(settings: Workspace['settings']) {
  return Boolean((settings as { is_locked?: unknown } | null)?.is_locked)
}

export default function SAWorkspacesPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [workspaces, setWorkspaces] = useState<WorkspaceWithMembers[]>([])
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    supabase
      .from('workspaces')
      .select('*, workspace_memberships(id)')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setWorkspaces((data as WorkspaceWithMembers[]) || [])
        setLoading(false)
      })
  }, [supabase])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return workspaces
    return workspaces.filter((w) => (
      (w.name || '').toLowerCase().includes(q) ||
      (w.slug || '').toLowerCase().includes(q)
    ))
  }, [search, workspaces])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const pagedWorkspaces = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const firstIndex = filtered.length === 0 ? 0 : ((safePage - 1) * PAGE_SIZE) + 1
  const lastIndex = Math.min(filtered.length, firstIndex + pagedWorkspaces.length - 1)

  useEffect(() => {
    setPage(1)
  }, [search])

  useEffect(() => {
    if (page !== safePage) {
      setPage(safePage)
    }
  }, [page, safePage])

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Workspace Management"
        icon={FolderOpenIcon}
        subtitle="Workspace access, status, and member overview."
        badge={<Badge variant="secondary">{workspaces.length} total</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle>All Workspaces</CardTitle>
          <CardDescription>View and manage all workspaces on the platform.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or slug..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            {!loading ? (
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{filtered.length.toLocaleString()} shown</Badge>
                <Badge variant="secondary">{workspaces.length.toLocaleString()} total</Badge>
              </div>
            ) : null}
          </div>

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <div className="space-y-3">
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Slug</th>
                      <th className="text-left px-4 py-3 font-medium">Type</th>
                      <th className="text-left px-4 py-3 font-medium">Members</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-left px-4 py-3 font-medium">Status</th>
                      <th className="text-left px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedWorkspaces.map((w) => {
                      const locked = isWorkspaceLocked(w.settings)
                      return (
                        <tr key={w.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">
                            <div className="flex items-center gap-2">
                              {locked && (
                                <LockIcon className="w-3.5 h-3.5 text-destructive flex-shrink-0" />
                              )}
                              {w.name}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{w.slug}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="capitalize">{w.type || '—'}</Badge>
                          </td>
                          <td className="px-4 py-3">{w.workspace_memberships?.length ?? 0}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {w.created_at ? new Date(w.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            {locked ? (
                              <Badge variant="destructive" className="gap-1 text-xs">
                                <LockIcon className="w-2.5 h-2.5" />
                                Locked
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-xs">Active</Badge>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Link
                              href={`/sa/workspaces/${w.id}`}
                              className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              View <ArrowRightIcon className="w-3 h-3" />
                            </Link>
                          </td>
                        </tr>
                      )
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No workspaces found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {filtered.length > 0 ? (
                <div className="flex flex-col gap-3 rounded-none border border-border bg-muted/20 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Showing {firstIndex.toLocaleString()}-{lastIndex.toLocaleString()} of {filtered.length.toLocaleString()} workspaces
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage(1)} disabled={safePage <= 1}>
                      First
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={safePage <= 1}>
                      Previous
                    </Button>
                    <span className="px-2 text-xs text-muted-foreground">
                      Page {safePage.toLocaleString()} / {totalPages.toLocaleString()}
                    </span>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage((value) => Math.min(totalPages, value + 1))} disabled={safePage >= totalPages}>
                      Next
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setPage(totalPages)} disabled={safePage >= totalPages}>
                      Last
                    </Button>
                  </div>
                </div>
              ) : null}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
