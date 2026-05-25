'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { LockIcon, UnlockIcon, Loader2Icon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { lockWorkspace, unlockWorkspace } from './actions'

interface LockWorkspaceButtonProps {
  workspaceId: string
  isLocked: boolean
}

export function LockWorkspaceButton({ workspaceId, isLocked }: LockWorkspaceButtonProps) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const handleToggle = () => {
    startTransition(async () => {
      if (isLocked) {
        await unlockWorkspace(workspaceId)
      } else {
        await lockWorkspace(workspaceId)
      }
      router.refresh()
    })
  }

  return (
    <Button
      variant={isLocked ? 'outline' : 'destructive'}
      size="sm"
      onClick={handleToggle}
      disabled={isPending}
      className="gap-1.5 shrink-0"
    >
      {isPending ? (
        <Loader2Icon className="w-3.5 h-3.5 animate-spin" />
      ) : isLocked ? (
        <UnlockIcon className="w-3.5 h-3.5" />
      ) : (
        <LockIcon className="w-3.5 h-3.5" />
      )}
      {isPending ? 'Updating…' : isLocked ? 'Unlock Workspace' : 'Lock Workspace'}
    </Button>
  )
}
