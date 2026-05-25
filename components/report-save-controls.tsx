'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { CheckCircleIcon, CloudIcon, Loader2Icon, SaveIcon } from 'lucide-react'

interface ReportSaveControlsProps {
  reportId: string
  content: any
  onSave: () => void
}

type SaveStatus = 'saved' | 'saving' | 'unsaved' | 'error'

export default function ReportSaveControls({ reportId, content, onSave }: ReportSaveControlsProps) {
  const [status, setStatus] = useState<SaveStatus>('saved')
  const [versionNotes, setVersionNotes] = useState('')
  const [dialogOpen, setDialogOpen] = useState(false)
  const [isSavingVersion, setIsSavingVersion] = useState(false)
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevContentRef = useRef<string>('')

  // Track content changes for auto-save
  const contentStr = JSON.stringify(content)

  useEffect(() => {
    // Skip on first render
    if (prevContentRef.current === '') {
      prevContentRef.current = contentStr
      return
    }

    if (prevContentRef.current === contentStr) return

    prevContentRef.current = contentStr
    setStatus('unsaved')

    if (debounceTimer.current) clearTimeout(debounceTimer.current)

    debounceTimer.current = setTimeout(async () => {
      setStatus('saving')
      try {
        const res = await fetch(`/api/reports/${reportId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ content }),
        })
        if (res.ok) {
          setStatus('saved')
          onSave()
        } else {
          setStatus('error')
        }
      } catch {
        setStatus('error')
      }
    }, 3000)

    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
    }
  }, [contentStr, reportId, content, onSave])

  const handleSaveVersion = useCallback(async () => {
    setIsSavingVersion(true)
    try {
      const res = await fetch(`/api/reports/${reportId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'create_version', content, notes: versionNotes }),
      })
      if (res.ok) {
        setDialogOpen(false)
        setVersionNotes('')
        setStatus('saved')
        onSave()
      }
    } finally {
      setIsSavingVersion(false)
    }
  }, [reportId, content, versionNotes, onSave])

  return (
    <div className="flex items-center gap-3">
      {/* Status indicator */}
      <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {status === 'saved' && (
          <>
            <CheckCircleIcon className="h-3.5 w-3.5 text-emerald-500" />
            Saved
          </>
        )}
        {status === 'saving' && (
          <>
            <Loader2Icon className="h-3.5 w-3.5 animate-spin" />
            Saving…
          </>
        )}
        {status === 'unsaved' && (
          <>
            <CloudIcon className="h-3.5 w-3.5 text-amber-500" />
            Unsaved changes
          </>
        )}
        {status === 'error' && (
          <>
            <CloudIcon className="h-3.5 w-3.5 text-destructive" />
            Save failed
          </>
        )}
      </span>

      {/* Save Version button */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            <SaveIcon className="mr-1.5 h-3.5 w-3.5" />
            Save as New Version
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save New Version</DialogTitle>
            <DialogDescription>
              Create a named snapshot of the current report content.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Version notes (e.g. 'Added zoning analysis')"
              value={versionNotes}
              onChange={(e) => setVersionNotes(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && versionNotes.trim()) handleSaveVersion()
              }}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setDialogOpen(false)} disabled={isSavingVersion}>
              Cancel
            </Button>
            <Button onClick={handleSaveVersion} disabled={isSavingVersion || !versionNotes.trim()}>
              {isSavingVersion ? 'Saving…' : 'Save Version'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
