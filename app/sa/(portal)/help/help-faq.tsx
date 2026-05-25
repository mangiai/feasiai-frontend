'use client'

import { useState } from 'react'
import { ChevronDownIcon } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'

const FAQ_ITEMS = [
  {
    question: 'How to reset a project?',
    answer:
      'Navigate to the project in the Pipeline page, cancel any running pipeline runs, then go to the project settings. Use the "Reset Project" action to clear all generated reports and pipeline data. The uploaded files will be preserved.',
  },
  {
    question: 'How to adjust credits?',
    answer:
      'Go to the Billing page in the SA portal. Find the workspace in the Billing Accounts table and click the "Adjust" button. Enter a positive amount to add credits or a negative amount to deduct. Always provide a reason for the adjustment — it will be logged in the credit ledger.',
  },
  {
    question: 'How to verify a report?',
    answer:
      'Go to the Reviews page and find the report in the Pending tab. Click "Approve" to verify, "Revisions" to request changes, or "Reject" to deny. You can also click the report title to view its full content before making a decision.',
  },
  {
    question: 'How to regenerate a feasibility report?',
    answer:
      'Open the report from Reports or Reviews. Use the "Regenerate feasibility" panel to re-run the pipeline with preserved zone/lot/tier inputs. The current report is snapshotted as a version first; when the run finishes, the same report row is updated with the new output (pipeline output versions are listed separately).',
  },
  {
    question: 'How do I add a new super admin?',
    answer:
      'Super admin roles are assigned via the profiles table in Supabase. Set the system_role field to "super_admin" for the target user. Only existing super admins with database access can perform this operation.',
  },
  {
    question: 'How do pipeline credits work?',
    answer:
      'Each pipeline run consumes credits based on its flow type. Credits are deducted when a run starts. If a generation fails (not cancelled by you), FeasiAI credits charged for that project are refunded automatically. If workspace credits are too low, the run may continue on free OpenRouter models with a notice in the UI. Purchase credits are added via Stripe checkout or manual SA adjustment.',
  },
]

export function HelpFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(null)

  return (
    <div className="space-y-2">
      {FAQ_ITEMS.map((item, i) => (
        <Collapsible key={i} open={openIndex === i} onOpenChange={(open) => setOpenIndex(open ? i : null)}>
          <CollapsibleTrigger className="flex w-full items-center justify-between rounded-md border border-border px-4 py-3 text-sm font-medium hover:bg-muted/50 transition-colors">
            {item.question}
            <ChevronDownIcon className={`h-4 w-4 text-muted-foreground transition-transform ${openIndex === i ? 'rotate-180' : ''}`} />
          </CollapsibleTrigger>
          <CollapsibleContent className="px-4 py-3 text-sm text-muted-foreground">
            {item.answer}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  )
}
