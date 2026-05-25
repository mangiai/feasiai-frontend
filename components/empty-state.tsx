import { Button } from '@/components/ui/button'
import { InboxIcon } from 'lucide-react'
import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description: string
  actionLabel?: string
  actionHref?: string
  onAction?: () => void
}

export function EmptyState({
  icon: Icon = InboxIcon,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
}: EmptyStateProps) {
  return (
    <div role="status" className="empty-state animate-fade-in">
      <Icon className="empty-state__icon" />
      <p className="empty-state__title">{title}</p>
      <p className="empty-state__description">{description}</p>
      {actionLabel && (
        actionHref ? (
          <Link href={actionHref}>
            <Button size="sm">{actionLabel}</Button>
          </Link>
        ) : onAction ? (
          <Button size="sm" onClick={onAction}>{actionLabel}</Button>
        ) : null
      )}
    </div>
  )
}
