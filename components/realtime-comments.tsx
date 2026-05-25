'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { MessageSquareIcon, SendIcon, Loader2Icon } from 'lucide-react'
import type { ReportComment } from '@/types/database'

interface RealtimeCommentsProps {
  reportId: string
  userId?: string
  initialComments: ReportComment[]
}

export default function RealtimeComments({ reportId, userId, initialComments }: RealtimeCommentsProps) {
  const supabase = useMemo(() => createClient(), [])
  const [comments, setComments] = useState<ReportComment[]>(initialComments)
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [authorName, setAuthorName] = useState<string>('Anonymous')

  // Sync with parent when initialComments change (e.g. after manual refresh)
  useEffect(() => {
    setComments(initialComments)
  }, [initialComments])

  // Load author name from profile
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user?.user_metadata?.full_name) {
        setAuthorName(user.user_metadata.full_name)
      } else if (user?.email) {
        setAuthorName(user.email.split('@')[0])
      }
    })
  }, [supabase])

  // Subscribe to realtime INSERT, UPDATE, and DELETE on report_comments
  useEffect(() => {
    const channel = supabase
      .channel(`report-comments-${reportId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'report_comments',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const newComment = payload.new as ReportComment
          setComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev
            return [...prev, newComment]
          })
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'report_comments',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const updated = payload.new as ReportComment
          setComments((prev) => prev.map((c) => (c.id === updated.id ? updated : c)))
        },
      )
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'report_comments',
          filter: `report_id=eq.${reportId}`,
        },
        (payload) => {
          const deletedId = (payload.old as { id: string }).id
          setComments((prev) => prev.filter((c) => c.id !== deletedId))
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, reportId])

  const handleSubmitComment = async () => {
    const content = newComment.trim()
    if (!content) return
    setSubmitting(true)
    try {
      const res = await fetch(`/api/reports/${reportId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      })
      if (res.ok) {
        setNewComment('')
      }
    } catch (err) {
      console.error('Failed to post comment:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      {comments.length === 0 && (
        <p className="py-4 text-sm text-muted-foreground">No comments yet.</p>
      )}

      {comments.map((c) => (
        <Card key={c.id}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              <MessageSquareIcon className="mt-0.5 h-4 w-4 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-xs font-medium text-foreground">
                  {(c as ReportComment & { author_name?: string }).author_name || 'Anonymous'}
                </p>
                <p className="text-sm mt-0.5">{c.content}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {new Date(c.created_at).toLocaleString()}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Comment input form */}
      <div className="flex gap-2 pt-2">
        <Textarea
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder={`Comment as ${authorName}…`}
          rows={2}
          className="flex-1 text-sm"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSubmitComment()
            }
          }}
        />
        <Button
          onClick={handleSubmitComment}
          disabled={submitting || !newComment.trim()}
          size="icon"
          className="shrink-0 self-end"
        >
          {submitting ? (
            <Loader2Icon className="w-4 h-4 animate-spin" />
          ) : (
            <SendIcon className="w-4 h-4" />
          )}
        </Button>
      </div>
    </div>
  )
}
