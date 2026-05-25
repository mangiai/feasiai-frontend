'use client'

import { useCallback, useState } from 'react'
import { cn } from '@/lib/utils'
import {
  UploadCloudIcon,
  FileTextIcon,
  XIcon,
  CheckCircle2Icon,
  AlertCircleIcon,
  Loader2Icon,
  RotateCcwIcon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface UploadFile {
  file: File
  id: string
  status: 'pending' | 'uploading' | 'done' | 'error'
  progress: number
  error?: string
}

interface FileDropzoneProps {
  files: UploadFile[]
  onFilesAdded: (files: File[]) => void
  onFileRemoved: (id: string)  => void
  onRetry?: (id: string) => void
  accept?: string
  maxFiles?: number
  maxSizeMb?: number
  label?: string
  hint?: string
  disabled?: boolean
}

export function FileDropzone({
  files,
  onFilesAdded,
  onFileRemoved,
  onRetry,
  accept = '.pdf',
  maxFiles = 5,
  maxSizeMb = 100,
  label = 'Drop files here',
  hint = 'PDF files up to 100 MB',
  disabled = false,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false)
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null)

  const validateFiles = useCallback(
    (fileList: File[]): { accepted: File[]; rejected: { name: string; reason: string }[] } => {
      const accepted: File[] = []
      const rejected: { name: string; reason: string }[] = []
      const allowedExts = accept ? accept.split(',').map(e => e.trim().toLowerCase()) : []

      for (const f of fileList) {
        if (allowedExts.length > 0 && !allowedExts.some(ext => f.name.toLowerCase().endsWith(ext))) {
          rejected.push({ name: f.name, reason: `Invalid file type (accepted: ${accept})` })
        } else if (f.size > maxSizeMb * 1024 * 1024) {
          rejected.push({ name: f.name, reason: `File exceeds ${maxSizeMb} MB limit` })
        } else {
          accepted.push(f)
        }
      }
      return { accepted, rejected }
    },
    [accept, maxSizeMb],
  )

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setDragActive(false)
      setRejectionMessage(null)
      if (disabled) return

      const allFiles = Array.from(e.dataTransfer.files)
      const { accepted, rejected } = validateFiles(allFiles)

      if (rejected.length > 0) {
        setRejectionMessage(rejected.map(r => `${r.name}: ${r.reason}`).join('; '))
        setTimeout(() => setRejectionMessage(null), 5000)
      }

      if (accepted.length > 0) {
        const remaining = maxFiles - files.length
        onFilesAdded(accepted.slice(0, remaining))
      }
    },
    [disabled, files.length, maxFiles, onFilesAdded, validateFiles],
  )

  const handleDragOver = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!disabled) setDragActive(true)
    },
    [disabled],
  )

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }, [])

  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (disabled || !e.target.files) return
      setRejectionMessage(null)

      const allFiles = Array.from(e.target.files)
      const { accepted, rejected } = validateFiles(allFiles)

      if (rejected.length > 0) {
        setRejectionMessage(rejected.map(r => `${r.name}: ${r.reason}`).join('; '))
        setTimeout(() => setRejectionMessage(null), 5000)
      }

      if (accepted.length > 0) {
        const remaining = maxFiles - files.length
        onFilesAdded(accepted.slice(0, remaining))
      }
      e.target.value = '' // reset so same file can be re-selected
    },
    [disabled, files.length, maxFiles, onFilesAdded, validateFiles],
  )

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <label
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        className={cn(
          'relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-8 transition-all cursor-pointer',
          dragActive
            ? 'border-primary bg-primary/5 scale-[1.01]'
            : 'border-border/60 hover:border-primary/40 hover:bg-muted/30',
          disabled && 'opacity-50 cursor-not-allowed',
          files.length >= maxFiles && 'opacity-50 cursor-not-allowed',
        )}
      >
        <input
          type="file"
          accept={accept}
          multiple
          onChange={handleFileInput}
          className="sr-only"
          disabled={disabled || files.length >= maxFiles}
        />
        <div
          className={cn(
            'w-12 h-12 rounded-full flex items-center justify-center transition-colors',
            dragActive ? 'bg-primary/20' : 'bg-muted',
          )}
        >
          <UploadCloudIcon
            className={cn(
              'w-6 h-6 transition-colors',
              dragActive ? 'text-primary' : 'text-muted-foreground',
            )}
          />
        </div>
        <div className="text-center">
          <p className="text-base font-semibold text-foreground font-body">{label}</p>
          <p className="text-sm text-muted-foreground font-body mt-1">
            {hint} &middot; {files.length}/{maxFiles} files
          </p>
        </div>
      </label>

      {/* Rejection message */}
      {rejectionMessage && (
        <div className="flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-2.5">
          <AlertCircleIcon className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
          <p className="text-xs text-destructive">{rejectionMessage}</p>
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((f) => (
            <div
              key={f.id}
              className={cn(
                'flex items-center gap-3 rounded-lg border px-4 py-3 transition-all',
                f.status === 'error'
                  ? 'border-destructive/30 bg-destructive/5'
                  : f.status === 'done'
                    ? 'border-success/30 bg-success/5'
                    : 'border-border/50 bg-card',
              )}
            >
              <FileTextIcon className="w-5 h-5 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground font-body truncate">
                  {f.file.name}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground font-body">
                    {formatSize(f.file.size)}
                  </span>
                  {f.status === 'uploading' && (
                    <span className="text-xs text-primary font-body">
                      {Math.round(f.progress)}%
                    </span>
                  )}
                  {f.status === 'error' && (
                    <span className="text-xs text-destructive font-body">
                      {f.error || 'Upload failed'}
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {f.status === 'uploading' && (
                  <div className="mt-1.5 h-1 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{ width: `${f.progress}%` }}
                    />
                  </div>
                )}
              </div>
              <div className="shrink-0">
                {f.status === 'pending' && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => onFileRemoved(f.id)}
                  >
                    <XIcon className="w-4 h-4" />
                  </Button>
                )}
                {f.status === 'uploading' && (
                  <Loader2Icon className="w-4 h-4 text-primary animate-spin" />
                )}
                {f.status === 'done' && (
                  <CheckCircle2Icon className="w-4 h-4 text-success" />
                )}
                {f.status === 'error' && (
                  <div className="flex items-center gap-1">
                    {onRetry && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => onRetry(f.id)}
                        title="Retry upload"
                      >
                        <RotateCcwIcon className="w-4 h-4 text-destructive" />
                      </Button>
                    )}
                    <AlertCircleIcon className="w-4 h-4 text-destructive" />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
