import { SparklesIcon } from 'lucide-react'

interface FreeModelBannerProps {
  className?: string
}

export function FreeModelBanner({ className = '' }: FreeModelBannerProps) {
  return (
    <div
      className={`rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:p-5 ${className}`.trim()}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
          <SparklesIcon className="h-4 w-4 text-amber-600" />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-semibold text-foreground">
            Using free model generation
          </p>
          <p className="text-sm text-muted-foreground">
            This run uses OpenRouter&apos;s free models because workspace credits are low or paid
            models were unavailable. Results may take longer and quality can vary.
          </p>
        </div>
      </div>
    </div>
  )
}
