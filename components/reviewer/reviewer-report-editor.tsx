'use client'

import 'quill/dist/quill.snow.css'

import { useEffect, useMemo, useRef, useState } from 'react'
import { MarkdownDocumentViewer } from '@/components/markdown-document-viewer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { downloadMarkdownAsBrandedPdf } from '@/lib/export-pdf'
import { cn } from '@/lib/utils'
import {
  CheckCircleIcon,
  Loader2Icon,
  SaveIcon,
  Undo2Icon,
  Redo2Icon,
  EyeIcon,
  PencilIcon,
  Columns2Icon,
  TypeIcon,
  ListIcon,
  CodeIcon,
  QuoteIcon,
  DownloadIcon,
  Link2Icon,
} from 'lucide-react'

type ArtifactTabs = Array<{ key: string; label: string; isJson?: boolean }>

const FLOW_TABS: Record<string, ArtifactTabs> = {
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

function inferTabs(artifacts: Record<string, unknown>): ArtifactTabs {
  return Object.keys(artifacts).map((key) => ({
    key,
    label: key
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .replace(/ (Md|Json)$/, ''),
    isJson: key.endsWith('.json'),
  }))
}

function safeStringify(value: unknown) {
  if (typeof value === 'string') return value
  if (value && typeof value === 'object') return JSON.stringify(value, null, 2)
  return ''
}

type QuillCtor = new (el: HTMLElement, options: Record<string, unknown>) => {
  root: HTMLElement
  getText: () => string
  setText: (text: string) => void
  on: (eventName: string, cb: () => void) => void
  off: (eventName: string, cb: () => void) => void
  getSelection: () => { index: number; length: number } | null
  insertText: (index: number, text: string) => void
  deleteText: (index: number, length: number) => void
  setSelection: (index: number, length?: number) => void
}

function insertWrapped(
  quill: InstanceType<QuillCtor>,
  wrapLeft: string,
  wrapRight: string,
) {
  const sel = quill.getSelection()
  const text = quill.getText()
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text
  const effectiveSel = sel ?? { index: trimmed.length, length: 0 }

  const start = Math.max(0, effectiveSel.index)
  const end = Math.min(trimmed.length, start + Math.max(0, effectiveSel.length))
  const selected = trimmed.slice(start, end)
  const replacement = `${wrapLeft}${selected || ''}${wrapRight}`

  quill.deleteText(start, end - start)
  quill.insertText(start, replacement)
  const cursor = start + wrapLeft.length + (selected ? selected.length : 0)
  quill.setSelection(cursor, 0)
}

function insertLinePrefix(quill: InstanceType<QuillCtor>, prefix: string) {
  const sel = quill.getSelection()
  const text = quill.getText()
  const trimmed = text.endsWith('\n') ? text.slice(0, -1) : text
  const idx = Math.max(0, (sel?.index ?? trimmed.length))
  const lineStart = trimmed.lastIndexOf('\n', Math.max(0, idx - 1)) + 1

  quill.insertText(lineStart, prefix)
  quill.setSelection(idx + prefix.length, 0)
}

export function ReviewerReportEditor({
  artifacts,
  flowType,
  validationScore,
  onSave,
}: {
  artifacts: Record<string, unknown>
  flowType: string
  validationScore?: number
  onSave: (nextArtifacts: Record<string, unknown>) => Promise<void>
}) {
  const tabs = useMemo(() => FLOW_TABS[flowType] ?? inferTabs(artifacts), [artifacts, flowType])
  const [activeKey, setActiveKey] = useState<string>(tabs[0]?.key ?? '')
  const [saving, setSaving] = useState(false)
  const [mode, setMode] = useState<'edit' | 'preview' | 'split'>('split')
  const [splitPct, setSplitPct] = useState(52) // editor width %
  const [linkedScroll, setLinkedScroll] = useState<'page' | 'panes'>('page')
  const [pdfGenerating, setPdfGenerating] = useState(false)

  const quillHostRef = useRef<HTMLDivElement | null>(null)
  const quillRef = useRef<InstanceType<QuillCtor> | null>(null)
  const [drafts, setDrafts] = useState<Record<string, string>>({})
  const dragRef = useRef<{ dragging: boolean; startX: number; startPct: number } | null>(null)
  const previewRef = useRef<HTMLDivElement | null>(null)
  const editorScrollRef = useRef<HTMLDivElement | null>(null)
  const syncingScrollRef = useRef<'editor' | 'preview' | null>(null)

  const activeTab = tabs.find((t) => t.key === activeKey)
  const isJson = Boolean(activeTab?.isJson)

  const activeValue = drafts[activeKey] ?? safeStringify(artifacts[activeKey])

  const effectiveMode: 'edit' | 'preview' | 'split' = isJson
    ? 'edit'
    : mode

  // Init Quill once
  useEffect(() => {
    let mounted = true
    const host = quillHostRef.current
    if (!host) return
    if (quillRef.current) return

    ;(async () => {
      const quillMod = await import('quill')
      const Quill = (quillMod.default ?? quillMod) as unknown as QuillCtor
      if (!mounted) return
      if (!quillHostRef.current) return

      const q = new Quill(quillHostRef.current, {
        theme: 'snow',
        placeholder: 'Edit report…',
        modules: {
          toolbar: false,
          history: { delay: 500, maxStack: 200, userOnly: true },
        },
      })

      const onText = () => {
        const text = q.getText().replace(/\n$/, '')
        setDrafts((prev) => ({ ...prev, [activeKey]: text }))
      }

      q.on('text-change', onText)
      quillRef.current = q

      // Seed initial content
      q.setText(activeValue || '')

      return () => {
        q.off('text-change', onText)
      }
    })()

    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // When switching tabs, load current draft into Quill
  useEffect(() => {
    const q = quillRef.current
    if (!q) return
    q.setText(activeValue || '')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeKey])

  const handleSave = async () => {
    setSaving(true)
    try {
      const merged: Record<string, unknown> = { ...artifacts }

      for (const [key, value] of Object.entries(drafts)) {
        if (key.endsWith('.json')) {
          try {
            merged[key] = JSON.parse(value)
          } catch {
            merged[key] = value
          }
        } else {
          merged[key] = value
        }
      }

      await onSave(merged)
    } finally {
      setSaving(false)
    }
  }

  const showPreview = effectiveMode !== 'edit'
  const showEditor = effectiveMode !== 'preview'
  const canSplit = effectiveMode === 'split'

  const handleUndo = () => {
    const q = quillRef.current as any
    q?.history?.undo?.()
  }

  const handleRedo = () => {
    const q = quillRef.current as any
    q?.history?.redo?.()
  }

  const handleExportPdf = async () => {
    if (isJson) return
    if (!activeValue?.trim()) return
    setPdfGenerating(true)
    try {
      const base = (activeTab?.label ?? 'report').toLowerCase().replace(/\s+/g, '-')
      await downloadMarkdownAsBrandedPdf(activeValue, base)
    } finally {
      setPdfGenerating(false)
    }
  }

  const handleCopyPreviewLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
    } catch {
      // ignore
    }
  }

  const jumpToLine = (line: number) => {
    const q = quillRef.current
    if (!q) return
    const text = q.getText().replace(/\n$/, '')
    let idx = 0
    let current = 0
    while (current < line && idx < text.length) {
      const next = text.indexOf('\n', idx)
      if (next === -1) break
      idx = next + 1
      current++
    }
    q.setSelection(Math.max(0, idx), 0)
    // Preview scrolling is intentionally not synced for now.
  }

  const beginDrag = (clientX: number) => {
    dragRef.current = { dragging: true, startX: clientX, startPct: splitPct }
  }

  const onDrag = (clientX: number) => {
    const st = dragRef.current
    if (!st?.dragging) return
    // Compute relative to container width
    const container = document.getElementById('hitl-split-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    const dx = clientX - st.startX
    const next = st.startPct + (dx / rect.width) * 100
    setSplitPct(Math.max(32, Math.min(72, next)))
  }

  const endDrag = () => {
    if (dragRef.current) dragRef.current.dragging = false
  }

  useEffect(() => {
    const move = (e: PointerEvent) => onDrag(e.clientX)
    const up = () => endDrag()
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    return () => {
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitPct])

  // Keyboard shortcuts (Ctrl/Cmd + B/I/K/S, and Ctrl/Cmd + / for code block)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const meta = e.metaKey || e.ctrlKey
      if (!meta) return
      if (isJson) return
      const q = quillRef.current
      if (!q) return

      const key = e.key.toLowerCase()
      if (key === 's') {
        e.preventDefault()
        handleSave()
        return
      }
      if (effectiveMode === 'preview') return

      if (key === 'b') {
        e.preventDefault()
        insertWrapped(q, '**', '**')
      } else if (key === 'i') {
        e.preventDefault()
        insertWrapped(q, '*', '*')
      } else if (key === 'k') {
        e.preventDefault()
        insertWrapped(q, '[', '](https://)')
      } else if (key === '/') {
        e.preventDefault()
        insertWrapped(q, '```\\n', '\\n```')
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [effectiveMode, isJson, activeKey, activeValue])

  // Optional "panes" scroll mode with sync
  useEffect(() => {
    if (linkedScroll !== 'panes') return
    const editorEl = editorScrollRef.current
    const previewEl = previewRef.current
    if (!editorEl || !previewEl) return

    const sync = (source: 'editor' | 'preview') => {
      const src = source === 'editor' ? editorEl : previewEl
      const dst = source === 'editor' ? previewEl : editorEl
      const srcMax = Math.max(1, src.scrollHeight - src.clientHeight)
      const dstMax = Math.max(1, dst.scrollHeight - dst.clientHeight)
      const pct = src.scrollTop / srcMax
      dst.scrollTop = pct * dstMax
    }

    const onEditor = () => {
      if (syncingScrollRef.current === 'preview') return
      syncingScrollRef.current = 'editor'
      sync('editor')
      window.setTimeout(() => { syncingScrollRef.current = null }, 0)
    }
    const onPreview = () => {
      if (syncingScrollRef.current === 'editor') return
      syncingScrollRef.current = 'preview'
      sync('preview')
      window.setTimeout(() => { syncingScrollRef.current = null }, 0)
    }

    editorEl.addEventListener('scroll', onEditor, { passive: true })
    previewEl.addEventListener('scroll', onPreview, { passive: true })
    return () => {
      editorEl.removeEventListener('scroll', onEditor)
      previewEl.removeEventListener('scroll', onPreview)
    }
  }, [linkedScroll])

  return (
    <div className="space-y-4">
      {/* Compact header row */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <Badge variant="outline" className="shrink-0">
            {activeTab?.label ?? 'Section'}
          </Badge>
          {isJson ? <Badge variant="secondary">JSON</Badge> : <Badge variant="secondary">Markdown</Badge>}
          {typeof validationScore === 'number' && (
            <Badge variant="secondary" className="gap-1">
              <CheckCircleIcon className="h-3.5 w-3.5" />
              {Math.round(validationScore)}%
            </Badge>
          )}
        </div>

        {/* Mode toggle */}
        <div className="flex items-center gap-2">
          {!isJson && (
            <div className="hidden sm:flex items-center rounded-md border border-border/60 overflow-hidden">
              <button
                className={cn(
                  'px-3 py-1.5 text-xs font-medium',
                  effectiveMode === 'edit' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                )}
                onClick={() => setMode('edit')}
              >
                <PencilIcon className="inline-block mr-1 h-3.5 w-3.5" />
                Edit
              </button>
              <button
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border-l border-border/60',
                  effectiveMode === 'preview' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                )}
                onClick={() => setMode('preview')}
              >
                <EyeIcon className="inline-block mr-1 h-3.5 w-3.5" />
                Preview
              </button>
              <button
                className={cn(
                  'px-3 py-1.5 text-xs font-medium border-l border-border/60',
                  effectiveMode === 'split' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                )}
                onClick={() => setMode('split')}
              >
                <Columns2Icon className="inline-block mr-1 h-3.5 w-3.5" />
                Split
              </button>
            </div>
          )}

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleUndo} disabled={effectiveMode === 'preview' || isJson}>
                  <Undo2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Undo</TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleRedo} disabled={effectiveMode === 'preview' || isJson}>
                  <Redo2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Redo</TooltipContent>
            </Tooltip>

            {!isJson && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="outline" onClick={handleExportPdf} disabled={pdfGenerating || !activeValue?.trim()}>
                    {pdfGenerating ? <Loader2Icon className="h-4 w-4 animate-spin" /> : <DownloadIcon className="h-4 w-4" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export PDF (active section)</TooltipContent>
              </Tooltip>
            )}

            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="sm" variant="outline" onClick={handleCopyPreviewLink}>
                  <Link2Icon className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Copy page link</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" /> : <SaveIcon className="mr-1.5 h-4 w-4" />}
            Save
          </Button>
        </div>
      </div>

      {/* Tabs */}
      {tabs.length > 1 && (
        <div className="flex gap-1 border-b border-border/60 overflow-x-auto">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveKey(t.key)}
              className={cn(
                'px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors',
                activeKey === t.key
                  ? 'text-foreground border-b-2 border-primary'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {/* Main area */}
      <div
        id="hitl-split-container"
        className={cn('relative grid gap-4', canSplit ? 'lg:gap-0' : 'grid-cols-1')}
        style={
          canSplit
            ? { gridTemplateColumns: `${splitPct}% 10px ${100 - splitPct}%` }
            : undefined
        }
      >
        {showEditor && (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Editor</span>

                {/* Insert menu (right where you need it) */}
                <div className="flex items-center gap-2">
                  {!isJson && (
                    <div className="hidden md:flex items-center gap-1 rounded-md border border-border/60 px-2 py-1">
                      <span className="text-[11px] text-muted-foreground/90">Scroll</span>
                      <button
                        className={cn(
                          'text-[11px] px-2 py-1 rounded',
                          linkedScroll === 'page' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                        )}
                        onClick={() => setLinkedScroll('page')}
                        type="button"
                      >
                        Page
                      </button>
                      <button
                        className={cn(
                          'text-[11px] px-2 py-1 rounded',
                          linkedScroll === 'panes' ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground hover:bg-accent/40',
                        )}
                        onClick={() => setLinkedScroll('panes')}
                        type="button"
                      >
                        Linked
                      </button>
                    </div>
                  )}

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="sm" variant="outline" className="h-8" disabled={isJson}>
                        <TypeIcon className="mr-1 h-3.5 w-3.5" />
                        Insert
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertLinePrefix(q, '## ')
                      }}
                    >
                      <TypeIcon />
                      Heading (H2)
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertWrapped(q, '**', '**')
                      }}
                    >
                      <TypeIcon />
                      Bold
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertWrapped(q, '*', '*')
                      }}
                    >
                      <TypeIcon />
                      Italic
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertLinePrefix(q, '- ')
                      }}
                    >
                      <ListIcon />
                      Bullet list
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertWrapped(q, '```\\n', '\\n```')
                      }}
                    >
                      <CodeIcon />
                      Code block
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onSelect={() => {
                        const q = quillRef.current
                        if (!q) return
                        insertLinePrefix(q, '> ')
                      }}
                    >
                      <QuoteIcon />
                      Quote
                    </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Avoid nested scrollbars: let the PAGE scroll, not the editor box */}
              <div
                ref={editorScrollRef}
                className={cn(
                  'min-h-[520px]',
                  linkedScroll === 'panes' && 'max-h-[620px] overflow-auto',
                )}
              >
                <div
                  ref={quillHostRef}
                  className={cn(
                    'min-h-[520px]',
                    linkedScroll === 'page'
                      ? '[&_.ql-container]:border-0 [&_.ql-container]:h-auto [&_.ql-container]:overflow-visible'
                      : '[&_.ql-container]:border-0 [&_.ql-container]:h-auto [&_.ql-container]:overflow-visible',
                    linkedScroll === 'page'
                      ? '[&_.ql-editor]:min-h-[520px] [&_.ql-editor]:overflow-visible'
                      : '[&_.ql-editor]:min-h-[520px] [&_.ql-editor]:overflow-visible',
                    '[&_.ql-editor]:font-mono [&_.ql-editor]:text-[13px] [&_.ql-editor]:leading-6 [&_.ql-editor]:bg-transparent',
                  )}
                />
              </div>
            </CardContent>
          </Card>
        )}

        {canSplit && (
          <div className="hidden lg:flex items-stretch justify-center">
            <div
              onPointerDown={(e) => beginDrag(e.clientX)}
              className="group w-[10px] cursor-col-resize flex items-center justify-center"
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize panes"
            >
              <div className="h-20 w-[3px] rounded-full bg-border/60 group-hover:bg-primary/60 transition-colors" />
            </div>
          </div>
        )}

        {showPreview && (
          <Card className="border-border/60 overflow-hidden">
            <CardContent className="p-0">
              <div className="border-b border-border/60 px-4 py-2.5 text-sm font-medium text-muted-foreground flex items-center justify-between">
                <span>Preview</span>
                <span className="text-[11px] text-muted-foreground/80">Sanitized</span>
              </div>
              {/* Match editor behavior: no inner scroll, page scrolls */}
              <div
                ref={previewRef}
                className={cn(
                  'p-6',
                  linkedScroll === 'panes' && 'max-h-[620px] overflow-auto',
                )}
              >
                <MarkdownDocumentViewer
                  content={activeValue || ''}
                  readingWidth="wide"
                  emptyMessage="Empty document."
                />
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}

