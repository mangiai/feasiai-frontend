'use client'

import { useEffect, useState, useMemo, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MarkdownDocumentViewer } from '@/components/markdown-document-viewer'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { AduMiniature } from '@/components/adu-miniature'
import { Loader2Icon, ClockIcon, ArrowLeftIcon, DownloadIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadMarkdownAsBrandedPdf } from '@/lib/export-pdf'
import { buildReportPdfFilename } from '@/lib/report-download-filename'
import type { LegacyOutput as Output, LegacyFlowType as FlowType } from '@/types/database'
import { APP_DB_SCHEMA } from '@/lib/app-schema'

interface ResultsViewerProps {
  projectId: string
  flowType: FlowType
  projectAddress?: string | null
  projectName?: string | null
  pinnedOutputId?: string  // If set, fetch this specific output instead of latest (showcase mode)
}

type TabKey = string

export function ResultsViewer({
  projectId,
  flowType,
  projectAddress,
  projectName,
  pinnedOutputId,
}: ResultsViewerProps) {
  const [output, setOutput] = useState<Output | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<TabKey>('')
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)
  const supabase = useMemo(() => createClient(), [])

  useEffect(() => {
    // HITL gate: only show results after a report for this project is verified.
    // We intentionally check the public.reports table (review workflow) rather than output validity.
    const checkVerified = async () => {
      const { data: verifiedReport } = await supabase
        .from('reports')
        .select('id')
        .eq('project_id', projectId)
        .eq('verification_status', 'verified')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()

      return Boolean(verifiedReport?.id)
    }

    // Only fetch report-content columns — exclude raw_artifacts, validation internals, and cost metadata
    const reportColumns = 'id, flow_phase, version, corrections_letter_md, review_checklist_json, corrections_analysis_json, contractor_questions_json, response_letter_md, professional_scope_md, corrections_report_md, feasibility_report_md, strategy_comparison_json, executive_summary_md, plan_analysis_json, agent_duration_ms, created_at'
    const query = async (): Promise<{ data: Output | null }> => {
      const ok = await checkVerified()
      if (!ok) return { data: null }

      const res = pinnedOutputId
        ? await supabase.schema(APP_DB_SCHEMA).from('outputs').select(reportColumns).eq('id', pinnedOutputId).single()
        : await supabase.schema(APP_DB_SCHEMA).from('outputs').select(reportColumns).eq('project_id', projectId).order('created_at', { ascending: false }).limit(1).single()

      return { data: (res.data as Output | null) ?? null }
    }

    query().then(({ data }) => {
        if (data) {
          setOutput(data as Output)
          // Set initial tab
          if (flowType === 'city-review') {
            setActiveTab('corrections_letter_md')
          } else if (flowType === 'feasibility-analysis') {
            setActiveTab('feasibility_report_md')
          } else {
            setActiveTab('response_letter_md')
          }
        }
        setLoading(false)
      })
  }, [projectId, flowType, supabase, pinnedOutputId])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2Icon className="w-6 h-6 animate-spin text-primary" />
      </div>
    )
  }

  if (!output) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground font-body">
          Your report is being reviewed. It will appear here after approval.
        </p>
      </div>
    )
  }

  const tabs = flowType === 'city-review'
    ? [
        { key: 'corrections_letter_md', label: 'Corrections Letter' },
      ]
    : flowType === 'feasibility-analysis'
    ? [
        { key: 'feasibility_report_md', label: 'Feasibility Report' },
        { key: 'executive_summary_md', label: 'Executive Summary' },
        { key: 'strategy_comparison_json', label: 'Strategy Comparison' },
        { key: 'plan_analysis_json', label: 'Plan Analysis' },
      ]
    : [
        { key: 'response_letter_md', label: 'Response Letter' },
        { key: 'professional_scope_md', label: 'Professional Scope' },
        { key: 'corrections_report_md', label: 'Corrections Report' },
      ]

  const getContent = (key: string): string | null => {
    const value = output[key as keyof Output]
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
    return null
  }

  const getTabLabel = (key: string): string => {
    const found = tabs.find(t => t.key === key)
    return found?.label ?? 'Report'
  }

  const handleDownloadPdf = async () => {
    const raw = getContent(activeTab)
    if (!raw?.trim()) return

    setPdfGenerating(true)
    try {
      const reportLabel = getTabLabel(activeTab)
      await downloadMarkdownAsBrandedPdf(
        raw,
        buildReportPdfFilename({
          address: projectAddress,
          projectName,
          reportLabel,
        }),
        {
          projectId,
          projectName,
          projectAddress,
          reportLabel,
        },
      )
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfGenerating(false)
    }
  }

  const formatDuration = (ms: number | null) => {
    if (!ms) return '—'
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}m ${seconds}s`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Back arrow + Header */}
      <div className="animate-fade-up">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground font-body transition-colors mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to demo
        </Link>

        <div className="text-center">
          <div className="flex justify-center">
            <AduMiniature variant="accent" />
          </div>
          <h1 className="heading-display text-foreground -mt-3">
            {flowType === 'city-review'
              ? 'Review complete'
              : flowType === 'feasibility-analysis'
                ? 'Feasibility analysis complete'
                : 'Your response package is ready'}
          </h1>
        </div>
      </div>

      {/* Report generation time */}
      {output.agent_duration_ms ? (
        <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-full bg-muted/40 border border-border/50 max-w-xs mx-auto">
          <ClockIcon className="w-4 h-4 text-primary" />
          <span className="text-sm text-muted-foreground font-body">Generated in</span>
          <span className="text-sm text-foreground font-semibold font-body">{formatDuration(output.agent_duration_ms)}</span>
        </div>
      ) : null}

      {/* Tabs + Download PDF */}
      <div className="flex items-center justify-between border-b border-border/50">
        {tabs.length > 1 ? (
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'px-4 py-2.5 text-sm font-body font-semibold transition-colors',
                  activeTab === tab.key
                    ? 'text-foreground border-b-2 border-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : <div />}

        <button
          onClick={handleDownloadPdf}
          disabled={pdfGenerating}
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 mb-1 rounded-lg text-sm font-body font-semibold transition-all',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'disabled:opacity-50 disabled:cursor-not-allowed'
          )}
        >
          {pdfGenerating ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <DownloadIcon className="w-4 h-4" />
          )}
          {pdfGenerating ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {/* Content — full width */}
      <Card className="shadow-[0_8px_32px_rgba(28,25,23,0.08)] border-border/50">
        <CardContent className="p-8">
          <div ref={contentRef}>
            <MarkdownDocumentViewer
              content={getContent(activeTab)}
              readingWidth="wide"
              emptyMessage="No content available for this tab."
            />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
