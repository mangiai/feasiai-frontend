'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { GoogleAuthButton } from '@/components/auth/google-auth-button'
import { buildAuthCallbackUrl, buildOnboardingPath, sanitizeRedirectPath } from '@/lib/auth/redirects'
import { signInWithGoogleOAuth } from '@/lib/auth/google-oauth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { Loader2Icon, ArrowLeftIcon, AlertCircleIcon, UserPlusIcon } from 'lucide-react'

function SignupForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [confirmationPending, setConfirmationPending] = useState(false)

  const getPasswordStrength = (pw: string): { label: string; color: string; width: string } => {
    if (pw.length === 0) return { label: '', color: '', width: '0%' }
    const hasLetters = /[a-zA-Z]/.test(pw)
    const hasNumbers = /[0-9]/.test(pw)
    const hasSymbols = /[^a-zA-Z0-9]/.test(pw)
    if (pw.length >= 8 && hasLetters && hasNumbers && hasSymbols)
      return { label: 'Strong', color: 'bg-green-500', width: '100%' }
    if (pw.length >= 8 && hasLetters && hasNumbers)
      return { label: 'Fair', color: 'bg-yellow-500', width: '66%' }
    return { label: 'Weak', color: 'bg-red-500', width: '33%' }
  }
  const passwordStrength = getPasswordStrength(password)
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()

  const referralCode = searchParams.get('ref')
  const refError = searchParams.get('ref_error')
  const redirectTo = sanitizeRedirectPath(searchParams.get('redirect'))
  const loginHref = useMemo(() => {
    const qp = new URLSearchParams()
    if (redirectTo !== '/dashboard') qp.set('redirect', redirectTo)
    const e = email.trim() || searchParams.get('email')
    if (e) qp.set('email', e.trim())
    const qs = qp.toString()
    return qs ? `/login?${qs}` : '/login'
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

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: buildAuthCallbackUrl(redirectTo),
          data: {
            ...(referralCode ? { referral_code: referralCode } : {}),
          },
        },
      })
      if (error) throw error

      // If email confirmation is disabled, go straight to onboarding
      const { data: { user } } = await supabase.auth.getUser()
      if (user && user.confirmed_at) {
        if (redirectTo.startsWith('/invite/')) {
          router.push(redirectTo)
        } else {
          router.push(buildOnboardingPath(redirectTo))
        }
        router.refresh()
      } else if (user && !user.confirmed_at) {
        setConfirmationPending(true)
      } else {
        setSuccess(true)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign up failed')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setError(null)
    const { error } = await signInWithGoogleOAuth(supabase, redirectTo)
    if (error) setError(error.message)
  }

  if (success || confirmationPending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
        <Card className="w-full max-w-sm shadow-card border-border/50 animate-fade-up">
          <CardContent className="pt-8 pb-6 px-6 space-y-4 text-center">
            <div className="flex justify-center">
              <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={48} height={48} priority />
            </div>
            <h1 className="text-xl font-bold text-foreground">Check your email to confirm your account</h1>
            <p className="text-sm text-muted-foreground">
              We sent a confirmation link to <strong className="text-foreground">{email}</strong>.
              Click the link to activate your account.
            </p>
            <Link href={loginHref} className="text-sm text-primary hover:underline font-medium">
              Back to sign in
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
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
          <div className="text-center space-y-3">
            <div className="flex justify-center">
              <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={48} height={48} priority />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">Create your account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Start with platform access and Stripe-backed report billing
              </p>
            </div>
          </div>

          {refError === 'invalid' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
              <AlertCircleIcon className="w-4 h-4 text-yellow-600 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-400">The referral link you used is no longer valid, but you can still sign up!</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
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

          <form onSubmit={handleSignup} className="space-y-3">
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
                placeholder="Min 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="new-password"
                minLength={8}
              />
              {password.length > 0 && (
                <div className="space-y-1 mt-1.5">
                  <div className="h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full ${passwordStrength.color} transition-all duration-300 rounded-full`}
                      style={{ width: passwordStrength.width }}
                    />
                  </div>
                  <p className={`text-xs ${
                    passwordStrength.label === 'Strong' ? 'text-green-600' :
                    passwordStrength.label === 'Fair' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {passwordStrength.label}
                  </p>
                </div>
              )}
            </div>
            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">Confirm password</label>
              <Input
                id="confirm-password"
                type="password"
                placeholder="Confirm your password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full font-semibold mt-1" size="lg">
              {loading ? (
                <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <UserPlusIcon className="w-4 h-4 mr-1.5" />
              )}
              {loading ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            Already have an account?{' '}
            <Link href={loginHref} className="text-primary hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
