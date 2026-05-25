'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { AlertCircleIcon } from 'lucide-react'

export default function AuthError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error(error) }, [error])

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <AlertCircleIcon className="w-12 h-12 text-destructive" />
      <h2 className="text-lg font-semibold">Something went wrong</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        {error.message || 'An error occurred during authentication.'}
      </p>
      <div className="flex items-center gap-3">
        <Button onClick={reset} variant="outline" size="sm">Try again</Button>
        <Button asChild variant="default" size="sm">
          <Link href="/login">Back to login</Link>
        </Button>
      </div>
    </div>
  )
}
