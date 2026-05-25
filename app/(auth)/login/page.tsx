'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { buildAuthCallbackUrl, sanitizeRedirectPath } from '@/lib/auth/redirects'
import { signInWithGoogleOAuth } from '@/lib/auth/google-oauth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { Loader2Icon, LogInIcon, AlertCircleIcon, ArrowLeftIcon } from 'lucide-react'

function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resetSent, setResetSent] = useState(false)
  const [resendingConfirmation, setResendingConfirmation] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))
  const urlError = searchParams.get('error')

  const signupHref = useMemo(() => {
    const qp = new URLSearchParams()
    if (redirectTo !== '/dashboard') qp.set('redirect', redirectTo)
    const e = email.trim() || searchParams.get('email')
    if (e) qp.set('email', e.trim())
    const qs = qp.toString()
    return qs ? `/signup?${qs}` : '/signup'
  }, [redirectTo, email, searchParams])

  useEffect(() => {
    const qp = searchParams.get('email')
    if (!qp) return
    try {
      setEmail(decodeURIComponent(qp.replace(/\+/g, '%20')))
    } catch {
      setEmail(qp)
    }
  }, [searchParams])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setResetSent(false)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      router.push(redirectTo)
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Sign in failed'
      if (msg.toLowerCase().includes('email not confirmed')) {
        setError('Please check your email and confirm your account before signing in.')
      } else {
        setError(msg)
      }
    } finally {
      setLoading(false)
    }
  }

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError('Please enter your email address first')
      return
    }
    setError(null)
    setResetSent(false)
    setLoading(true)
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: buildAuthCallbackUrl('/settings'),
      })
      if (error) throw error
      setResetSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email')
    } finally {
      setLoading(false)
    }
  }

  const handleResendConfirmation = async () => {
    setResendingConfirmation(true)
    try {
      const { error } = await supabase.auth.resend({ type: 'signup', email })
      if (error) throw error
      setError(null)
      setResetSent(false)
      setError('Confirmation email resent. Please check your inbox.')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend confirmation')
    } finally {
      setResendingConfirmation(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await signInWithGoogleOAuth(supabase, redirectTo)
    if (error) setError(error.message)
  }

  const displayError = error || (urlError === 'auth_callback_failed' ? 'Authentication failed. Please try again.' : null)

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
      {/* Back to home */}
      <Link
        href="/"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Home
      </Link>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-foreground/5" />
      </div>

      <Card className="relative z-10 w-full max-w-sm shadow-card border-border/50 animate-fade-up">
        <CardContent className="pt-8 pb-6 px-6 space-y-6">
          {/* Logo + branding */}
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={48} height={48} priority />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Sign in to FeasiAI</h1>
              <p className="text-sm text-muted-foreground mt-1">
                AI-Powered Permit Review by FeasiAI
              </p>
            </div>
          </div>

          {/* Success banner */}
          {resetSent && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-green-500/5 border border-green-500/20">
              <p className="text-sm text-green-600">Password reset email sent. Check your inbox.</p>
            </div>
          )}

          {/* Error banner */}
          {displayError && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <div className="space-y-1">
                <p className="text-sm text-destructive">{displayError}</p>
                {displayError.includes('confirm your account') && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline font-medium"
                    onClick={handleResendConfirmation}
                    disabled={resendingConfirmation}
                  >
                    {resendingConfirmation ? 'Resending...' : 'Resend confirmation email'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Google OAuth */}
          <GoogleAuthButton onClick={handleGoogleSignIn} />

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-2 text-muted-foreground">or</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-1.5">
              <label htmlFor="email" className="text-sm font-medium text-foreground">Email</label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-medium text-foreground">Password</label>
              <Input
                id="password"
                type="password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                className="text-xs text-muted-foreground hover:text-primary transition-colors"
                onClick={handleForgotPassword}
                disabled={loading}
              >
                Forgot password?
              </button>
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold mt-1"
              size="lg"
            >
              {loading ? (
                <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <LogInIcon className="w-4 h-4 mr-1.5" />
              )}
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          {/* Footer link */}
          <p className="text-center text-xs text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link href={signupHref} className="text-primary hover:underline font-medium">
              Create account
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
