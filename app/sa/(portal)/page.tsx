import { createClient } from '@/lib/supabase/server'
import { getServerBaseUrl } from '@/lib/http/server-base'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/stats-card'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  UsersIcon,
  FolderOpenIcon,
  ActivityIcon,
  DollarSignIcon,
  ServerIcon,
  TrendingUpIcon,
  CalendarIcon,
} from 'lucide-react'
import { UserGrowthChart } from '@/components/user-growth-chart'

async function checkBackendHealth(): Promise<{ ok: boolean; status: string }> {
  const url = getServerBaseUrl()
  if (!url) return { ok: false, status: 'not configured' }
  try {
    const res = await fetch(`${url}/health`, { next: { revalidate: 30 } })
    if (res.ok) {
      const data = await res.json().catch(() => ({}))
      return { ok: true, status: data?.status || 'ok' }
    }
    return { ok: false, status: 'degraded' }
  } catch {
    return { ok: false, status: 'unreachable' }
  }
}

export default async function SADashboardPage() {
  const supabase = await createClient()

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [usersRes, workspacesRes, activePipelinesRes, revenueRes, mrrRes, activityRes, healthData] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('workspaces').select('*', { count: 'exact', head: true }),
    supabase.from('pipeline_runs').select('*', { count: 'exact', head: true }).eq('status', 'running'),
    supabase.from('credit_ledger').select('amount').eq('transaction_type', 'purchase').gt('amount', 0),
    supabase.from('credit_ledger').select('amount').eq('transaction_type', 'purchase').gt('amount', 0).gte('created_at', thirtyDaysAgo),
    supabase
      .from('audit_events')
      .select('id, action, details, created_at, actor_id, actor_email')
      .order('created_at', { ascending: false })
      .limit(10),
    checkBackendHealth(),
  ])

  const totalUsers = usersRes.count ?? 0
  const totalWorkspaces = workspacesRes.count ?? 0
  const activePipelines = activePipelinesRes.count ?? 0
  const totalRevenue = (revenueRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const mrr = (mrrRes.data ?? []).reduce((sum, row) => sum + (row.amount ?? 0), 0)
  const recentActivity = activityRes.data ?? []

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Administration" icon={ServerIcon} subtitle="Platform operations and health overview." />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <StatsCard icon={DollarSignIcon} label="Total Revenue" value={`$${totalRevenue.toLocaleString()}`} />
        <StatsCard icon={CalendarIcon} label="MRR (30d)" value={`$${mrr.toLocaleString()}`} />
        <StatsCard icon={ActivityIcon} label="Active Pipelines" value={activePipelines} />
        <StatsCard icon={UsersIcon} label="Total Users" value={totalUsers} />
        <StatsCard icon={FolderOpenIcon} label="Workspaces" value={totalWorkspaces} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ServerIcon className="w-5 h-5" />
            System Health
          </CardTitle>
          <CardDescription>Platform status overview</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            {healthData.ok ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className="text-sm">Operational</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span className="text-sm">Degraded</span>
              </div>
            )}
            <Badge variant={healthData.ok ? 'outline' : 'secondary'}>
              Backend: {healthData.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUpIcon className="w-5 h-5" />
            User Growth
          </CardTitle>
          <CardDescription>Cumulative user signups over time</CardDescription>
        </CardHeader>
        <CardContent>
          <UserGrowthChart />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Last 10 events across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-muted-foreground">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {recentActivity.map((event) => (
                <div key={event.id} className="flex items-start justify-between border-b border-border pb-3 last:border-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium">{event.action.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-muted-foreground">{event.actor_email || 'System'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground shrink-0">
                    {new Date(event.created_at).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
