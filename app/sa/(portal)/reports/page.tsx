import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  ArrowRightIcon,
  BarChart3Icon,
  FileTextIcon,
  FilterIcon,
  InboxIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { SAFilterChipLink, SAFilterSection } from '@/components/sa/sa-filter-chips'
import { SAPagination } from '@/components/sa/sa-pagination'

type ReportTypeFilter = 'all' | 'feasibility' | 'corrections' | 'city_review' | 'permit_creation'
type VerificationFilter = 'all' | 'pending' | 'in_progress' | 'verified' | 'rejected' | 'not_requested'

type ReportProject = {
  id: string
  name: string | null
  address: string | null
  city: string | null
} | null

type ReportRow = {
  id: string
  title: string | null
  report_type: string | null
  status: string | null
  verification_status: string | null
  content: { validation_score?: unknown } | null
  created_at: string
  project: ReportProject
}

const TYPE_LABELS: Record<ReportTypeFilter, string> = {
  all: 'All Types',
  feasibility: 'Feasibility',
  corrections: 'Corrections',
  city_review: 'City Review',
  permit_creation: 'Permit Creation',
}

const VERIFICATION_LABELS: Record<VerificationFilter, string> = {
  all: 'Any Verification',
  pending: 'Pending',
  in_progress: 'In Progress',
  verified: 'Completed',
  rejected: 'Rejected',
  not_requested: 'Not Requested',
}

const VERIFICATION_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  pending: 'secondary',
  in_progress: 'secondary',
  verified: 'default',
  rejected: 'destructive',
  not_requested: 'outline',
}

const VERIFICATION_BADGE_CLASS: Record<string, string> = {
  pending: 'border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300',
  in_progress: 'border-sky-500/20 bg-sky-500/15 text-sky-700 dark:text-sky-300',
  verified: 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
  rejected: 'border-rose-500/20 bg-rose-500/15 text-rose-700 dark:text-rose-300',
  not_requested: 'border-border bg-muted/30 text-muted-foreground',
}

function formatVerification(status: string) {
  return status === 'verified' ? 'completed' : status.replace(/_/g, ' ')
}

function formatReportType(type: string | null | undefined) {
  return String(type || 'unknown').replace(/_/g, ' ')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(date)
}

function scoreValue(value: unknown) {
  const score = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(score) ? Math.round(score) : null
}

function scoreClass(score: number) {
  if (score >= 90) return 'border-emerald-500/20 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
  if (score >= 70) return 'border-lime-500/20 bg-lime-500/15 text-lime-700 dark:text-lime-300'
  if (score >= 50) return 'border-amber-500/20 bg-amber-500/15 text-amber-700 dark:text-amber-300'
  return 'border-rose-500/20 bg-rose-500/15 text-rose-700 dark:text-rose-300'
}

function projectLabel(project: ReportProject) {
  return project?.address || project?.name || 'No project linked'
}

function ReportsStatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: typeof FileTextIcon
  label: string
  value: string | number
  description: string
}) {
  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card via-card to-muted/20">
      <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
        <div>
          <CardTitle className="text-sm">{label}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <div className="rounded-full border border-primary/15 bg-primary/10 p-2 text-primary">
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight">{value}</p>
      </CardContent>
    </Card>
  )
}

export default async function SAReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string; verification?: string; q?: string; page?: string }>
}) {
  const params = await searchParams
  const supabase = await createClient()

  const validTypes: ReportTypeFilter[] = ['all', 'feasibility', 'corrections', 'city_review', 'permit_creation']
  const validVerification: VerificationFilter[] = ['all', 'pending', 'in_progress', 'verified', 'rejected', 'not_requested']

  const typeFilter: ReportTypeFilter = validTypes.includes(params.type as ReportTypeFilter)
    ? (params.type as ReportTypeFilter)
    : 'all'
  const verificationFilter: VerificationFilter = validVerification.includes(params.verification as VerificationFilter)
    ? (params.verification as VerificationFilter)
    : 'all'
  const search = (params.q ?? '').trim()
  const requestedPage = Number.parseInt(params.page ?? '1', 10)

  let query = supabase
    .from('reports')
    .select(`
      id,
      title,
      report_type,
      status,
      verification_status,
      content,
      created_at,
      project:projects(id, name, address, city)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (typeFilter !== 'all') query = query.eq('report_type', typeFilter)
  if (verificationFilter !== 'all') query = query.eq('verification_status', verificationFilter)

  const { data } = await query
  let reports = ((data ?? []) as unknown as ReportRow[])

  if (search.length > 0) {
    const needle = search.toLowerCase()
    reports = reports.filter((report) => {
      const title = String(report.title ?? '').toLowerCase()
      const address = String(report.project?.address ?? '').toLowerCase()
      const projectName = String(report.project?.name ?? '').toLowerCase()
      const city = String(report.project?.city ?? '').toLowerCase()
      return title.includes(needle) || address.includes(needle) || projectName.includes(needle) || city.includes(needle)
    })
  }

  const totalReports = reports.length
  const completedReports = reports.filter((r) => r.verification_status === 'verified').length
  const feasibilityReports = reports.filter((r) => r.report_type === 'feasibility').length
  const pendingReports = reports.filter((r) => r.verification_status === 'pending').length
  const pageSize = 10
  const totalPages = Math.max(1, Math.ceil(totalReports / pageSize))
  const currentPage = Number.isFinite(requestedPage) ? Math.min(Math.max(requestedPage, 1), totalPages) : 1
  const startIndex = (currentPage - 1) * pageSize
  const endIndex = startIndex + pageSize
  const paginatedReports = reports.slice(startIndex, endIndex)

  const filterHref = (nextType: ReportTypeFilter, nextVerification: VerificationFilter) => {
    const qs = new URLSearchParams()
    if (nextType !== 'all') qs.set('type', nextType)
    if (nextVerification !== 'all') qs.set('verification', nextVerification)
    if (search) qs.set('q', search)
    const queryString = qs.toString()
    return `/sa/reports${queryString ? `?${queryString}` : ''}`
  }

  const pageHref = (nextPage: number) => {
    const qs = new URLSearchParams()
    if (typeFilter !== 'all') qs.set('type', typeFilter)
    if (verificationFilter !== 'all') qs.set('verification', verificationFilter)
    if (search) qs.set('q', search)
    if (nextPage > 1) qs.set('page', String(nextPage))
    const queryString = qs.toString()
    return `/sa/reports${queryString ? `?${queryString}` : ''}`
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Reports"
        icon={FileTextIcon}
        subtitle="Verification oversight and generated report monitoring."
        badge={
          <Badge
            variant="secondary"
            className="rounded-full border border-primary/20 bg-gradient-to-r from-primary/12 via-primary/6 to-secondary/10 text-foreground"
          >
            {totalReports} shown
          </Badge>
        }
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <ReportsStatCard icon={FileTextIcon} label="Total Reports" value={totalReports} description="Current filtered result set" />
        <ReportsStatCard icon={FilterIcon} label="Feasibility" value={feasibilityReports} description="Feasibility reports shown" />
        <ReportsStatCard icon={ShieldCheckIcon} label="Completed" value={completedReports} description="Verified and ready" />
        <ReportsStatCard icon={InboxIcon} label="Pending" value={pendingReports} description="Needs verification review" />
      </div>

      <Card className="overflow-hidden border-primary/10 shadow-[0_12px_40px_-28px_hsl(var(--primary)/0.45)]">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-card to-secondary/12 pb-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FilterIcon className="h-4 w-4 text-secondary" />
                Filters
              </CardTitle>
              <CardDescription>Refine by report type, verification state, title, project, address, or city.</CardDescription>
            </div>
            <BarChart3Icon className="h-5 w-5 text-primary" />
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
          <form action="/sa/reports" className="flex flex-col gap-3 rounded-lg border border-border/80 bg-muted/15 p-3 md:flex-row md:items-center">
            <input type="hidden" name="type" value={typeFilter} />
            <input type="hidden" name="verification" value={verificationFilter} />
            <div className="relative flex-1">
              <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                name="q"
                defaultValue={search}
                placeholder="Search title, address, project, city..."
                className="h-10 border-primary/15 bg-background pl-9 focus-visible:ring-primary/30"
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="bg-gradient-to-r from-primary to-primary/90 shadow-sm">
                Apply filters
              </Button>
              <Button asChild variant="outline">
                <Link href="/sa/reports">Reset</Link>
              </Button>
            </div>
          </form>

          <div className="grid gap-5 md:grid-cols-2">
            <SAFilterSection label="Report type">
              {validTypes.map((t) => (
                <SAFilterChipLink key={t} href={filterHref(t, verificationFilter)} active={typeFilter === t}>
                  {TYPE_LABELS[t]}
                </SAFilterChipLink>
              ))}
            </SAFilterSection>

            <SAFilterSection label="Verification">
              {validVerification.map((v) => (
                <SAFilterChipLink key={v} href={filterHref(typeFilter, v)} active={verificationFilter === v}>
                  {VERIFICATION_LABELS[v]}
                </SAFilterChipLink>
              ))}
            </SAFilterSection>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle>Generated Reports</CardTitle>
              <CardDescription>
                Showing {totalReports === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, totalReports)} of {totalReports} generated reports.
              </CardDescription>
            </div>
            <Badge variant="outline">Page {currentPage} of {totalPages}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="hidden overflow-x-auto rounded-md border border-border md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Report</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Project</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Verification</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Score</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">Created</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-muted-foreground">Open</th>
                </tr>
              </thead>
              <tbody>
                {paginatedReports.map((report) => {
                  const score = scoreValue(report.content?.validation_score)
                  const verification = String(report.verification_status || 'not_requested')
                  return (
                    <tr key={report.id} className="border-b border-border last:border-0 transition-colors hover:bg-primary/5">
                      <td className="max-w-xs px-4 py-4 font-medium">
                        <Link href={`/sa/reviews/${report.id}`} className="text-primary underline-offset-4 hover:underline">
                          {report.title || 'Untitled Report'}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize">{formatReportType(report.report_type)}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="max-w-xs text-foreground">{projectLabel(report.project)}</div>
                        {report.project?.city && <span className="ml-1 text-xs">({report.project.city})</span>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={VERIFICATION_VARIANT[verification] ?? 'outline'}
                          className={`capitalize ${VERIFICATION_BADGE_CLASS[verification] ?? ''}`}
                        >
                          {formatVerification(verification)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        {score !== null ? (
                          <Badge variant="outline" className={scoreClass(score)}>
                            {score}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {formatDate(report.created_at)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button asChild variant="ghost" size="sm">
                          <Link href={`/sa/reviews/${report.id}`}>
                            View
                            <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  )
                })}
                {paginatedReports.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-14 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 text-muted-foreground">
                        <InboxIcon className="h-8 w-8" />
                        <p className="text-sm font-medium text-foreground">No reports matched your filters</p>
                        <p className="text-xs">Try broadening the report type, verification status, or search term.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {paginatedReports.map((report) => {
              const score = scoreValue(report.content?.validation_score)
              const verification = String(report.verification_status || 'not_requested')
              return (
                <div key={report.id} className="rounded-md border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link href={`/sa/reviews/${report.id}`} className="text-sm font-semibold text-primary underline-offset-4 hover:underline">
                      {report.title || 'Untitled Report'}
                    </Link>
                    <Badge
                      variant={VERIFICATION_VARIANT[verification] ?? 'outline'}
                      className={`capitalize ${VERIFICATION_BADGE_CLASS[verification] ?? ''}`}
                    >
                      {formatVerification(verification)}
                    </Badge>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Badge variant="outline" className="capitalize">{formatReportType(report.report_type)}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(report.created_at)}
                    </span>
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {projectLabel(report.project)}
                    {report.project?.city ? ` (${report.project.city})` : ''}
                  </p>
                  <p className="mt-1 text-xs">
                    Score:{' '}
                    {score !== null ? (
                      <Badge variant="outline" className={scoreClass(score)}>
                        {score}%
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-3 w-full">
                    <Link href={`/sa/reviews/${report.id}`}>
                      Open report
                      <ArrowRightIcon className="ml-1 h-3.5 w-3.5" />
                    </Link>
                  </Button>
                </div>
              )
            })}
            {paginatedReports.length === 0 && (
              <div className="rounded-md border border-border px-4 py-10 text-center">
                <InboxIcon className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm font-medium">No reports matched your filters.</p>
                <p className="mt-1 text-xs text-muted-foreground">Try broadening the filters or search term.</p>
              </div>
            )}
          </div>

          <SAPagination
            mode="links"
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalReports}
            pageSize={pageSize}
            itemLabel="reports"
            pageHref={pageHref}
          />
        </CardContent>
      </Card>
    </div>
  )
}
