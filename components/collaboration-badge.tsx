'use client'

import { Badge } from '@/components/ui/badge'
import { EyeIcon, MessageSquareIcon, PencilIcon } from 'lucide-react'

const scopeConfig = {
  view: {
    label: 'View only',
    className: 'bg-blue-500/10 text-blue-700 border-blue-500/20',
    icon: EyeIcon,
  },
  comment: {
    label: 'Can comment',
    className: 'bg-yellow-500/10 text-yellow-700 border-yellow-500/20',
    icon: MessageSquareIcon,
  },
  edit: {
    label: 'Can edit',
    className: 'bg-green-500/10 text-green-700 border-green-500/20',
    icon: PencilIcon,
  },
} as const

interface CollaborationBadgeProps {
  scope: 'view' | 'comment' | 'edit'
}

export function CollaborationBadge({ scope }: CollaborationBadgeProps) {
  const config = scopeConfig[scope]
  const Icon = config.icon

  return (
    <Badge variant="outline" className={config.className}>
      <Icon className="size-3" />
      {config.label}
    </Badge>
  )
}
