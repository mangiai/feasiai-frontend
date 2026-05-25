import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { SAPagination, SA_TABLE_PAGE_SIZE } from '@/components/sa/sa-pagination'
import { ClipboardCheckIcon, InboxIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import { ReviewActions } from './review-actions'
import { ReviewTabs } from './review-tabs'
import { StatsCard } from '@/components/stats-card'
import Link from 'next/link'

const TAB_LABELS: Record<string, string> = {
  pending: 'Pending Verification',
  in_progress: 'In Progress',
  verified: 'Completed',
  rejected: 'Rejected',
}

const PAGE_SIZE = SA_TABLE_PAGE_SIZE

export default async function SAReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; page?: string }>
}) {
  const params = await searchParams
  const validTabs = ['pending', 'in_progress', 'verified', 'rejected'] as const
  type VerificationTab = typeof validTabs[number]
  const tab: VerificationTab = validTabs.includes(params.tab as VerificationTab) ? (params.tab as VerificationTab) : 'pending'
  const requestedPage = Number.parseInt(params.page ?? '1', 10)
  const supabase = await createClient()

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [tabCountRes, pendingCountRes, completedWeekRes] = await Promise.all([
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', tab),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'pending'),
    supabase
      .from('reports')
      .select('*', { count: 'exact', head: true })
      .eq('verification_status', 'verified')
      .gte('created_at', sevenDaysAgo),
  ])

  const totalForTab = tabCountRes.count ?? 0
  const totalPages = Math.max(1, Math.ceil(totalForTab / PAGE_SIZE))
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1
  const rangeFrom = (currentPage - 1) * PAGE_SIZE
  const rangeTo = rangeFrom + PAGE_SIZE - 1

  const reportsRes = await supabase
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
    .range(rangeFrom, rangeTo)

  const reports = reportsRes.data ?? []

  const totalPending = pendingCountRes.count ?? 0
  const completedThisWeek = completedWeekRes.count ?? 0

  const pageHref = (nextPage: number) => {
    const qs = new URLSearchParams()
    if (tab !== 'pending') qs.set('tab', tab)
    if (nextPage > 1) qs.set('page', String(nextPage))
    const queryString = qs.toString()
    return `/sa/reviews${queryString ? `?${queryString}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Review Queue"
        icon={ClipboardCheckIcon}
        subtitle="Manual verification workflow and report quality checks."
        badge={<Badge variant="secondary">{totalForTab} total</Badge>}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatsCard icon={InboxIcon} label="Total Pending" value={totalPending} />
        <StatsCard icon={ClockIcon} label="Avg Review Time" value="—" description="Tracking coming soon" />
        <StatsCard icon={CheckCircleIcon} label="Completed This Week" value={completedThisWeek} />
      </div>

      <ReviewTabs active={tab} />

      {totalForTab === 0 ? (
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
        <Card className="overflow-hidden border-primary/10">
          <CardHeader className="border-b border-border/70 bg-muted/20">
            <CardTitle>{TAB_LABELS[tab] || 'Reviews'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 pt-6">
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requested</th>
                    {tab === 'pending' && <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {reports.map((report: any) => {
                    const score = report.content?.validation_score
                    return (
                      <tr key={report.id} className="border-b border-border last:border-0 transition-colors hover:bg-primary/5">
                        <td className="px-4 py-3 font-medium">
                          <Link href={`/sa/reviews/${report.id}`} className="text-primary underline-offset-4 hover:underline">
                            {report.title || 'Untitled Report'}
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="capitalize">{report.report_type}</Badge>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {report.project?.address || report.project?.name || '—'}
                          {report.project?.city && <span className="text-xs ml-1">({report.project.city})</span>}
                        </td>
                        <td className="px-4 py-3">
                          {score !== undefined ? (
                            <span className={score >= 80 ? 'text-green-600 font-semibold' : score >= 50 ? 'text-amber-500 font-semibold' : 'text-red-600 font-semibold'}>
                              {score}%
                            </span>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        {tab === 'pending' && (
                          <td className="px-4 py-3 text-right">
                            <ReviewActions reportId={report.id} />
                          </td>
                        )}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <SAPagination
              mode="links"
              currentPage={currentPage}
              totalPages={totalPages}
              totalItems={totalForTab}
              pageSize={PAGE_SIZE}
              itemLabel="reviews"
              pageHref={pageHref}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
