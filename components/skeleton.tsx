import { cn } from '@/lib/utils'

interface SkeletonBlockProps {
  className?: string
}

export function SkeletonBlock({ className }: SkeletonBlockProps) {
  return <div className={cn('skeleton', className)} />
}

export function SkeletonText({ className }: SkeletonBlockProps) {
  return <div className={cn('skeleton skeleton-text', className)} />
}

/** Card-shaped skeleton matching project card layout */
export function SkeletonCard() {
  return (
    <div className="rounded-lg border border-border bg-card p-5 space-y-3">
      <div className="flex items-center gap-3">
        <SkeletonBlock className="w-10 h-10 rounded-lg" />
        <div className="flex-1 space-y-2">
          <SkeletonText className="skeleton-text--sm" />
          <SkeletonText className="skeleton-text--xs" />
        </div>
      </div>
      <SkeletonText />
      <SkeletonText className="skeleton-text--sm" />
    </div>
  )
}

/** List of skeleton cards for loading states */
export function SkeletonList({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  )
}
