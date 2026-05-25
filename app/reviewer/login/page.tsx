'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ThemeToggle } from '@/components/theme-toggle'
import { Loader2Icon, AlertCircleIcon, ArrowLeftIcon, LockKeyholeIcon } from 'lucide-react'

export default function ReviewerLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const supabase = createClient()
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Authentication failed')

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('system_role')
        .eq('id', data.user.id)
        .single()

      if (profileError || !['reviewer', 'super_admin'].includes(profile?.system_role ?? '')) {
        await supabase.auth.signOut()
        throw new Error('Access denied. Reviewer credentials required.')
      }

      router.push('/reviewer')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-background bg-grid-pattern">
      <Link
        href="/login"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Main Login
      </Link>

      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-foreground/5" />
      </div>

      <Card className="relative z-10 w-full max-w-[400px] shadow-elevated border-border/50 animate-fade-up overflow-hidden">
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-primary/8 to-transparent">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-600 via-emerald-400 to-emerald-600" />
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-primary/10 blur-lg" />
                <Image
                  src="/images/feasiai-icon.svg"
                  alt="FeasiAI"
                  width={56}
                  height={56}
                  className="relative"
                />
              </div>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-primary">
                  Reviewer Portal
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-display">
                FeasiAI
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Human-in-the-Loop Review
              </p>
            </div>
          </div>
        </div>

        <CardContent className="px-6 pb-6 pt-2 space-y-5">
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="reviewer-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="reviewer-email"
                type="email"
                placeholder="reviewer@feasiai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="reviewer-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="reviewer-password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full font-semibold mt-1 bg-primary hover:bg-primary/90 text-primary-foreground"
              size="lg"
            >
              {loading ? (
                <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <LockKeyholeIcon className="w-4 h-4 mr-1.5" />
              )}
              {loading ? 'Verifying access...' : 'Sign in to Review'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}

