'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { resolveOtpRedirect, type OtpType } from '@/lib/auth/otp-redirect'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircleIcon, Loader2Icon } from 'lucide-react'

function AuthCodeInner() {
  const router = useRouter()
  const sp = useSearchParams()
  const supabase = useMemo(() => createClient(), [])

  const initialEmail = sp.get('email') || ''
  const typeParam = (sp.get('type') || sp.get('otp_type') || '').toLowerCase()
  const redirectToParam = sp.get('redirect_to') || sp.get('redirectTo') || sp.get('next') || ''

  const type: OtpType | null =
    typeParam === 'invite' || typeParam === 'magiclink' || typeParam === 'recovery' || typeParam === 'email' || typeParam === 'email_change'
      ? (typeParam as OtpType)
      : null

  const [email, setEmail] = useState(initialEmail)
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleVerify() {
    setError(null)
    const e = email.trim()
    const c = code.trim()

    if (!type) {
      setError('This link is missing the verification type. Request a new email and try again.')
      return
    }
    if (!e || !e.includes('@')) {
      setError('Enter the email address you received the code on.')
      return
    }
    const normalizedCode = c.replace(/[^0-9]/g, '')
    if (normalizedCode.length < 6 || normalizedCode.length > 10) {
      setError('Enter the verification code from your email (usually 6–8 digits).')
      return
    }

    setLoading(true)
    try {
      const { error: verifyErr } = await supabase.auth.verifyOtp({
        email: e,
        token: normalizedCode,
        type,
      })
      if (verifyErr) throw verifyErr

      const { data: userData } = await supabase.auth.getUser()
      const next = resolveOtpRedirect({
        type,
        redirectToParam,
        currentOrigin: typeof window !== 'undefined' ? window.location.origin : undefined,
        userMetadata: userData.user?.user_metadata,
      })
      router.replace(next)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
      <Card className="w-full max-w-md shadow-card border-border/50 animate-fade-up">
        <CardContent className="pt-8 pb-6 px-6 space-y-5">
          <div className="space-y-2 text-center">
            <h1 className="text-xl font-bold text-foreground tracking-tight">Enter your code</h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Some email providers consume one-time links automatically. This code method is more reliable.
            </p>
          </div>

          {error ? (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : null}

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="email">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                autoComplete="email"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground" htmlFor="code">
                Verification code
              </label>
              <Input
                id="code"
                inputMode="numeric"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\s/g, ''))}
                placeholder="12345678"
                autoComplete="one-time-code"
              />
            </div>

            <Button className="w-full h-11 font-semibold" onClick={handleVerify} disabled={loading}>
              {loading ? <Loader2Icon className="w-4 h-4 animate-spin mr-2" /> : null}
              Verify
            </Button>

            <div className="text-center">
              <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                Back to home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AuthCodePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center p-4 bg-grid-pattern">
          <div className="text-sm text-muted-foreground">Loading…</div>
        </div>
      }
    >
      <AuthCodeInner />
    </Suspense>
  )
}

