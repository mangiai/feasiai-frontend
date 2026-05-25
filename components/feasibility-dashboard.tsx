'use client'

import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  BarChart3Icon,
  Loader2Icon,
  InboxIcon,
  MapPinIcon,
  RulerIcon,
  ShieldCheckIcon,
  CalendarIcon,
  StopCircleIcon,
} from 'lucide-react'
import { getStatusConfig, relativeTime } from '@/lib/status-utils'
import { cn } from '@/lib/utils'
import type { LegacyProject as Project, LegacyProjectStatus as ProjectStatus } from '@/types/database'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

const CANCELLABLE_STATUSES: ProjectStatus[] = [
  'processing',
  'processing-phase1',
  'processing-phase2',
  'processing-feasibility',
]

const PAGE_SIZE = 25

export function FeasibilityDashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [cancellingId, setCancellingId] = useState<string | null>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase
        .schema(APP_DB_SCHEMA)
        .from('projects')
        .select('*')
        .eq('flow_type', 'feasibility-analysis')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      if (data) {
        setProjects(prev => page === 0 ? data as Project[] : [...prev, ...(data as Project[])])
        setHasMore(data.length === PAGE_SIZE)
      }
      setLoading(false)
    }
    load()
  }, [supabase, page])

  const handleCancel = async (e: React.MouseEvent, projectId: string) => {
    e.preventDefault()  // Prevent Link navigation
    e.stopPropagation()
    setCancellingId(projectId)
    try {
      const res = await fetch(`/api/projects/${projectId}/cancel`, {
        method: 'POST',
      })
      if (res.ok) {
        setProjects(prev =>
          prev.map(p =>
            p.id === projectId
              ? { ...p, status: 'failed' as ProjectStatus, error_message: 'Cancelled by user' }
              : p
          )
        )
      }
    } catch {
      // ignore — status will refresh on next load
    } finally {
      setCancellingId(null)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <InboxIcon className="w-10 h-10 text-muted-foreground/40" />
        <p className="text-muted-foreground font-body">No feasibility analyses yet.</p>
        <Link
          href="/projects/new"
          className="text-sm text-primary hover:underline font-body"
        >
          Start a new feasibility study →
        </Link>
      </div>
    )
  }

  // Stats
  const completed = projects.filter(p => p.status === 'completed').length
  const analyzing = projects.filter(p => p.status === 'processing-feasibility').length
  const ready = projects.filter(p => p.status === 'ready' || p.status === 'uploading').length
  const failed = projects.filter(p => p.status === 'failed').length
  const cities = new Set(projects.map(p => p.city).filter(Boolean))

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center">
          <BarChart3Icon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
        </div>
        <div>
          <h2 className="heading-card text-foreground">Feasibility Studies</h2>
          <p className="text-sm text-muted-foreground font-body">
            {projects.length} stud{projects.length !== 1 ? 'ies' : 'y'} across {cities.size} cit{cities.size !== 1 ? 'ies' : 'y'}
          </p>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Completed', value: completed, color: 'text-emerald-600' },
          { label: 'Analyzing', value: analyzing, color: 'text-indigo-600' },
          { label: 'Ready', value: ready, color: 'text-amber-600' },
          { label: 'Failed', value: failed, color: 'text-red-600' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center p-3 rounded-xl bg-muted/40 border border-border/40"
          >
            <span className={cn('text-2xl font-bold font-body', stat.color)}>
              {stat.value}
            </span>
            <span className="text-xs text-muted-foreground font-body">
              {stat.label}
            </span>
          </div>
        ))}
      </div>

      {/* Project Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {projects.map((project) => {
          const status = getStatusConfig(project.status)
          return (
            <Link key={project.id} href={`/projects/${project.id}`}>
              <Card className="hover-lift shadow-[0_8px_32px_rgba(28,25,23,0.08)] border-border/50 cursor-pointer h-full">
                <CardContent className="p-6 space-y-4">
                  {/* Project Info */}
                  <div className="space-y-1">
                    <h3 className="font-semibold text-foreground font-body text-sm leading-tight">
                      {project.project_name}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground font-body">
                      <MapPinIcon className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">
                        {project.project_address}
                        {project.city ? `, ${project.city}` : ''}
                      </span>
                    </div>
                  </div>

                  {/* Property Details */}
                  <div className="grid grid-cols-2 gap-2 text-xs font-body">
                    {project.zone && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <ShieldCheckIcon className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                        <span className="truncate">{project.zone}</span>
                      </div>
                    )}
                    {project.lot_size && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <RulerIcon className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                        <span>{Number(project.lot_size).toLocaleString()} sf</span>
                      </div>
                    )}
                    {project.existing_building_year && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarIcon className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                        <span>Built {project.existing_building_year}</span>
                      </div>
                    )}
                    {project.chip_tier && (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <BarChart3Icon className="w-3 h-3 flex-shrink-0 text-indigo-500" />
                        <span>CHIP {project.chip_tier}</span>
                      </div>
                    )}
                  </div>

                  {/* Status + Time + Cancel */}
                  <div className="flex items-center justify-between pt-2 border-t border-border/50">
                    <Badge
                      variant={status.variant}
                      className={cn('rounded-sm text-[10px]', status.className)}
                    >
                      {status.label}
                    </Badge>
                    <div className="flex items-center gap-2">
                      {CANCELLABLE_STATUSES.includes(project.status) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-[10px] text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => handleCancel(e, project.id)}
                          disabled={cancellingId === project.id}
                        >
                          {cancellingId === project.id ? (
                            <Loader2Icon className="w-3 h-3 animate-spin" />
                          ) : (
                            <StopCircleIcon className="w-3 h-3" />
                          )}
                          <span className="ml-1">Stop</span>
                        </Button>
                      )}
                      <span className="text-[10px] text-muted-foreground font-body">
                        {relativeTime(project.updated_at || project.created_at)}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )
        })}
      </div>

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button variant="outline" onClick={() => setPage(p => p + 1)}>
            Load More
          </Button>
        </div>
      )}
    </div>
  )
}
