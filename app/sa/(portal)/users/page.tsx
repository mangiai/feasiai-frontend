'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  AlertCircleIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronUpIcon,
  SearchIcon,
  ShieldIcon,
  UsersIcon,
} from 'lucide-react'
import type { Profile } from '@/types/database'

const PAGE_SIZE = 15

function UserDetailRow({ profile }: { profile: Profile }) {
  return (
    <tr>
      <td colSpan={7} className="px-4 py-4 bg-muted/20 border-b border-border">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
          <div>
            <span className="text-muted-foreground text-xs">User ID</span>
            <p className="font-mono text-xs">{profile.id}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Full Name</span>
            <p>{profile.full_name || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Email</span>
            <p>{profile.email || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">System Role</span>
            <p>{profile.system_role || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Account Type</span>
            <p>{profile.account_type || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Onboarding Status</span>
            <p>{profile.onboarding_status || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Phone</span>
            <p>{profile.phone || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Location</span>
            <p>{[profile.location_city, profile.location_state].filter(Boolean).join(', ') || '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Created</span>
            <p>{profile.created_at ? new Date(profile.created_at).toLocaleString() : '—'}</p>
          </div>
          <div>
            <span className="text-muted-foreground text-xs">Updated</span>
            <p>{profile.updated_at ? new Date(profile.updated_at).toLocaleString() : '—'}</p>
          </div>
        </div>
      </td>
    </tr>
  )
}

export default function SAUsersPage() {
  const supabase = useMemo(() => createClient(), [])
  const [loading, setLoading] = useState(true)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => window.clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  useEffect(() => {
    let active = true
    const fetchProfiles = async () => {
      setLoading(true)
      setError(null)

      const from = (page - 1) * PAGE_SIZE
      const to = from + PAGE_SIZE - 1
      const queryText = debouncedSearch
      const queryFilter = queryText
        ? `full_name.ilike.%${queryText}%,email.ilike.%${queryText}%`
        : null

      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(from, to)

      if (queryFilter) {
        query = query.or(queryFilter)
      }

      const { data, count, error: queryError } = await query
      if (!active) return

      if (queryError) {
        setProfiles([])
        setTotalUsers(0)
        setError(queryError.message)
      } else {
        setProfiles(data || [])
        setTotalUsers(count ?? 0)
      }

      setExpandedIds(new Set())
      setLoading(false)
    }

    fetchProfiles()
    return () => {
      active = false
    }
  }, [supabase, page, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(totalUsers / PAGE_SIZE))
  const start = totalUsers === 0 ? 0 : (page - 1) * PAGE_SIZE + 1
  const end = Math.min(page * PAGE_SIZE, totalUsers)

  function toggleExpand(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="User Management"
        icon={UsersIcon}
        subtitle="Platform account directory and profile details."
        badge={<Badge variant="secondary">{totalUsers} total</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="font-display">All Users</CardTitle>
          <CardDescription>View and manage platform user accounts.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative max-w-sm">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="text-xs text-muted-foreground">
              {loading ? 'Loading users...' : `Showing ${start}-${end} of ${totalUsers}`}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
              <AlertCircleIcon className="h-4 w-4" />
              <span>Could not load users: {error}</span>
            </div>
          )}

          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 font-medium">Name</th>
                      <th className="text-left px-4 py-3 font-medium">Email</th>
                      <th className="text-left px-4 py-3 font-medium">System Role</th>
                      <th className="text-left px-4 py-3 font-medium">Onboarding</th>
                      <th className="text-left px-4 py-3 font-medium">Account Type</th>
                      <th className="text-left px-4 py-3 font-medium">Created</th>
                      <th className="text-left px-4 py-3 font-medium"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {profiles.map((p) => (
                      <Fragment key={p.id}>
                        <tr className="border-b border-border last:border-0 hover:bg-muted/30">
                          <td className="px-4 py-3 font-medium">{p.full_name || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">{p.email || '—'}</td>
                          <td className="px-4 py-3">
                            {p.system_role ? (
                              <Badge className="gap-1">
                                <ShieldIcon className="w-3 h-3" />
                                {p.system_role}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{p.onboarding_status || 'unknown'}</Badge>
                          </td>
                          <td className="px-4 py-3">{p.account_type || '—'}</td>
                          <td className="px-4 py-3 text-muted-foreground">
                            {p.created_at ? new Date(p.created_at).toLocaleDateString() : '—'}
                          </td>
                          <td className="px-4 py-3">
                            <Button variant="outline" size="sm" onClick={() => toggleExpand(p.id)}>
                              {expandedIds.has(p.id) ? (
                                <><ChevronUpIcon className="mr-1 h-3.5 w-3.5" />Hide</>
                              ) : (
                                <><ChevronDownIcon className="mr-1 h-3.5 w-3.5" />View</>
                              )}
                            </Button>
                          </td>
                        </tr>
                        {expandedIds.has(p.id) && <UserDetailRow profile={p} />}
                      </Fragment>
                    ))}
                    {profiles.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                          No users found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col gap-3 border-t border-border/70 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <p className="text-xs text-muted-foreground">
                  Page {page} of {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    <ChevronLeftIcon className="mr-1 h-3.5 w-3.5" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                  >
                    Next
                    <ChevronRightIcon className="ml-1 h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
