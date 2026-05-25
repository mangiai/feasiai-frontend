'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { ArrowLeftIcon, CheckCircleIcon, HistoryIcon, PenLineIcon } from 'lucide-react'
import VerificationForm from '@/components/verification-form'
import RealtimeComments from '@/components/realtime-comments'
import { ReportMarkdownViewer } from '@/components/report-markdown-viewer'
import { MarkdownDocumentViewer } from '@/components/markdown-document-viewer'
import type { Report, ReportVersion, ReportComment, ReportFeedback } from '@/types/database'
import { CollaborationsList } from '@/components/collaborations-list'

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  draft: 'secondary',
  under_review: 'outline',
  published: 'default',
  archived: 'destructive',
}

const VERIFICATION_VARIANT: Record<string, 'default' | 'secondary' | 'outline'> = {
  unverified: 'secondary',
  pending: 'outline',
  verified: 'default',
  rejected: 'secondary',
}

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = useMemo(() => createClient(), [])

  const [report, setReport] = useState<Report | null>(null)
  const [versions, setVersions] = useState<ReportVersion[]>([])
  const [comments, setComments] = useState<ReportComment[]>([])
  const [feedback, setFeedback] = useState<ReportFeedback[]>([])
  const [projectMeta, setProjectMeta] = useState<{
    id: string
    name: string
    address: string | null
    city: string | null
    state: string | null
    status: string
  } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [canEdit, setCanEdit] = useState(false)

  // Inline title editing
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState('')

  // Comment form
  const [commentText, setCommentText] = useState('')
  const [isSubmittingComment, setIsSubmittingComment] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteScope, setInviteScope] = useState<'view' | 'comment' | 'edit'>('comment')
  const [isInviting, setIsInviting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  const [collaborationRefreshToken, setCollaborationRefreshToken] = useState(0)

  const loadReport = useCallback(async () => {
    const res = await fetch(`/api/reports/${id}`, { cache: 'no-store' })
    if (!res.ok) {
      setReport(null)
      setVersions([])
      setProjectMeta(null)
      setCanEdit(false)
      return
    }

    const data = await res.json()
    setReport((data.report ?? null) as Report | null)
    setVersions((data.versions ?? []) as ReportVersion[])
    setProjectMeta((data.project ?? null) as {
      id: string
      name: string
      address: string | null
      city: string | null
      state: string | null
      status: string
    } | null)
    setCanEdit(Boolean(data.can_edit))
  }, [id])

  const loadComments = useCallback(async () => {
    const res = await fetch(`/api/reports/${id}/comments`, { cache: 'no-store' })
    if (!res.ok) {
      setComments([])
      return
    }
    const data = await res.json()
    setComments((data.comments ?? []) as ReportComment[])
  }, [id])

  const loadFeedback = useCallback(async () => {
    const res = await fetch(`/api/reports/${id}/feedback`, { cache: 'no-store' })
    if (!res.ok) {
      setFeedback([])
      return
    }
    const data = await res.json()
    setFeedback((data.feedback ?? []) as ReportFeedback[])
  }, [id])

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      await Promise.all([loadReport(), loadComments(), loadFeedback()])
      setIsLoading(false)
    }
    load()
  }, [loadReport, loadComments, loadFeedback])

  async function handleTitleSave() {
    if (!report || !editTitle.trim()) return
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: editTitle.trim() }),
    })
    if (res.ok) {
      await loadReport()
    }
    setIsEditingTitle(false)
  }

  async function handleAddComment() {
    if (!commentText.trim()) return
    setIsSubmittingComment(true)
    const res = await fetch(`/api/reports/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: commentText.trim() }),
    })
    if (res.ok) {
      setCommentText('')
      await loadComments()
    }
    setIsSubmittingComment(false)
  }

  async function handleRestoreVersion(versionNumber: number) {
    // Fetch the version snapshot and apply it
    const { data: version } = await supabase
      .from('report_versions')
      .select('content')
      .eq('report_id', id)
      .eq('version_number', versionNumber)
      .single()

    if (!version?.content) return

    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: version.content }),
    })
    if (res.ok) {
      await loadReport()
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-up">
        <div className="h-10 w-80 bg-muted animate-pulse rounded" />
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-10 w-96 bg-muted animate-pulse rounded" />
        <div className="h-64 w-full bg-muted animate-pulse rounded" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-muted-foreground">Report not found</p>
      </div>
    )
  }

  const contentObj = report.content as Record<string, unknown> | null
  const artifacts = (contentObj?.artifacts as Record<string, unknown>) ?? null
  const flowType = (contentObj?.flow_type as string) ?? report.report_type ?? ''
  const derivedValidationScore = (() => {
    const direct = contentObj?.validation_score
    if (typeof direct === 'number' && Number.isFinite(direct)) {
      return Math.max(0, Math.min(100, Math.round(direct)))
    }

    const confidence = contentObj?.confidence_score
    if (typeof confidence === 'number' && Number.isFinite(confidence)) {
      return Math.max(0, Math.min(100, Math.round(confidence * 100)))
    }

    if (artifacts && typeof artifacts === 'object') {
      const values = Object.values(artifacts)
      if (values.length > 0) {
        const filled = values.filter((value) => {
          if (typeof value === 'string') return value.trim().length > 0
          if (Array.isArray(value)) return value.length > 0
          if (value && typeof value === 'object') return Object.keys(value as Record<string, unknown>).length > 0
          return value != null
        }).length
        return Math.round((filled / values.length) * 100)
      }
    }

    if (report.verification_status === 'verified') return 98
    if (report.verification_status === 'pending') return 88
    if (report.status === 'published') return 84
    if (report.status === 'in_review') return 72
    return 60
  })()

  // Fallback for legacy reports without artifacts structure
  const contentDisplay = !artifacts
    ? (typeof report.content === 'string'
        ? report.content
        : typeof report.content === 'object' && report.content !== null
          ? JSON.stringify(report.content, null, 2)
          : 'No content')
    : null

  async function handleSaveArtifacts(updatedArtifacts: Record<string, unknown>) {
    if (!artifacts) return

    // Capture diffs as feedback entries before saving
    const feedbackEntries: Array<{ section_path: string; original_content: string; corrected_content: string; correction_type: string }> = []
    for (const [key, newValue] of Object.entries(updatedArtifacts)) {
      const oldValue = artifacts[key]
      const oldStr = typeof oldValue === 'string' ? oldValue : JSON.stringify(oldValue, null, 2)
      const newStr = typeof newValue === 'string' ? newValue : JSON.stringify(newValue, null, 2)
      if (oldStr !== newStr) {
        feedbackEntries.push({
          section_path: key,
          original_content: oldStr || '',
          corrected_content: newStr || '',
          correction_type: 'other',
        })
      }
    }

    // Save the content update
    const updatedContent = { ...contentObj, artifacts: updatedArtifacts }
    const res = await fetch(`/api/reports/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: updatedContent }),
    })
    if (!res.ok) throw new Error('Failed to save')

    // Submit each diff as feedback (fire-and-forget)
    for (const entry of feedbackEntries) {
      fetch(`/api/reports/${id}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...entry,
          version_from: report!.current_version,
          version_to: report!.current_version + 1,
        }),
      }).catch(() => {})
    }

    await loadReport()
  }

  async function handleInviteCollaborator() {
    if (!projectMeta || !report || !inviteEmail.trim()) return
    setIsInviting(true)
    setInviteError(null)
    setInviteSuccess(null)

    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projectMeta.id,
          report_id: report.id,
          grantee_email: inviteEmail.trim().toLowerCase(),
          scope: inviteScope,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setInviteError(data.error || 'Failed to send invite.')
        return
      }

      setInviteSuccess('Invitation sent.')
      setInviteEmail('')
      setCollaborationRefreshToken((prev) => prev + 1)
    } catch {
      setInviteError('Network error while sending invite.')
    } finally {
      setIsInviting(false)
    }
  }

  return (
    <div className="space-y-6 animate-fade-up">
      {/* Header */}
      <div className="sticky top-0 z-20 -mx-4 border-b bg-background/95 px-4 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={() => router.back()}
            title="Go back"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Button>
        <div className="space-y-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-2">
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-xl font-semibold"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleTitleSave()
                  if (e.key === 'Escape') setIsEditingTitle(false)
                }}
              />
              <Button size="sm" onClick={handleTitleSave}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setIsEditingTitle(false)}>Cancel</Button>
            </div>
          ) : (
            <h1
              className="heading-display text-foreground cursor-pointer hover:text-primary transition-colors"
              onClick={() => {
                setEditTitle(report.title)
                setIsEditingTitle(true)
              }}
              title="Click to edit title"
            >
              {report.title}
              <PenLineIcon className="inline-block ml-2 w-4 h-4 text-muted-foreground" />
            </h1>
          )}
          <div className="flex items-center gap-2">
            <Badge variant={STATUS_VARIANT[report.status] ?? 'secondary'}>
              {report.status.replace(/_/g, ' ')}
            </Badge>
            <Badge variant={VERIFICATION_VARIANT[report.verification_status] ?? 'secondary'}>
              {report.verification_status}
            </Badge>
            <span className="text-sm text-muted-foreground">v{report.current_version}</span>
          </div>
          <div className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Project:</span>{' '}
            {projectMeta?.name ?? 'Unknown project'}
            {(projectMeta?.city || projectMeta?.state) && (
              <>
                {' '}
                <span>
                  ({[projectMeta?.city, projectMeta?.state].filter(Boolean).join(', ')})
                </span>
              </>
            )}
          </div>
          {projectMeta?.address && (
            <p className="text-xs text-muted-foreground">{projectMeta.address}</p>
          )}
        </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Project {projectMeta?.status?.replace(/_/g, ' ') ?? 'unknown'}</Badge>
          <VerificationForm
            reportId={id}
            onSubmit={loadReport}
            triggerLabel="Request Human Verification"
            disabled={report.verification_status === 'pending'}
          />
        </div>
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="content">
        <TabsList>
          <TabsTrigger value="content">Content</TabsTrigger>
          <TabsTrigger value="versions">Versions ({versions.length})</TabsTrigger>
          <TabsTrigger value="comments">Comments ({comments.length})</TabsTrigger>
          <TabsTrigger value="feedback">Feedback ({feedback.length})</TabsTrigger>
          <TabsTrigger value="collaborators">Collaborators</TabsTrigger>
        </TabsList>

        {/* Content Tab */}
        <TabsContent value="content" className="space-y-4">
          {artifacts ? (
            <ReportMarkdownViewer
              artifacts={artifacts}
              flowType={flowType}
              validationScore={derivedValidationScore}
              editable={canEdit}
              onSave={handleSaveArtifacts}
              projectId={projectMeta?.id}
              projectAddress={projectMeta?.address}
              projectName={projectMeta?.name}
            />
          ) : (
            <Card>
              <CardContent className="pt-6">
                <MarkdownDocumentViewer content={contentDisplay} readingWidth="wide" />
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Versions Tab */}
        <TabsContent value="versions" className="space-y-3">
          {versions.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No version history yet.</p>
          ) : (
            versions
              .sort((a, b) => b.version_number - a.version_number)
              .map(v => (
                <Card key={v.id}>
                  <CardContent className="flex items-center justify-between py-4">
                    <div className="flex items-center gap-3">
                      <HistoryIcon className="w-4 h-4 text-muted-foreground" />
                      <div>
                        <p className="text-sm font-medium">Version {v.version_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {v.change_summary} &middot; {new Date(v.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleRestoreVersion(v.version_number)}>
                      Restore
                    </Button>
                  </CardContent>
                </Card>
              ))
          )}
        </TabsContent>

        {/* Comments Tab */}
        <TabsContent value="comments" className="space-y-4">
          <RealtimeComments reportId={id} initialComments={comments} />

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Add a comment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Textarea
                placeholder="Write a comment..."
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                rows={3}
              />
              <Button
                size="sm"
                onClick={handleAddComment}
                disabled={!commentText.trim() || isSubmittingComment}
              >
                {isSubmittingComment ? 'Posting...' : 'Post Comment'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Feedback Tab */}
        <TabsContent value="feedback" className="space-y-3">
          {feedback.length === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No feedback submitted yet.</p>
          ) : (
            feedback.map(f => (
              <Card key={f.id}>
                <CardContent className="py-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-muted-foreground" />
                    <Badge variant="outline">{f.correction_type}</Badge>
                    <span className="text-xs text-muted-foreground">{f.section_path}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Original</p>
                      <p className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap">{f.original_content}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">Corrected</p>
                      <p className="bg-muted/50 rounded p-2 text-xs whitespace-pre-wrap">{f.corrected_content}</p>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {new Date(f.created_at).toLocaleString()}
                    {f.version_from != null && f.version_to != null && (
                      <> &middot; v{f.version_from} → v{f.version_to}</>
                    )}
                  </p>
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>

        <TabsContent value="collaborators" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Invite Collaborator</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-3 md:grid-cols-[1fr,180px,auto]">
                <div className="space-y-1">
                  <Label htmlFor="invite-email">Email</Label>
                  <Input
                    id="invite-email"
                    type="email"
                    placeholder="architect@example.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="invite-scope">Access</Label>
                  <select
                    id="invite-scope"
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={inviteScope}
                    onChange={(e) => setInviteScope(e.target.value as 'view' | 'comment' | 'edit')}
                  >
                    <option value="view">View</option>
                    <option value="comment">Comment</option>
                    <option value="edit">Edit</option>
                  </select>
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={handleInviteCollaborator}
                    disabled={!inviteEmail.trim() || isInviting || !projectMeta}
                    className="w-full md:w-auto"
                  >
                    {isInviting ? 'Sending…' : 'Send Invite'}
                  </Button>
                </div>
              </div>
              {inviteError && <p className="text-sm text-destructive">{inviteError}</p>}
              {inviteSuccess && <p className="text-sm text-green-600">{inviteSuccess}</p>}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Collaborators</CardTitle>
            </CardHeader>
            <CardContent>
              <CollaborationsList
                resourceType="report"
                resourceId={id}
                refreshToken={collaborationRefreshToken}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
