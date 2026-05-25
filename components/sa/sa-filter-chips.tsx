import type { ReactNode } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

export const saFilterChipBase =
  'inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200'

export const saFilterChipInactive =
  'border-border/80 bg-background/80 text-muted-foreground hover:border-primary/30 hover:bg-primary/5 hover:text-foreground'

export const saFilterChipActive =
  'border-primary/30 bg-gradient-to-r from-primary via-primary/90 to-secondary text-primary-foreground shadow-[0_8px_20px_-18px_hsl(var(--primary)/0.55)]'

export function SAFilterChipLink({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: ReactNode
}) {
  return (
    <Link
      href={href}
      className={cn(saFilterChipBase, active ? saFilterChipActive : saFilterChipInactive)}
    >
      {children}
    </Link>
  )
}

export function SAFilterSection({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-secondary">{label}</p>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  )
}
