'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'

export default function SharedReportError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="flex flex-col items-center gap-4 px-4">
        <AlertCircleIcon className="w-12 h-12 text-destructive" />
        <h2 className="text-lg font-semibold">Report unavailable</h2>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          This shared report could not be loaded. The link may be invalid or expired.
        </p>
        <div className="flex items-center gap-3">
          <Button onClick={reset} variant="outline" size="sm">Try again</Button>
          <Button asChild variant="default" size="sm">
            <Link href="/">Home</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
