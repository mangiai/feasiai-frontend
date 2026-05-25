import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/stats-card'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { SAPagination, SA_TABLE_PAGE_SIZE } from '@/components/sa/sa-pagination'
import {
  BarChart3Icon,
  UsersIcon,
  FolderOpenIcon,
  FileTextIcon,
  ActivityIcon,
  CalendarIcon,
} from 'lucide-react'

const ACTIVITY_PAGE_SIZE = SA_TABLE_PAGE_SIZE

export default async function SAAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const params = await searchParams
  const requestedPage = Number.parseInt(params.page ?? '1', 10)
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    totalUsersRes,
    activeUsersRes,
    totalProjectsRes,
    totalReportsRes,
    activityCountRes,
    recentActivityRes,
    flowTypeRes,
    userGrowthRes,
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('last_active_at', thirtyDaysAgo),
    supabase.from('projects').select('*', { count: 'exact', head: true }),
    supabase.from('reports').select('*', { count: 'exact', head: true }),
    supabase.from('audit_events').select('*', { count: 'exact', head: true }),
    supabase
      .from('audit_events')
      .select('id, action, actor_email, actor_role, resource_type, created_at')
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('projects').select('flow_type'),
    supabase.from('profiles').select('created_at').order('created_at', { ascending: true }),
  ])

  const totalUsers = totalUsersRes.count ?? 0
  const activeUsers = activeUsersRes.count ?? 0
  const totalProjects = totalProjectsRes.count ?? 0
  const totalReports = totalReportsRes.count ?? 0
  const allActivity = (recentActivityRes.data as any[]) ?? []
  const totalActivity = activityCountRes.count ?? allActivity.length

  const activityTotalPages = Math.max(1, Math.ceil(allActivity.length / ACTIVITY_PAGE_SIZE))
  const activityPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), activityTotalPages)
    : 1
  const activityStart = (activityPage - 1) * ACTIVITY_PAGE_SIZE
  const recentActivity = allActivity.slice(activityStart, activityStart + ACTIVITY_PAGE_SIZE)

  const flowTypeData = (flowTypeRes.data ?? []) as { flow_type: string | null }[]
  const flowTypeCounts: Record<string, number> = {}
  for (const row of flowTypeData) {
    const key = row.flow_type || 'unknown'
    flowTypeCounts[key] = (flowTypeCounts[key] || 0) + 1
  }
  const flowTotal = Object.values(flowTypeCounts).reduce((sum, count) => sum + count, 0)

  const growthData = (userGrowthRes.data ?? []) as { created_at: string }[]
  const monthCounts: Record<string, number> = {}
  for (const row of growthData) {
    const month = row.created_at?.slice(0, 7)
    if (month) monthCounts[month] = (monthCounts[month] || 0) + 1
  }
  const sortedMonths = Object.entries(monthCounts).sort(([a], [b]) => a.localeCompare(b))

  const activityPageHref = (nextPage: number) => {
    const qs = new URLSearchParams()
    if (nextPage > 1) qs.set('page', String(nextPage))
    const queryString = qs.toString()
    return `/sa/analytics${queryString ? `?${queryString}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Analytics" icon={BarChart3Icon} subtitle="Usage, growth, and platform performance metrics." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={UsersIcon} label="Total Users" value={totalUsers} />
        <StatsCard icon={ActivityIcon} label="Active Users (30d)" value={activeUsers} />
        <StatsCard icon={FolderOpenIcon} label="Total Projects" value={totalProjects} />
        <StatsCard icon={FileTextIcon} label="Reports Generated" value={totalReports} />
      </div>

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/5 via-card to-secondary/10">
          <CardTitle className="flex items-center gap-2 text-base">
            <FolderOpenIcon className="w-5 h-5 text-primary" />
            Feature Usage by Flow Type
          </CardTitle>
          <CardDescription>Project distribution across pipeline flow types</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {Object.keys(flowTypeCounts).length === 0 ? (
            <p className="text-sm text-muted-foreground">No project data available.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(flowTypeCounts)
                .sort(([, a], [, b]) => b - a)
                .map(([type, count]) => {
                  const percent = flowTotal > 0 ? Math.round((count / flowTotal) * 100) : 0
                  return (
                    <div key={type} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <span className="font-medium capitalize">{type.replace(/_/g, ' ')}</span>
                        <Badge variant="secondary" className="border-secondary/30 bg-secondary/15 text-secondary">
                          {percent}%
                        </Badge>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-primary to-secondary transition-all"
                          style={{ width: `${percent}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <CalendarIcon className="w-5 h-5 text-primary" />
            User Growth by Month
          </CardTitle>
          <CardDescription>New user signups per month</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {sortedMonths.length === 0 ? (
            <p className="text-sm text-muted-foreground">No growth data available.</p>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Month</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">New Users</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cumulative</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    let cumulative = 0
                    return sortedMonths.map(([month, count]) => {
                      cumulative += count
                      return (
                        <tr key={month} className="border-b border-border last:border-0 hover:bg-primary/5">
                          <td className="px-4 py-3 font-medium">{month}</td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary" className="border-secondary/30 bg-secondary/15 text-secondary">
                              {count}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-muted-foreground">{cumulative}</td>
                        </tr>
                      )
                    })
                  })()}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <CardTitle className="text-base">Recent User Activity</CardTitle>
          <CardDescription>
            Audit events across the platform ({totalActivity.toLocaleString()} total)
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-6">
          {allActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <>
              <div className="overflow-x-auto rounded-md border border-border">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/50">
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">User</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Action</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Resource</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Role</th>
                      <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentActivity.map((event: any) => (
                      <tr key={event.id} className="border-b border-border last:border-0 transition-colors hover:bg-primary/5">
                        <td className="px-4 py-3 font-medium">{event.actor_email || 'System'}</td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">
                            {event.action?.replace(/_/g, ' ') || '—'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{event.resource_type || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{event.actor_role || '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground whitespace-nowrap">
                          {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <SAPagination
                mode="links"
                currentPage={activityPage}
                totalPages={activityTotalPages}
                totalItems={allActivity.length}
                pageSize={ACTIVITY_PAGE_SIZE}
                itemLabel="events"
                pageHref={activityPageHref}
              />
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
