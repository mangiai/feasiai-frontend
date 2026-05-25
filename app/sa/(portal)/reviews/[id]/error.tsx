'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'

export default function ReviewError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])
  const router = useRouter()

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertCircleIcon className="w-12 h-12 text-destructive" />
      <h2 className="text-lg font-semibold">Review not available</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'This review could not be loaded.'}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={() => router.back()} variant="outline" size="sm">
          <ArrowLeftIcon className="w-4 h-4 mr-1" />
          Go back
        </Button>
        <Button onClick={reset} variant="outline" size="sm">Try again</Button>
        <Button asChild variant="default" size="sm">
          <Link href="/sa/reviews">All Reviews</Link>
        </Button>
      </div>
    </div>
  )
}
