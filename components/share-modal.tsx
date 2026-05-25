'use client'

import { useState } from 'react'
import { CopyIcon, CheckIcon, SendIcon, Loader2Icon, Trash2Icon } from 'lucide-react'
import { getPublicClientOrigin } from '@/lib/http/public-client-origin'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogBody,
  DialogFooter,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select'

interface Collaborator {
  id: string
  email: string
  scope: string
  status: string
}

interface ShareModalProps {
  resourceType: 'project' | 'report'
  resourceId: string
  isOpen: boolean
  onClose: () => void
  collaborators?: Collaborator[]
  onRevoke?: (id: string) => void
}

const SCOPE_OPTIONS = [
  { value: 'view', label: 'View only' },
  { value: 'comment', label: 'Can comment' },
  { value: 'edit', label: 'Can edit' },
] as const

const EXPIRY_OPTIONS = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
  { value: 'never', label: 'Never' },
] as const

export function ShareModal({ resourceType, resourceId, isOpen, onClose, collaborators = [], onRevoke }: ShareModalProps) {
  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<string>('view')
  const [expiry, setExpiry] = useState<string>('30')
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null)
  const [copied, setCopied] = useState(false)
  const [acceptUrl, setAcceptUrl] = useState<string | null>(null)

  const reset = () => {
    setEmail('')
    setScope('view')
    setExpiry('30')
    setStatus(null)
    setLoading(false)
    setCopied(false)
    setAcceptUrl(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return

    setLoading(true)
    setStatus(null)

    try {
      const res = await fetch('/api/collaborations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: resourceType === 'project' ? resourceId : undefined,
          report_id: resourceType === 'report' ? resourceId : undefined,
          grantee_email: email.trim(),
          scope,
          expires_days: expiry === 'never' ? null : Number(expiry),
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to send invitation')
      }

      const data = await res.json()
      const url = `${getPublicClientOrigin()}/api/collaborations/${data.invite_token}/accept`
      setAcceptUrl(url)
      setStatus({ type: 'success', message: `Invitation sent to ${email}` })
      setEmail('')
    } catch (err) {
      setStatus({ type: 'error', message: err instanceof Error ? err.message : 'Something went wrong' })
    } finally {
      setLoading(false)
    }
  }

  const handleCopy = async () => {
    if (!acceptUrl) return
    await navigator.clipboard.writeText(acceptUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      reset()
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share {resourceType}</DialogTitle>
          <DialogDescription>Invite someone to collaborate on this {resourceType}.</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <DialogBody className="space-y-4">
            {/* Existing collaborators */}
            {collaborators.length > 0 && (
              <div className="space-y-1.5">
                <Label>Current collaborators</Label>
                <div className="divide-y rounded-md border">
                  {collaborators.map(c => (
                    <div key={c.id} className="flex items-center justify-between px-3 py-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm truncate">{c.email}</span>
                        <Badge variant="outline" className="text-xs capitalize">{c.scope}</Badge>
                        <Badge
                          variant="outline"
                          className={`text-xs capitalize ${c.status === 'accepted' ? 'text-green-700' : c.status === 'pending' ? 'text-yellow-700' : ''}`}
                        >
                          {c.status}
                        </Badge>
                      </div>
                      {onRevoke && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => onRevoke(c.id)}
                          title="Revoke access"
                        >
                          <Trash2Icon className="size-3.5 text-destructive" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="share-email">Recipient email</Label>
              <Input
                id="share-email"
                type="email"
                placeholder="colleague@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Permission</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SCOPE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Expires</Label>
              <Select value={expiry} onValueChange={setExpiry}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPIRY_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {status && (
              <p className={`text-xs ${status.type === 'success' ? 'text-green-600' : 'text-destructive'}`}>
                {status.message}
              </p>
            )}

            {acceptUrl && (
              <div className="space-y-1.5">
                <Label>Invitation link</Label>
                <div className="flex gap-2">
                  <Input value={acceptUrl} readOnly className="flex-1 text-xs" />
                  <Button type="button" variant="outline" size="icon" onClick={handleCopy}>
                    {copied ? <CheckIcon className="size-3.5" /> : <CopyIcon className="size-3.5" />}
                  </Button>
                </div>
              </div>
            )}
          </DialogBody>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => handleOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !email.trim()}>
              {loading ? <Loader2Icon className="size-4 animate-spin" /> : <SendIcon className="size-4" />}
              Send Invitation
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
