'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { AlertCircleIcon, ExternalLinkIcon } from 'lucide-react'

function AuthConfirmBridgeInner() {
  const sp = useSearchParams()
  const confirmationUrl = sp.get('confirmation_url') || sp.get('confirmationUrl') || ''

  const safeUrl =
    confirmationUrl.startsWith('https://') || confirmationUrl.startsWith('http://')
      ? confirmationUrl
      : ''

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
      <Card className="w-full max-w-md shadow-card border-border/50 animate-fade-up">
        <CardContent className="pt-8 pb-6 px-6 space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Confirm on FeasiAI</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              For security, email providers sometimes open links automatically. Click the button below to finish.
            </p>
          </div>

          {!safeUrl ? (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-destructive font-medium">This link is missing confirmation details.</p>
                <p className="text-xs text-muted-foreground">
                  Please go back to the email and click the button again, or request a new email.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                type="button"
                className="w-full h-11 font-semibold"
                onClick={() => {
                  // Avoid rendering the one-time Supabase URL as an <a href="...">.
                  // Some security scanners prefetch links from fetched pages, which can consume OTP links.
                  window.location.assign(safeUrl)
                }}
              >
                Continue
                <ExternalLinkIcon className="w-4 h-4 ml-2" />
              </Button>
              <p className="text-xs text-muted-foreground text-center">
                If you keep seeing “expired”, request a fresh email and try again.
              </p>
            </div>
          )}

          <div className="pt-1 text-center">
            <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Back to home
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthConfirmBridgePage() {
  // Next.js requires Suspense when using useSearchParams() in App Router pages.
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <AuthConfirmBridgeInner />
    </Suspense>
  )
}

