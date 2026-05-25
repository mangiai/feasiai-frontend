'use client'

import { useEffect, useState, useRef, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRealtimeAuth } from '@/lib/supabase/use-realtime-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb } from '@/components/breadcrumb'
import { AduMiniature } from '@/components/adu-miniature'
import { PipelineViewer } from '@/components/pipeline-viewer'
import { ContractorQuestionsForm } from '@/components/contractor-questions-form'
import { ResultsViewer } from '@/components/results-viewer'
import { ZoningSummary } from '@/components/zoning-summary'
import { useToast } from '@/components/toast'
import type { LegacyProject as Project, LegacyFile as ProjectFile, LegacyProjectStatus as ProjectStatus } from '@/types/database'
import type { Json } from '@/types/database'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import { useWorkspace } from '@/hooks/use-workspace'
import { FreeModelBanner } from '@/components/free-model-banner'
import {
  FileTextIcon,
  PlayIcon,
  PauseIcon,
  Loader2Icon,
  AlertCircleIcon,
  RotateCcwIcon,
  StopCircleIcon,
} from 'lucide-react'

interface ProjectDetailClientProps {
  initialProject: Project
  initialFiles: ProjectFile[]
  userId: string
  showcaseOutputId?: string  // When set, skip straight to results pinned to this output
  zoningData?: Json | null
  generationTier?: 'standard' | 'free' | null
}

const CITY_PHASES = ['Extract', 'Research', 'Review', 'Generate']
const CONTRACTOR_P1_PHASES = ['Extract', 'Analyze', 'Research', 'Categorize', 'Prepare']
const CONTRACTOR_P2_PHASES = ['Read Answers', 'Research', 'Draft', 'Generate']
const FEASIBILITY_PHASES = ['Extract Plans', 'Base Standards', 'Strategy Evaluation', 'Test Fitting', 'Report']

const PROCESSING_STATUSES: ProjectStatus[] = ['processing', 'processing-phase1', 'processing-phase2', 'processing-feasibility']
const TERMINAL_STATUSES: ProjectStatus[] = ['completed', 'failed', 'needs_review']

export function ProjectDetailClient({
  initialProject,
  initialFiles,
  userId,
  showcaseOutputId,
  zoningData,
  generationTier = null,
}: ProjectDetailClientProps) {
  const [project, setProject] = useState<Project>(initialProject)
  const [starting, setStarting] = useState(false)
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const supabase = useMemo(() => createClient(), [])
  const realtimeReady = useRealtimeAuth(supabase)
  const { toast } = useToast()
  const { currentWorkspace } = useWorkspace()
  const showFreeModelBanner = generationTier === 'free'

  // Sync with server re-renders (e.g., after router.refresh())
  useEffect(() => {
    setProject(initialProject)
    setStarting(false)
  }, [initialProject])

  // DevTools instant state sync — no waiting for polling or server refresh
  useEffect(() => {
    const handler = (e: Event) => {
      const { status, projectId, errorMessage } = (e as CustomEvent).detail
      if (projectId === project.id) {
        setProject(prev => ({
          ...prev,
          status,
          error_message: errorMessage ?? null,
        }))
        setStarting(false)
        setCurrentPhaseIndex(0)
      }
    }
    window.addEventListener('devtools-state-change', handler)
    return () => window.removeEventListener('devtools-state-change', handler)
  }, [project.id])

  // DevTools phase control — listen for phase events from dev widget
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (typeof detail?.phase === 'number') {
        setCurrentPhaseIndex(detail.phase)
      }
    }
    window.addEventListener('devtools-phase', handler)
    return () => window.removeEventListener('devtools-phase', handler)
  }, [])

  // Track whether we should act on realtime events (avoids putting status/starting in deps)
  const shouldListenRef = useRef(false)
  useEffect(() => {
    shouldListenRef.current =
      starting || (!TERMINAL_STATUSES.includes(project.status) && project.status !== 'ready')
  }, [project.status, starting])

  // Realtime: project status changes — subscribe ONCE per project, stay alive
  useEffect(() => {
    if (!realtimeReady) return

    const channel = supabase
      .channel(`project-status-${project.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: APP_DB_SCHEMA,
          table: 'projects',
          filter: `id=eq.${project.id}`,
        },
        (payload) => {
          if (!shouldListenRef.current) return
          const newStatus = payload.new.status as ProjectStatus
          const newError = payload.new.error_message as string | null
          console.log('[Realtime] Project status:', newStatus)
          setProject(prev => ({ ...prev, status: newStatus, error_message: newError }))
        }
      )
      .subscribe((status) => {
        console.log('[Realtime] Subscription:', status)
        // Catch-up fetch: grab current status in case we missed the event during handshake
        if (status === 'SUBSCRIBED' && shouldListenRef.current) {
          supabase
            .schema(APP_DB_SCHEMA)
            .from('projects')
            .select('status, error_message')
            .eq('id', project.id)
            .single()
            .then(({ data }) => {
              if (data) {
                setProject(prev => ({ ...prev, status: data.status as ProjectStatus, error_message: data.error_message }))
              }
            })
        }
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [project.id, supabase, realtimeReady])

  const handleStartAnalysis = async () => {
    setStarting(true)
    const flowType = project.flow_type === 'city-review'
      ? 'city-review'
      : project.flow_type === 'feasibility-analysis'
        ? 'feasibility-analysis'
        : 'corrections-analysis'

    const zoningAssumptions =
      zoningData && typeof zoningData === 'object' && !Array.isArray(zoningData)
        ? ((zoningData as Record<string, unknown>).user_assumptions as Record<string, unknown> | null)
        : null

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: project.id,
          user_id: userId,
          workspace_id: currentWorkspace?.id,
          flow_type: flowType,
          // Pass feasibility fields from project record
          ...(flowType === 'feasibility-analysis' && {
            zone: project.zone,
            lot_size: project.lot_size,
            toc_tier: project.toc_tier,
            chip_tier: project.chip_tier,
            lot_width: project.lot_width,
            lot_depth: project.lot_depth,
            existing_building_year: project.existing_building_year,
            existing_units: project.existing_units,
            rso_units: project.rso_units,
            existing_parking: project.existing_parking,
            hazard_zones: project.hazard_zones,
            transit_proximity: project.transit_proximity,
            specific_plan: project.specific_plan,
            existing_building_plan: typeof zoningAssumptions?.existing_building_plan === 'string'
              ? zoningAssumptions.existing_building_plan
              : undefined,
            rso_replacement_policy: typeof zoningAssumptions?.rso_replacement_policy === 'string'
              ? zoningAssumptions.rso_replacement_policy
              : undefined,
          }),
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        const errorMessage = typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || 'Failed to start analysis'
        throw new Error(errorMessage)
      }
    } catch (err) {
      console.error('Action failed:', err)
      toast(err instanceof Error ? err.message : 'Failed to start analysis', 'error')
      setStarting(false)
    }
  }

  const handleRetry = () => {
    setProject(prev => ({ ...prev, status: 'ready', error_message: null }))
    setStarting(false)
  }

  // Full reset for demo projects — clears messages, outputs, answers, resets to ready
  const [resetting, setResetting] = useState(false)
  const handleReset = async () => {
    setResetting(true)
    try {
      const res = await fetch('/api/reset-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      })
      if (res.ok) {
        setProject(prev => ({ ...prev, status: 'ready', error_message: null }))
        setStarting(false)
        setCurrentPhaseIndex(0)
      }
    } catch (err) {
      console.error('Action failed:', err)
      toast('Failed to reset project', 'error')
    } finally {
      setResetting(false)
    }
  }

  // Pause a running analysis
  const [pausing, setPausing] = useState(false)
  const handlePause = async () => {
    setPausing(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/pause`, { method: 'POST' })
      if (res.ok) {
        setProject(prev => ({ ...prev, status: 'paused' as ProjectStatus }))
      }
    } catch (err) {
      console.error('Action failed:', err)
      toast('Failed to pause analysis', 'error')
    } finally {
      setPausing(false)
    }
  }

  // Resume a paused analysis
  const [resuming, setResuming] = useState(false)
  const handleResume = async () => {
    setResuming(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/resume`, { method: 'POST' })
      if (res.ok) {
        setProject(prev => ({ ...prev, status: 'processing' as ProjectStatus }))
      }
    } catch (err) {
      console.error('Action failed:', err)
      toast('Failed to resume analysis', 'error')
    } finally {
      setResuming(false)
    }
  }

  // Cancel a running analysis — sets status to failed
  const [cancelling, setCancelling] = useState(false)
  const handleCancel = async () => {
    setCancelling(true)
    try {
      const res = await fetch(`/api/projects/${project.id}/cancel`, {
        method: 'POST',
      })
      if (res.ok) {
        setProject(prev => ({ ...prev, status: 'failed', error_message: 'Cancelled by user' }))
        setStarting(false)
        setCurrentPhaseIndex(0)
      }
    } catch (err) {
      console.error('Action failed:', err)
      toast('Failed to cancel analysis', 'error')
    } finally {
      setCancelling(false)
    }
  }

  // SHOWCASE MODE — pinned output, no controls, no reset
  const [preparingLive, setPreparingLive] = useState(false)
  const handleGoLive = async () => {
    setPreparingLive(true)
    try {
      await fetch('/api/reset-project', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: project.id }),
      })
    } catch (err) {
      console.error('Action failed:', err)
      toast('Failed to prepare live mode', 'error')
    }
    window.location.href = `/projects/${project.id}`
  }

  if (showcaseOutputId) {
    return (
      <div className="animate-fade-up space-y-6">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />
        <ResultsViewer
          projectId={project.id}
          flowType={project.flow_type}
          projectAddress={project.project_address}
          projectName={project.project_name}
          pinnedOutputId={showcaseOutputId}
        />
        <div className="flex justify-center pb-8">
          <Button
            onClick={handleGoLive}
            disabled={preparingLive}
            className="rounded-full px-8 font-bold font-body hover:shadow-[0_0_24px_rgba(45,106,79,0.3)] hover:brightness-110"
          >
            {preparingLive ? <Loader2Icon className="w-4 h-4 mr-2 animate-spin" /> : <PlayIcon className="w-4 h-4 mr-2" />}
            {preparingLive ? 'Preparing...' : 'Run Live'}
          </Button>
        </div>
      </div>
    )
  }

  // READY STATE
  if (project.status === 'ready') {
    if (starting) {
      const projectAddress = [project.project_address, project.city].filter(Boolean).join(', ')
      const heading = project.flow_type === 'city-review'
        ? 'Starting plan review…'
        : project.flow_type === 'feasibility-analysis'
          ? 'Starting feasibility analysis…'
          : 'Starting corrections analysis…'

      return (
        <div className="space-y-4 animate-fade-up">
          <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />
          <PipelineViewer
            projectId={project.id}
            projectName={project.project_name}
            address={projectAddress}
            flowType={project.flow_type}
            status={'processing' as ProjectStatus}
            heading={heading}
            phaseOverride={currentPhaseIndex > 0 ? currentPhaseIndex : undefined}
            onPause={handlePause}
            onCancel={handleCancel}
            isPausing={pausing}
            isCancelling={cancelling}
          />
        </div>
      )
    }

    return (
      <div className="space-y-4 animate-fade-up">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />

        {/* ADU Miniature */}
        <div className="flex justify-center pt-2">
          <AduMiniature variant="card" />
        </div>

        {/* Project Info */}
        <div className="text-center space-y-2">
          <h1 className="heading-display text-foreground">{project.project_name}</h1>
          <div className="flex items-center justify-center gap-2">
            {project.city && (
              <Badge variant="secondary" className="rounded-full">
                {project.city}
              </Badge>
            )}
            <Badge variant="outline" className="rounded-full">
              {project.flow_type === 'city-review' ? 'City Review' : project.flow_type === 'feasibility-analysis' ? 'Feasibility Analysis' : 'Corrections Analysis'}
            </Badge>
          </div>
        </div>

        {/* Files Card */}
        {initialFiles.length > 0 && (
          <Card className="shadow-card border-border/50 max-w-lg mx-auto">
            <CardContent className="p-5">
              <h3 className="heading-card text-foreground mb-3">Files</h3>
              <div className="space-y-2">
                {initialFiles.map(file => (
                  <div key={file.id} className="flex items-center gap-3 text-sm">
                    <FileTextIcon className="w-4 h-4 text-primary" />
                    <span className="text-foreground">{file.filename}</span>
                    {file.size_bytes && (
                      <span className="text-muted-foreground ml-auto text-xs">
                        {(file.size_bytes / 1024).toFixed(0)} KB
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Zoning Summary */}
        {zoningData && (
          <div className="max-w-lg mx-auto">
            <ZoningSummary zoningData={zoningData} />
          </div>
        )}

        {/* CTA Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleStartAnalysis}
            disabled={starting}
            className="px-10 font-semibold"
            size="lg"
          >
            {starting ? (
              <Loader2Icon className="w-5 h-5 animate-spin" />
            ) : (
              <PlayIcon className="w-5 h-5" />
            )}
            {starting
              ? 'Starting...'
              : project.flow_type === 'city-review'
                ? 'Run AI Review'
                : project.flow_type === 'feasibility-analysis'
                  ? 'Run Feasibility Analysis'
                  : 'Analyze Corrections'
            }
          </Button>
        </div>
      </div>
    )
  }

  // PROCESSING STATES
  if (PROCESSING_STATUSES.includes(project.status)) {
    const heading = project.status === 'processing-phase2'
      ? 'Building your response…'
      : project.flow_type === 'city-review'
        ? 'Reviewing plans…'
        : project.flow_type === 'feasibility-analysis'
          ? 'Running feasibility analysis…'
          : 'Analyzing corrections…'

    const projectAddress = [project.project_address, project.city].filter(Boolean).join(', ')

    return (
      <div className="space-y-4 animate-fade-up">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />

        {showFreeModelBanner && <FreeModelBanner />}

        <PipelineViewer
          projectId={project.id}
          projectName={project.project_name}
          address={projectAddress}
          flowType={project.flow_type}
          status={project.status}
          heading={heading}
          phaseOverride={currentPhaseIndex > 0 ? currentPhaseIndex : undefined}
          onPause={handlePause}
          onCancel={handleCancel}
          isPausing={pausing}
          isCancelling={cancelling}
        />
      </div>
    )
  }

  // PAUSED STATE (status may come from public schema which includes 'paused')
  if ((project.status as string) === 'paused') {
    const projectAddress = [project.project_address, project.city].filter(Boolean).join(', ')

    return (
      <div className="space-y-4 animate-fade-up">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />

        {/* Paused Banner */}
        <div className="rounded-xl border border-warning/30 bg-warning/[0.05] p-4 sm:p-5">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-warning/15">
              <PauseIcon className="w-4 h-4 text-warning" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground truncate">
                {projectAddress || project.project_name}
              </p>
              <p className="text-[11px] text-foreground/50">Analysis paused — resume or cancel at any time</p>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 pt-2">
          <Button
            onClick={handleResume}
            disabled={resuming}
            className="rounded-full font-body"
          >
            {resuming ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <PlayIcon className="w-4 h-4 mr-2" />
            )}
            {resuming ? 'Resuming…' : 'Resume'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={cancelling}
            variant="destructive"
            className="rounded-full font-body"
          >
            {cancelling ? (
              <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <StopCircleIcon className="w-4 h-4 mr-2" />
            )}
            {cancelling ? 'Cancelling…' : 'Cancel'}
          </Button>
        </div>
      </div>
    )
  }

  // AWAITING ANSWERS
  if (project.status === 'awaiting-answers') {
    return (
      <div className="space-y-6 animate-fade-up">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />
        <div className="text-center">
          <h1 className="heading-section text-foreground">A few questions for you</h1>
          <p className="text-muted-foreground font-body mt-2">
            Our AI needs your input to build the best response
          </p>
        </div>
        <ContractorQuestionsForm projectId={project.id} userId={userId} />
      </div>
    )
  }

  // COMPLETED / NEEDS REVIEW
  if (project.status === 'completed' || project.status === 'needs_review') {
    const needsReview = project.status === 'needs_review'

    return (
      <div className="animate-fade-up space-y-6">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />
        {showFreeModelBanner && <FreeModelBanner />}
        {needsReview && (
          <Card className="border-warning/30 bg-warning/[0.05]">
            <CardContent className="p-5 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/15">
                  <AlertCircleIcon className="h-4 w-4 text-warning" />
                </div>
                <div className="space-y-1">
                  <h2 className="text-sm font-semibold text-foreground">
                    Draft ready — manual review recommended
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    We generated the report successfully, but quality checks flagged it for expert review before it should be treated as final.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        <ResultsViewer
          projectId={project.id}
          flowType={project.flow_type}
          projectAddress={project.project_address}
          projectName={project.project_name}
        />
        {project.is_demo && (
          <div className="flex justify-center pb-8">
            <Button
              onClick={handleReset}
              disabled={resetting}
              variant="outline"
              className="rounded-full font-body"
            >
              <RotateCcwIcon className="w-4 h-4 mr-2" />
              {resetting ? 'Resetting...' : 'Reset & Run Again'}
            </Button>
          </div>
        )}
      </div>
    )
  }

  // FAILED
  if (project.status === 'failed') {
    const isBillingError = project.error_message?.toLowerCase().includes('credit balance') ||
      project.error_message?.toLowerCase().includes('billing') ||
      project.error_message?.toLowerCase().includes('purchase credits') ||
      project.error_message?.toLowerCase().includes('quota');
    const isOpenRouterError = project.error_message?.toLowerCase().includes('openrouter');
    const isAuthError = project.error_message?.toLowerCase().includes('invalid') &&
      project.error_message?.toLowerCase().includes('api key');

    return (
      <div className="space-y-6 animate-fade-up max-w-lg mx-auto pt-4">
        <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects', href: '/my-projects' }, { label: project.project_name }]} />
        <Card className="shadow-card border-destructive/20">
          <CardContent className="p-6 sm:p-8 text-center space-y-4">
            <AlertCircleIcon className="w-10 h-10 text-destructive mx-auto" />
            <h2 className="heading-section text-foreground">
              {isBillingError ? 'API Credits Exhausted' : isAuthError ? 'API Key Invalid' : 'Something went wrong'}
            </h2>
            <p className="text-sm text-muted-foreground">
              {project.error_message || 'The analysis encountered an error. Please try again.'}
            </p>
            {isBillingError && (
              <a
                href={isOpenRouterError ? 'https://openrouter.ai/settings/credits' : 'https://console.anthropic.com/settings/billing'}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-sm font-body font-medium text-primary hover:underline"
              >
                {isOpenRouterError ? 'Go to OpenRouter Credits' : 'Go to Anthropic Billing'} &rarr;
              </a>
            )}
            <div className="flex justify-center gap-3 pt-2">
              <Button
                onClick={project.is_demo ? handleReset : handleRetry}
                disabled={resetting}
                variant="outline"
                className="rounded-full font-body"
              >
                <RotateCcwIcon className="w-4 h-4 mr-2" />
                {resetting ? 'Resetting...' : 'Try Again'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Default fallback
  return (
    <div className="text-center py-12">
      <p className="text-muted-foreground font-body">Loading project...</p>
    </div>
  )
}
