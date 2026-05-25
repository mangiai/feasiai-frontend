'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useWorkspace } from '@/hooks/use-workspace'
import { createClient } from '@/lib/supabase/client'
import { EmptyState } from '@/components/empty-state'
import { StatsCard } from '@/components/stats-card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { reportFontClassName } from '@/lib/report-fonts'
import { cn } from '@/lib/utils'
import {
  ArrowRightIcon,
  CheckCircle2Icon,
  ClockIcon,
  FileTextIcon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import type { ReportStatus, VerificationStatus } from '@/types/database'

type ReportRow = {
  id: string
  title: string
  report_type: string
  status: ReportStatus
  verification_status: VerificationStatus
  current_version: number
  updated_at: string
  projects: { name: string; city: string } | null
}

const STATUS_TABS = ['all', 'draft', 'in_review', 'published', 'verified'] as const
type StatusTab = (typeof STATUS_TABS)[number]

const STATUS_TAB_LABEL: Record<StatusTab, string> = {
  all: 'All',
  draft: 'Draft',
  in_review: 'In review',
  published: 'Published',
  verified: 'Verified',
}

const STATUS_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }
> = {
  draft: { label: 'Draft', variant: 'secondary' },
  in_review: {
    label: 'In review',
    variant: 'outline',
    className: 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  },
  verified: {
    label: 'Verified',
    variant: 'outline',
    className: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  },
  published: {
    label: 'Published',
    variant: 'outline',
    className: 'border-primary/40 bg-primary/10 text-primary',
  },
  archived: { label: 'Archived', variant: 'destructive' },
}

const VERIFICATION_BADGE: Record<
  string,
  { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className?: string }
> = {
  unverified: { label: 'Unverified', variant: 'secondary' },
  pending: {
    label: 'Pending',
    variant: 'outline',
    className: 'border-amber-500/45 bg-amber-500/10 text-amber-800 dark:text-amber-200',
  },
  verified: {
    label: 'Verified',
    variant: 'outline',
    className: 'border-emerald-500/45 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200',
  },
  rejected: {
    label: 'Rejected',
    variant: 'destructive',
    className: 'bg-destructive/15 text-destructive border-destructive/30',
  },
}

const containerVariants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.04 } },
} satisfies Variants

const itemVariants = {
  hidden: { opacity: 0, y: 8 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 320, damping: 26 },
  },
} satisfies Variants

function formatReportType(type: string | null | undefined): string {
  if (!type) return '—'
  return type.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatRelativeDate(iso: string): string {
  const d = new Date(iso)
  const now = Date.now()
  const diff = now - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ReportsPage() {
  const { currentWorkspace } = useWorkspace()
  const supabase = useMemo(() => createClient(), [])

  const [reports, setReports] = useState<ReportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<StatusTab>('all')
  const [search, setSearch] = useState('')

  useEffect(() => {
    if (!currentWorkspace) return

    async function loadReports() {
      setIsLoading(true)
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const profileRes = user
        ? await supabase.from('profiles').select('system_role').eq('id', user.id).maybeSingle()
        : null
      const systemRole = (profileRes?.data as { system_role?: string | null } | null)?.system_role ?? null
      const isStaff = Boolean(systemRole)
      const { data } = await supabase
        .from('reports')
        .select('*, projects(name, city)')
        .eq('workspace_id', currentWorkspace!.id)
        .eq(isStaff ? 'workspace_id' : 'verification_status', isStaff ? currentWorkspace!.id : 'verified')
        .order('created_at', { ascending: false })

      setReports((data ?? []) as ReportRow[])
      setIsLoading(false)
    }

    loadReports()
  }, [currentWorkspace, supabase])

  const tabCounts = useMemo(() => {
    const counts: Record<StatusTab, number> = {
      all: reports.length,
      draft: 0,
      in_review: 0,
      published: 0,
      verified: 0,
    }
    for (const r of reports) {
      if (r.status === 'draft') counts.draft++
      if (r.status === 'in_review') counts.in_review++
      if (r.status === 'published') counts.published++
      if (r.verification_status === 'verified') counts.verified++
    }
    return counts
  }, [reports])

  const filtered = useMemo(() => {
    let list = reports
    if (activeTab === 'verified') {
      list = list.filter((r) => r.verification_status === 'verified')
    } else if (activeTab !== 'all') {
      list = list.filter((r) => r.status === activeTab)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.projects?.name?.toLowerCase().includes(q) ||
          r.projects?.city?.toLowerCase().includes(q) ||
          r.report_type?.toLowerCase().includes(q),
      )
    }
    return list
  }, [reports, activeTab, search])

  const stats = useMemo(() => {
    const underReview = reports.filter((r) => r.status === 'in_review').length
    const verified = reports.filter((r) => r.verification_status === 'verified').length
    const pendingVerification = reports.filter((r) => r.verification_status === 'pending').length
    return {
      total: reports.length,
      underReview,
      verified,
      pendingVerification,
    }
  }, [reports])

  if (isLoading) {
    return (
      <div className="space-y-8 animate-fade-up">
        <div className="page-header pt-4 space-y-2">
          <div className="h-9 w-48 bg-muted animate-pulse rounded-lg" />
          <div className="h-4 w-72 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border bg-muted/30 animate-pulse" />
          ))}
        </div>
        <div className="h-10 max-w-sm bg-muted animate-pulse rounded-lg" />
        <Card className="overflow-hidden border-border/60">
          <CardContent className="space-y-4 py-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-4 animate-pulse">
                <div className="h-4 flex-1 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-6 w-20 rounded bg-muted" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn('space-y-8 animate-fade-up', reportFontClassName)}>
      <div className="page-header pt-4">
        <h1 className="heading-display font-[family-name:var(--font-report-display)] tracking-wide text-foreground">
          Reports
        </h1>
        <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
          Feasibility and pipeline deliverables for your workspace. Open a row to review, export PDF, or verify.
        </p>
      </div>

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-4 md:grid-cols-4"
      >
        <motion.div variants={itemVariants}>
          <StatsCard icon={FileTextIcon} label="Total reports" value={stats.total} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard icon={ClockIcon} label="In review" value={stats.underReview} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard icon={CheckCircle2Icon} label="Verified" value={stats.verified} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard
            icon={ShieldCheckIcon}
            label="Pending verification"
            value={stats.pendingVerification}
          />
        </motion.div>
      </motion.div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative max-w-md flex-1">
          <SearchIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            placeholder="Search title, project, city, or type…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-10 w-full rounded-lg border border-input bg-background/60 pl-9 pr-3 text-sm shadow-sm backdrop-blur-sm transition-all placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Search reports"
          />
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_TABS.map((tab) => (
            <Button
              key={tab}
              type="button"
              size="sm"
              variant={activeTab === tab ? 'default' : 'ghost'}
              className={cn(
                'rounded-lg capitalize transition-all',
                activeTab === tab && 'shadow-sm',
              )}
              onClick={() => setActiveTab(tab)}
            >
              {STATUS_TAB_LABEL[tab]}
              <span
                className={cn(
                  'ml-1.5 tabular-nums text-xs',
                  activeTab === tab ? 'text-primary-foreground/80' : 'text-muted-foreground',
                )}
              >
                {tabCounts[tab]}
              </span>
            </Button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        reports.length === 0 ? (
          <EmptyState
            icon={FileTextIcon}
            title="No reports yet"
            description="Reports are generated when pipeline runs complete."
          />
        ) : (
          <EmptyState
            icon={SearchIcon}
            title="No matching reports"
            description="Try a different filter or search term."
          />
        )
      ) : (
        <Card className="overflow-hidden border-border/70 shadow-[0_8px_32px_rgba(28,25,23,0.06)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.25)]">
          <CardContent className="p-0">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full min-w-[880px] text-sm">
                <thead>
                  <tr className="border-b border-border/80 bg-muted/25 text-left text-xs uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-3.5 font-medium">Report</th>
                    <th className="px-4 py-3.5 font-medium">Project</th>
                    <th className="px-4 py-3.5 font-medium">Type</th>
                    <th className="px-4 py-3.5 font-medium">Status</th>
                    <th className="px-4 py-3.5 font-medium">Verification</th>
                    <th className="px-4 py-3.5 font-medium text-center">Ver.</th>
                    <th className="px-4 py-3.5 font-medium">Updated</th>
                    <th className="px-4 py-3.5 font-medium w-16" />
                  </tr>
                </thead>
                <motion.tbody
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="divide-y divide-border/60"
                >
                  {filtered.map((report) => {
                    const statusBadge = STATUS_BADGE[report.status] ?? {
                      label: report.status.replace(/_/g, ' '),
                      variant: 'outline' as const,
                    }
                    const verifyBadge = VERIFICATION_BADGE[report.verification_status] ?? {
                      label: report.verification_status,
                      variant: 'secondary' as const,
                    }
                    const projectLine = report.projects
                      ? [report.projects.name, report.projects.city].filter(Boolean).join(' · ')
                      : '—'

                    return (
                      <motion.tr
                        key={report.id}
                        variants={itemVariants}
                        className="group cursor-pointer transition-colors hover:bg-muted/40"
                      >
                        <td className="px-4 py-4">
                          <Link
                            href={`/reports/${report.id}`}
                            className="flex items-start gap-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                          >
                            <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/15">
                              <FileTextIcon className="h-4 w-4" aria-hidden />
                            </span>
                            <span className="min-w-0">
                              <span className="block font-medium text-foreground group-hover:text-primary transition-colors line-clamp-2">
                                {report.title || 'Untitled report'}
                              </span>
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground max-w-[200px]">
                          <span className="line-clamp-2">{projectLine}</span>
                        </td>
                        <td className="px-4 py-4 text-muted-foreground whitespace-nowrap">
                          {formatReportType(report.report_type)}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={statusBadge.variant} className={statusBadge.className}>
                            {statusBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={verifyBadge.variant} className={verifyBadge.className}>
                            {verifyBadge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-center tabular-nums text-muted-foreground">
                          v{report.current_version}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-muted-foreground tabular-nums">
                          <time dateTime={report.updated_at} title={new Date(report.updated_at).toLocaleString()}>
                            {formatRelativeDate(report.updated_at)}
                          </time>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/reports/${report.id}`}
                            className="inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100 hover:underline"
                          >
                            Open
                            <ArrowRightIcon className="h-3.5 w-3.5" />
                          </Link>
                        </td>
                      </motion.tr>
                    )
                  })}
                </motion.tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
