'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  ReportVerificationDialog,
  type VerificationAction,
} from '@/components/report-verification-dialog'
import { CheckCircleIcon, XCircleIcon, RotateCcwIcon, MoreHorizontalIcon } from 'lucide-react'

interface ReviewActionsProps {
  reportId: string
}

export function ReviewActions({ reportId }: ReviewActionsProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogAction, setDialogAction] = useState<VerificationAction | null>(null)

  function openVerification(action: VerificationAction) {
    setDialogAction(action)
    setDialogOpen(true)
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            size="icon-sm"
            variant="outline"
            className="border-primary/15 bg-background/80 hover:bg-primary/10"
            aria-label="Open review actions"
          >
            <MoreHorizontalIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Review decision</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => openVerification('approved')}>
            <CheckCircleIcon className="text-emerald-600 dark:text-emerald-400" />
            Approve report
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openVerification('revisions_requested')}>
            <RotateCcwIcon className="text-amber-600 dark:text-amber-400" />
            Request revisions
          </DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onSelect={() => openVerification('rejected')}>
            <XCircleIcon />
            Reject report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ReportVerificationDialog
        reportId={reportId}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        action={dialogAction}
      />
    </>
  )
}
