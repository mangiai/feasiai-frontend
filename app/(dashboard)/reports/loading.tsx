import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function ReportsLoading() {
  return (
    <div className="space-y-8 pt-4">
      <div className="space-y-2">
        <Skeleton className="h-9 w-40 rounded-lg" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Skeleton className="h-10 max-w-md flex-1 rounded-lg" />
        <Skeleton className="h-10 w-full max-w-xl rounded-lg" />
      </div>
      <Card className="overflow-hidden border-border/60">
        <CardContent className="space-y-4 py-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <Skeleton className="h-4 flex-1" />
              <Skeleton className="h-6 w-24" />
              <Skeleton className="h-6 w-20" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
