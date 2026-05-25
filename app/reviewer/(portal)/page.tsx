import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { InboxIcon, ClockIcon, CheckCircleIcon, ClipboardCheckIcon } from 'lucide-react'
import { StatsCard } from '@/components/stats-card'

const TAB_LABELS: Record<string, string> = {
  pending: 'Pending Verification',
  in_progress: 'In Progress',
  verified: 'Completed',
  rejected: 'Rejected',
}

export default async function ReviewerQueuePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const params = await searchParams
  const validTabs = ['pending', 'in_progress', 'verified', 'rejected'] as const
  type VerificationTab = typeof validTabs[number]
  const tab: VerificationTab = validTabs.includes(params.tab as VerificationTab) ? (params.tab as VerificationTab) : 'pending'

  const supabase = await createClient()

  const [reportsRes, pendingCountRes, completedWeekRes] = await Promise.all([
    supabase
      .from('reports')
      .select(`
        id,
        title,
        report_type,
        verification_status,
        content,
        created_at,
        project:projects(id, name, address, city)
      `)
      .eq('verification_status', tab)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified'),
  ])

  const reports = reportsRes.data ?? []
  const totalPending = pendingCountRes.count ?? 0
  const completedThisWeek = completedWeekRes.count ?? 0

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <div className="flex items-center gap-2">
        <ClipboardCheckIcon className="w-6 h-6" />
        <h1 className="text-2xl font-semibold">Review Queue</h1>
        <Badge variant="secondary" className="ml-2">{reports.length} shown</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={InboxIcon} label="Total Pending" value={totalPending} />
        <StatsCard icon={ClockIcon} label="Avg Review Time" value="—" description="Tracking coming soon" />
        <StatsCard icon={CheckCircleIcon} label="Completed This Week" value={completedThisWeek} />
      </div>

      <div className="flex gap-2 flex-wrap">
        {validTabs.map((t) => (
          <Link
            key={t}
            href={`/reviewer?tab=${t}`}
            className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
              tab === t ? 'bg-accent text-foreground border-border' : 'text-muted-foreground hover:text-foreground border-border/50 hover:bg-accent/40'
            }`}
          >
            {TAB_LABELS[t]}
          </Link>
        ))}
      </div>

      {reports.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <InboxIcon className="w-12 h-12 text-muted-foreground mb-4" />
            <h2 className="text-lg font-medium mb-1">No {TAB_LABELS[tab]?.toLowerCase() || ''} reviews</h2>
            <p className="text-sm text-muted-foreground">
              No reports match this filter. Check another tab.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>{TAB_LABELS[tab] || 'Reviews'}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Report</th>
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Project</th>
                    <th className="text-left px-4 py-3 font-medium">Score</th>
                    <th className="text-left px-4 py-3 font-medium">Requested</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report) => {
                    const score =
                      report && typeof report === 'object' && 'content' in report
                        ? (report as { content?: unknown }).content &&
                          typeof (report as { content?: unknown }).content === 'object'
                          ? ((report as { content?: { validation_score?: unknown } }).content?.validation_score as unknown)
                          : undefined
                        : undefined

                    return (
                      <tr key={(report as { id: string }).id} className="border-b border-border last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/reviewer/reports/${(report as { id: string }).id}`} className="text-blue-600 hover:underline">
                            {(report as { title?: string }).title || 'Untitled Report'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline">{(report as { report_type?: string }).report_type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {((report as { project?: { address?: string | null; name?: string | null } }).project?.address) ||
                            ((report as { project?: { name?: string | null } }).project?.name) ||
                            '—'}
                          {((report as { project?: { city?: string | null } }).project?.city) && (
                            <span className="text-xs ml-1">({(report as { project: { city: string } }).project.city})</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {typeof score === 'number' ? (
                            <span className={score >= 80 ? 'text-green-600 font-semibold' : score >= 50 ? 'text-yellow-600 font-semibold' : 'text-red-600 font-semibold'}>
                              {Math.round(score)}%
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date((report as { created_at: string }).created_at).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

