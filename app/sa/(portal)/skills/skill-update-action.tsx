'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { RefreshCwIcon, Loader2Icon } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SkillUpdateActionProps {
  skillId: string
  skillName: string
}

export function SkillUpdateAction({ skillId, skillName }: SkillUpdateActionProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  async function handleSubmit() {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        throw new Error('Not authenticated')
      }

      // Insert notification for SA team
      await supabase.from('notifications').insert({
        user_id: user.id,
        category: 'system',
        title: `Skill Update Requested: ${skillName}`,
        body: JSON.stringify({
          skill_id: skillId,
          reason: reason.trim() || 'No reason provided',
          requested_by: user.email ?? user.id,
        }),
      } as any)

      // Update skill maturity to 'update_requested'
      await (supabase
        .from('skill_nodes' as any)
        .update({ maturity: 'update_requested', updated_at: new Date().toISOString() })
        .eq('id', skillId) as any)

      setDone(true)
      setOpen(false)
      router.refresh()
    } catch (err) {
      console.error('Failed to request update:', err)
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <span className="text-xs text-muted-foreground">Requested</span>
    )
  }

  return (
    <>
      <Button size="sm" variant="ghost" onClick={() => setOpen(true)}>
        <RefreshCwIcon className="mr-1 h-3 w-3" />
        Update
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Request Update: {skillName}</DialogTitle>
            <DialogDescription>
              Flag this skill for review and content update.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Reason for update request (optional)…"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading && <Loader2Icon className="mr-1.5 h-4 w-4 animate-spin" />}
              Request Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
