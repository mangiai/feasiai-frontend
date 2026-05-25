'use client'

import { useRouter } from 'next/navigation'

const TABS = [
  { key: 'pending', label: 'Pending' },
  { key: 'in_progress', label: 'In Progress' },
  { key: 'verified', label: 'Completed' },
  { key: 'rejected', label: 'Rejected' },
] as const

export function ReviewTabs({ active }: { active: string }) {
  const router = useRouter()

  return (
    <div className="flex flex-wrap gap-2">
      {TABS.map((tab) => (
        <button
          key={tab.key}
          type="button"
          onClick={() => router.push(`/sa/reviews?tab=${tab.key}`)}
          className={`rounded-full border px-3 py-1.5 text-sm transition-all duration-200 ${
            active === tab.key
              ? 'border-primary/25 bg-gradient-to-r from-primary/14 via-primary/8 to-secondary/12 text-foreground shadow-[0_8px_20px_-18px_hsl(var(--primary)/0.55)]'
              : 'border-border/80 bg-background text-muted-foreground hover:border-primary/30 hover:bg-accent/70 hover:text-foreground'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
