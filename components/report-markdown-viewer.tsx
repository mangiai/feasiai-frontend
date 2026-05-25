'use client'

import { useState, useRef, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { MarkdownDocumentViewer } from '@/components/markdown-document-viewer'
import {
  PenIcon,
  EyeIcon,
  SaveIcon,
  DownloadIcon,
  Loader2Icon,
  CheckCircleIcon,
  AlertTriangleIcon,
  UndoIcon,
  FileTextIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { downloadMarkdownAsBrandedPdf } from '@/lib/export-pdf'
import { buildReportPdfFilename } from '@/lib/report-download-filename'

// Tab definitions per flow type
const FLOW_TABS: Record<string, Array<{ key: string; label: string; isJson?: boolean }>> = {
  'feasibility-analysis': [
    { key: 'feasibility_report.md', label: 'Feasibility Report' },
    { key: 'executive_summary.md', label: 'Executive Summary' },
    { key: 'strategy_comparison.json', label: 'Strategy Comparison', isJson: true },
    { key: 'plan_analysis.json', label: 'Plan Analysis', isJson: true },
  ],
  'city-review': [
    { key: 'draft_corrections.md', label: 'Corrections Letter' },
    { key: 'draft_corrections.json', label: 'Structured Data', isJson: true },
  ],
  'corrections-analysis': [
    { key: 'corrections_analysis.md', label: 'Analysis Report' },
    { key: 'corrections_categorized.json', label: 'Categorized Items', isJson: true },
    { key: 'contractor_questions.json', label: 'Contractor Questions', isJson: true },
  ],
  'corrections-response': [
    { key: 'response_letter.md', label: 'Response Letter' },
    { key: 'professional_scope.md', label: 'Professional Scope' },
    { key: 'corrections_report.md', label: 'Corrections Report' },
  ],
}

function inferTabs(artifacts: Record<string, unknown>) {
  return Object.keys(artifacts).map((key) => ({
    key,
    label: key.replace(/[._-]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).replace(/ (Md|Json)$/, ''),
    isJson: key.endsWith('.json'),
  }))
}

interface ReportMarkdownViewerProps {
  artifacts: Record<string, unknown>
  flowType: string
  validationScore?: number
  editable?: boolean
  onSave?: (artifacts: Record<string, unknown>) => Promise<void>
  projectId?: string
  projectAddress?: string | null
  projectName?: string | null
}

export function ReportMarkdownViewer({
  artifacts,
  flowType,
  validationScore,
  editable = false,
  onSave,
  projectId,
  projectAddress,
  projectName,
}: ReportMarkdownViewerProps) {
  const tabs = FLOW_TABS[flowType] ?? inferTabs(artifacts)
  const [activeTab, setActiveTab] = useState(tabs[0]?.key ?? '')
  const [editing, setEditing] = useState(false)
  const [editedArtifacts, setEditedArtifacts] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [pdfGenerating, setPdfGenerating] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  const getContent = useCallback((key: string): string => {
    if (editedArtifacts[key] !== undefined) return editedArtifacts[key]
    const value = artifacts[key]
    if (typeof value === 'string') return value
    if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
    return ''
  }, [artifacts, editedArtifacts])

  const handleEditChange = (key: string, value: string) => {
    setEditedArtifacts((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    if (!onSave) return
    setSaving(true)
    try {
      const merged = { ...artifacts }
      for (const [key, value] of Object.entries(editedArtifacts)) {
        if (key.endsWith('.json')) {
          try { merged[key] = JSON.parse(value) } catch { merged[key] = value }
        } else {
          merged[key] = value
        }
      }
      await onSave(merged)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setEditedArtifacts({})
    setEditing(false)
  }

  const handleDownloadPdf = async () => {
    const raw = getContent(activeTab)
    if (!raw?.trim()) return
    setPdfGenerating(true)
    try {
      const tabInfo = tabs.find((t) => t.key === activeTab)
      const reportLabel = tabInfo?.label ?? 'Report'
      const filename = buildReportPdfFilename({
        address: projectAddress,
        projectName,
        reportLabel,
      })
      await downloadMarkdownAsBrandedPdf(raw, filename, {
        projectId,
        projectName,
        projectAddress,
        reportLabel,
      })
    } catch (err) {
      console.error('PDF generation failed:', err)
    } finally {
      setPdfGenerating(false)
    }
  }

  const hasEdits = Object.keys(editedArtifacts).length > 0
  const currentTab = tabs.find((t) => t.key === activeTab)
  const currentTabIsJson = currentTab?.isJson
  const activeContent = getContent(activeTab)
  const wordEstimate = activeContent.trim()
    ? activeContent.trim().split(/\s+/).length
    : 0

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/80 bg-card/80 p-3 shadow-sm backdrop-blur-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileTextIcon className="h-4 w-4 text-secondary" />
            <span className="font-medium text-foreground">{currentTab?.label ?? 'Document'}</span>
            {wordEstimate > 0 && !currentTabIsJson && (
              <span className="text-xs tabular-nums">~{wordEstimate.toLocaleString()} words</span>
            )}
          </div>
          {validationScore !== undefined && (
            <div className="flex items-center gap-1.5">
              {validationScore >= 80 ? (
                <CheckCircleIcon className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangleIcon className={cn('h-4 w-4', validationScore >= 50 ? 'text-yellow-500' : 'text-red-500')} />
              )}
              <Badge variant={validationScore >= 80 ? 'default' : validationScore >= 50 ? 'secondary' : 'destructive'}>
                Score: {validationScore}
              </Badge>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {editable && (
            editing ? (
              <>
                <Button size="sm" variant="ghost" onClick={handleDiscard}>
                  <UndoIcon className="mr-1 h-3.5 w-3.5" />
                  Discard
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving || !hasEdits}>
                  {saving ? <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" /> : <SaveIcon className="mr-1 h-3.5 w-3.5" />}
                  Save Edits
                </Button>
              </>
            ) : (
              <Button size="sm" variant="outline" onClick={() => setEditing(true)}>
                <PenIcon className="mr-1 h-3.5 w-3.5" />
                Edit
              </Button>
            )
          )}
          <Button size="sm" variant="outline" onClick={handleDownloadPdf} disabled={pdfGenerating || editing}>
            {pdfGenerating ? <Loader2Icon className="mr-1 h-3.5 w-3.5 animate-spin" /> : <DownloadIcon className="mr-1 h-3.5 w-3.5" />}
            PDF
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={cn(
                'rounded-lg px-4 py-2 text-sm font-medium transition-all',
                activeTab === tab.key
                  ? 'bg-primary text-primary-foreground shadow-md'
                  : 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              {tab.label}
              {editedArtifacts[tab.key] !== undefined && (
                <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-secondary align-middle" />
              )}
            </button>
          ))}
        </div>
      )}

      {/* Content area */}
      <Card className="overflow-hidden border-border/70 shadow-lg">
        <CardContent className="p-0">
          {editing ? (
            <div className="flex flex-col gap-0 divide-y lg:flex-row lg:divide-x lg:divide-y-0">
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                  <PenIcon className="h-3 w-3" /> Editor
                </div>
                <Textarea
                  className="min-h-[min(70vh,720px)] resize-y rounded-none border-0 font-mono text-sm focus-visible:ring-0"
                  value={getContent(activeTab)}
                  onChange={(e) => handleEditChange(activeTab, e.target.value)}
                  spellCheck={false}
                />
              </div>
              {!currentTabIsJson && (
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-center gap-1.5 border-b bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
                    <EyeIcon className="h-3 w-3" /> Preview
                  </div>
                  <div className="max-h-[min(70vh,720px)] overflow-y-auto scrollbar-thin p-2">
                    <MarkdownDocumentViewer content={getContent(activeTab)} readingWidth="wide" />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div ref={contentRef} className="p-2 sm:p-3">
              {currentTabIsJson ? (
                <pre className="max-h-[min(75vh,800px)] overflow-auto rounded-lg border border-border/60 bg-muted/25 p-5 font-mono text-sm leading-relaxed whitespace-pre-wrap scrollbar-thin">
                  {activeContent || '{}'}
                </pre>
              ) : (
                <MarkdownDocumentViewer
                  content={activeContent}
                  readingWidth="wide"
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
