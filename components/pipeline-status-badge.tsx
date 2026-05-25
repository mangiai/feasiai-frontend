import { Badge } from '@/components/ui/badge'
import type { Database } from '@/types/database'

type PipelineStatus = Database['public']['Enums']['pipeline_status']

const STATUS_MAP: Record<PipelineStatus, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  queued: { label: 'Queued', variant: 'outline' },
  running: { label: 'Running', variant: 'default' },
  awaiting_input: { label: 'Awaiting Input', variant: 'secondary' },
  paused_credits: { label: 'Paused (Credits)', variant: 'secondary' },
  paused_manual: { label: 'Paused', variant: 'secondary' },
  completed: { label: 'Completed', variant: 'secondary' },
  failed: { label: 'Failed', variant: 'destructive' },
  cancelled: { label: 'Cancelled', variant: 'outline' },
}

interface PipelineStatusBadgeProps {
  status: PipelineStatus
}

export function PipelineStatusBadge({ status }: PipelineStatusBadgeProps) {
  const config = STATUS_MAP[status] ?? { label: status, variant: 'outline' as const }
  return <Badge variant={config.variant}>{config.label}</Badge>
}
