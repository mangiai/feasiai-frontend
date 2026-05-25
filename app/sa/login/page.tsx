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

export default function SuperAdminLoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (authError) throw authError
      if (!data.user) throw new Error('Authentication failed')

      // Verify super_admin role
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('system_role')
        .eq('id', data.user.id)
        .single()

      if (profileError || profile?.system_role !== 'super_admin') {
        await supabase.auth.signOut()
        throw new Error('Access denied. Super admin credentials required.')
      }

      router.push('/sa')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dark min-h-screen flex flex-col items-center justify-center p-4 bg-background bg-grid-pattern">
      {/* Back to main app */}
      <Link
        href="/login"
        className="absolute top-4 left-4 sm:top-6 sm:left-6 flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors z-10"
      >
        <ArrowLeftIcon className="w-3.5 h-3.5" />
        Main Login
      </Link>

      {/* Theme Toggle */}
      <div className="absolute top-4 right-4 sm:top-6 sm:right-6 z-10">
        <ThemeToggle className="text-muted-foreground hover:text-foreground hover:bg-foreground/5" />
      </div>

      <Card className="relative z-10 w-full max-w-[400px] shadow-elevated border-border/50 animate-fade-up overflow-hidden">
        {/* Branded header strip */}
        <div className="relative px-6 pt-8 pb-6 bg-gradient-to-b from-primary/8 to-transparent">
          <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary via-secondary to-primary" />
          <div className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="relative">
                <div className="absolute -inset-3 rounded-full bg-secondary/10 blur-lg" />
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
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-secondary">
                  Admin Portal
                </span>
              </div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight font-display">
                FeasiAI
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Back Office &middot; FeasiAI
              </p>
            </div>
          </div>
        </div>

        <CardContent className="px-6 pb-6 pt-2 space-y-5">
          {/* Error banner */}
          {error && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
              <AlertCircleIcon className="w-4 h-4 text-destructive mt-0.5 flex-shrink-0" />
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          {/* Login form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="sa-email" className="text-sm font-medium text-foreground">
                Email
              </label>
              <Input
                id="sa-email"
                type="email"
                placeholder="admin@feasiai.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="sa-password" className="text-sm font-medium text-foreground">
                Password
              </label>
              <Input
                id="sa-password"
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
              className="w-full font-semibold mt-1 bg-secondary hover:bg-secondary/90 text-secondary-foreground"
              size="lg"
            >
              {loading ? (
                <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
              ) : (
                <LockKeyholeIcon className="w-4 h-4 mr-1.5" />
              )}
              {loading ? 'Verifying access...' : 'Sign in to Back Office'}
            </Button>
          </form>

          {/* Footer */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground/70">
              <LockKeyholeIcon className="w-3 h-3" />
              <span>Authorized personnel only</span>
              <span className="text-border">&middot;</span>
              <span>All access is logged</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
