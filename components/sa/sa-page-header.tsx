import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface SAPageHeaderProps {
  title: string
  icon: LucideIcon
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
}

export function SAPageHeader({ title, icon: Icon, subtitle, badge, actions }: SAPageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-center gap-2">
        <Icon className="h-6 w-6 text-primary" />
        <div>
          <p className="text-[11px] uppercase tracking-[0.18em] text-secondary">Back Office</p>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-semibold tracking-tight font-display">{title}</h1>
            {badge}
          </div>
          {subtitle ? <p className="text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
      </div>
      {actions}
    </div>
  )
}
