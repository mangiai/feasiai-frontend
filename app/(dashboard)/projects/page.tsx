'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useWorkspace } from '@/hooks/use-workspace'
import { createClient } from '@/lib/supabase/client'
import { StatsCard } from '@/components/stats-card'
import { EmptyState } from '@/components/empty-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  FolderOpenIcon,
  ActivityIcon,
  CoinsIcon,
  CheckCircleIcon,
  PlusIcon,
  SearchIcon,
  ArrowRightIcon,
} from 'lucide-react'
import type { ProjectStatus } from '@/types/database'

type ProjectRow = {
  id: string
  name: string
  city: string
  flow_type: string
  status: ProjectStatus
  credits_used: number
  created_at: string
  pipeline_runs: { id: string; status: string }[]
}

const STATUS_FILTERS = ['all', 'draft', 'processing', 'completed', 'failed'] as const
type StatusFilter = (typeof STATUS_FILTERS)[number]

const STATUS_BADGE: Record<ProjectStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; className?: string }> = {
  draft: { label: 'Draft', variant: 'secondary' },
  ready: { label: 'Ready', variant: 'outline' },
  uploading: { label: 'Uploading', variant: 'outline' },
  queued: { label: 'Queued', variant: 'outline' },
  processing: { label: 'Processing', variant: 'default' },
  awaiting_input: { label: 'Awaiting Input', variant: 'outline', className: 'border-amber-500/50 text-amber-600 dark:text-amber-400' },
  paused: { label: 'Paused', variant: 'outline', className: 'border-amber-500/50 text-amber-600 dark:text-amber-400' },
  completed: { label: 'Completed', variant: 'outline', className: 'border-emerald-500/50 text-emerald-600 dark:text-emerald-400' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline', className: 'text-muted-foreground' },
}

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
} satisfies Variants

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 300,
      damping: 24,
    },
  },
} satisfies Variants

export default function ProjectsPage() {
  const { currentWorkspace } = useWorkspace()
  const supabase = createClient()

  const [projects, setProjects] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  useEffect(() => {
    if (!currentWorkspace) return

    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('projects')
        .select('*, pipeline_runs(id, status)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })

      setProjects((data ?? []) as ProjectRow[])
      setLoading(false)
    }

    load()
  }, [currentWorkspace, supabase])

  const filtered = useMemo(() => {
    let list = projects
    if (statusFilter !== 'all') {
      list = list.filter((p) => p.status === statusFilter)
    }
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q)
      )
    }
    return list
  }, [projects, statusFilter, search])

  const stats = useMemo(() => {
    const activeRuns = projects.reduce(
      (n, p) => n + p.pipeline_runs.filter((r) => r.status === 'running' || r.status === 'queued').length,
      0
    )
    const creditsUsed = projects.reduce((n, p) => n + (p.credits_used ?? 0), 0)
    const completed = projects.filter((p) => p.status === 'completed').length
    return { total: projects.length, activeRuns, creditsUsed, completed }
  }, [projects])

  return (
    <div className="space-y-8">
      <div className="page-header flex items-center justify-between pt-4">
        <div>
          <h1 className="heading-display text-foreground">Projects</h1>
          <p className="text-muted-foreground">Manage your ADU permit projects</p>
        </div>
        <Link href="/projects/new">
          <Button className="transition-transform hover:scale-[1.02] active:scale-[0.98]">
            <PlusIcon className="w-4 h-4 mr-1.5" />
            New Project
          </Button>
        </Link>
      </div>

      <motion.div 
        variants={containerVariants} 
        initial="hidden" 
        animate="show" 
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        <motion.div variants={itemVariants}>
          <StatsCard icon={FolderOpenIcon} label="Total Projects" value={stats.total} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard icon={ActivityIcon} label="Active Runs" value={stats.activeRuns} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard icon={CoinsIcon} label="Credits Used" value={stats.creditsUsed.toLocaleString()} />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatsCard icon={CheckCircleIcon} label="Completed" value={stats.completed} />
        </motion.div>
      </motion.div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-sm">
          <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search projects…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-md border border-input bg-background/50 backdrop-blur-sm px-9 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring transition-all"
          />
        </div>
        <div className="flex gap-1">
          {STATUS_FILTERS.map((f) => (
            <Button
              key={f}
              variant={statusFilter === f ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setStatusFilter(f)}
              className="capitalize transition-all"
            >
              {f}
            </Button>
          ))}
        </div>
      </div>

      {loading ? (
        <Card className="border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)]">
          <CardContent className="py-6 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 animate-pulse">
                <div className="h-4 w-40 rounded bg-muted" />
                <div className="h-4 w-24 rounded bg-muted" />
                <div className="h-4 w-20 rounded bg-muted" />
                <div className="h-5 w-16 rounded bg-muted" />
                <div className="h-4 w-16 rounded bg-muted ml-auto" />
              </div>
            ))}
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        projects.length === 0 ? (
          <EmptyState
            icon={FolderOpenIcon}
            title="No projects yet"
            description="Create your first ADU permit project to get started."
            actionLabel="New Project"
            actionHref="/projects/new"
          />
        ) : (
          <EmptyState
            icon={SearchIcon}
            title="No matching projects"
            description="Try adjusting your search or filter."
          />
        )
      ) : (
        <Card className="border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] overflow-hidden">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground bg-muted/20">
                    <th className="px-4 py-3 font-medium">Name</th>
                    <th className="px-4 py-3 font-medium">City</th>
                    <th className="px-4 py-3 font-medium">Flow</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium text-right">Credits</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium" />
                  </tr>
                </thead>
                <motion.tbody 
                  variants={containerVariants}
                  initial="hidden"
                  animate="show"
                  className="divide-y"
                >
                  {filtered.map((p) => {
                    const badge = STATUS_BADGE[p.status] ?? { label: p.status, variant: 'outline' as const }
                    return (
                      <motion.tr 
                        variants={itemVariants}
                        key={p.id} 
                        className="hover:bg-muted/50 transition-colors group"
                      >
                        <td className="px-4 py-4 font-medium">{p.name}</td>
                        <td className="px-4 py-4 text-muted-foreground">{p.city}</td>
                        <td className="px-4 py-4 capitalize text-muted-foreground">
                          {p.flow_type?.replace('_', ' ')}
                        </td>
                        <td className="px-4 py-4">
                          <Badge variant={badge.variant} className={badge.className}>
                            {badge.label}
                          </Badge>
                        </td>
                        <td className="px-4 py-4 text-right tabular-nums">
                          {(p.credits_used ?? 0).toLocaleString()}
                        </td>
                        <td className="px-4 py-4 text-muted-foreground">
                          {new Date(p.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/projects/${p.id}`}
                            className="inline-flex items-center gap-1 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity hover:underline"
                          >
                            View
                            <ArrowRightIcon className="w-3.5 h-3.5" />
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
