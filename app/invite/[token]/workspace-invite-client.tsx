'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'
import { Loader2, CheckCircle2, AlertCircle, UsersRoundIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type Status = 'checking' | 'accepting' | 'done' | 'error' | 'login'

/** Invite flow styled to match the marketing site: grid, glows, glass card, orange CTAs. */
export function WorkspaceInviteClient({ token }: { token: string }) {
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const supabase = createClient()
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null)

  const trimmed = token?.trim() ?? ''

  const [status, setStatus] = useState<Status>(() => (trimmed ? 'checking' : 'error'))
  const [message, setMessage] = useState<string | null>(() => (trimmed ? null : 'This invite link is invalid or incomplete.'))

  const inviteReturnPath = useMemo(
    () => `/invite/${encodeURIComponent(trimmed)}`,
    [trimmed],
  )

  const signupUrl = useMemo(() => {
    const q = new URLSearchParams()
    q.set('redirect', inviteReturnPath)
    if (invitedEmail) q.set('email', invitedEmail)
    return `/signup?${q.toString()}`
  }, [inviteReturnPath, invitedEmail])

  const loginUrl = useMemo(() => {
    const q = new URLSearchParams()
    q.set('redirect', inviteReturnPath)
    if (invitedEmail) q.set('email', invitedEmail)
    return `/login?${q.toString()}`
  }, [inviteReturnPath, invitedEmail])

  useEffect(() => {
    if (!trimmed) {
      return
    }

    let cancelled = false

    async function run() {
      const { data: { user } } = await supabase.auth.getUser()
      if (cancelled) return

      if (user) {
        setStatus('accepting')
        const res = await fetch(`/api/invitations/${encodeURIComponent(trimmed)}/accept`, {
          method: 'POST',
        })
        if (cancelled) return
        if (res.ok) {
          setStatus('done')
          setTimeout(() => router.push('/dashboard'), 1200)
        } else {
          const data = await res.json().catch(() => ({}))
          setMessage(data?.error || 'Failed to accept invitation.')
          setStatus('error')
        }
        return
      }

      try {
        const res = await fetch(`/api/invitations/${encodeURIComponent(trimmed)}/preview`)
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (!cancelled && data?.email) setInvitedEmail(String(data.email).trim())
        }
      } catch {
        /* preview optional */
      }

      if (!cancelled) setStatus('login')
    }

    run()
    return () => {
      cancelled = true
    }
  }, [trimmed, router, supabase])

  const showDone = trimmed && status === 'done'
  const showErr = trimmed && status === 'error' && message
  const invalidLink = !trimmed && status === 'error'

  const isDark = resolvedTheme === 'dark'

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground antialiased">
      <SiteHeader forceReadable />

      <div className="relative isolate pt-20 pb-16 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div
            className="absolute -left-[10%] -top-[10%] h-[min(800px,90vw)] w-[min(800px,90vw)] rounded-full blur-3xl opacity-50"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(245,130,32,0.14) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(245,130,32,0.1) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute -bottom-[10%] -right-[5%] h-[min(600px,80vw)] w-[min(600px,80vw)] rounded-full blur-3xl opacity-50"
            style={{
              background: isDark
                ? 'radial-gradient(circle, rgba(139,92,246,0.12) 0%, transparent 60%)'
                : 'radial-gradient(circle, rgba(139,92,246,0.08) 0%, transparent 60%)',
            }}
          />
          <div
            className="absolute inset-0 opacity-[0.035] dark:opacity-[0.04]"
            style={{
              backgroundImage:
                'linear-gradient(to right, currentColor 1px, transparent 1px), linear-gradient(to bottom, currentColor 1px, transparent 1px)',
              backgroundSize: '80px 80px',
            }}
          />
        </div>

        <div className="relative z-10 mx-auto w-full max-w-lg px-4 sm:px-6">
          <div
            className={cn(
              'overflow-hidden rounded-2xl border border-foreground/[0.10]',
              'bg-foreground/[0.04] backdrop-blur-xl',
              'shadow-[0_8px_40px_rgba(0,0,0,0.08)] dark:shadow-[0_8px_40px_rgba(0,0,0,0.35)]',
            )}
          >
            <div className="px-6 py-8 sm:px-8 sm:py-10">
              {trimmed ? (
                <>
                  <Badge
                    variant="outline"
                    className="mb-5 border-secondary/20 bg-secondary/[0.06] text-secondary text-xs font-medium tracking-wide"
                  >
                    <UsersRoundIcon className="mr-1.5 h-3 w-3" aria-hidden />
                    Team workspace
                  </Badge>

                  <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight sm:text-3xl">
                    You&apos;re invited to{' '}
                    <span className="bg-gradient-to-r from-secondary via-amber-400 to-violet-400 bg-clip-text text-transparent">
                      collaborate
                    </span>
                  </h1>
                </>
              ) : (
                <h1 className="text-2xl font-extrabold tracking-tight text-foreground leading-tight sm:text-3xl">
                  Invite link{' '}
                  <span className="bg-gradient-to-r from-secondary via-amber-400 to-violet-400 bg-clip-text text-transparent">
                    issue
                  </span>
                </h1>
              )}

              {!trimmed && status === 'checking' && (
                <div className="mt-10 flex flex-col items-center gap-5 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary" aria-hidden />
                  <p className="text-center text-sm text-foreground/55">Checking this link…</p>
                </div>
              )}

              {status === 'checking' && trimmed && (
                <div className="mt-10 flex flex-col items-center gap-5 py-6">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary" aria-hidden />
                  <p className="text-center text-sm text-foreground/55">Checking your session…</p>
                </div>
              )}

              {status === 'login' && trimmed && (
                <>
                  <p className="mt-4 text-sm leading-relaxed text-foreground/55">
                    To join this workspace, log in or create an account using the{' '}
                    <strong className="font-semibold text-foreground/80">same email address</strong>{' '}
                    this invitation was sent to — then we&apos;ll add you automatically.
                  </p>
                  {invitedEmail && (
                    <p className="mt-4 rounded-xl border border-foreground/10 bg-foreground/[0.04] px-4 py-3 text-center text-sm text-foreground/70">
                      Invited email:{' '}
                      <span className="font-mono font-medium text-foreground">{invitedEmail}</span>
                    </p>
                  )}
                  <div className="mt-8 flex flex-col gap-3">
                    <Button
                      className={cn(
                        'h-12 w-full rounded-xl font-semibold bg-secondary text-white',
                        'shadow-[0_0_32px_rgba(245,130,32,0.28)] hover:bg-secondary/90',
                        'hover:shadow-[0_0_48px_rgba(245,130,32,0.42)] transition-all duration-300',
                      )}
                      onClick={() => router.push(signupUrl)}
                    >
                      Create account &amp; join workspace
                    </Button>
                    <Button
                      variant="outline"
                      className={cn(
                        'h-12 w-full rounded-xl border-foreground/10 font-semibold text-foreground/70',
                        'hover:bg-foreground/[0.06] hover:text-foreground',
                      )}
                      onClick={() => router.push(loginUrl)}
                    >
                      I already have an account — sign in
                    </Button>
                  </div>
                </>
              )}

              {status === 'accepting' && trimmed && (
                <div className="mt-10 flex flex-col items-center gap-5 py-8">
                  <Loader2 className="h-10 w-10 animate-spin text-secondary" aria-hidden />
                  <p className="text-center text-sm text-foreground/55">Adding you to the workspace…</p>
                </div>
              )}

              {showDone && (
                <div className="mt-8 flex flex-col items-center gap-4 py-4">
                  <CheckCircle2 className="h-12 w-12 text-emerald-500" aria-hidden />
                  <p className="text-center text-sm font-medium text-foreground">
                    You&apos;re in — invitation accepted.
                  </p>
                  <p className="text-center text-xs text-foreground/45">Taking you to your dashboard…</p>
                </div>
              )}

              {invalidLink && (
                <div className="mt-8 flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                  <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                  <p className="text-sm text-destructive">{message}</p>
                </div>
              )}

              {showErr && (
                <div className="mt-8 space-y-6">
                  <div className="flex gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden />
                    <p className="text-sm text-destructive">{message}</p>
                  </div>
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <Button
                      variant="outline"
                      className={cn(
                        'h-11 flex-1 rounded-xl border-foreground/10 text-foreground/80',
                        'hover:bg-foreground/[0.06]',
                      )}
                      onClick={() => router.refresh()}
                    >
                      Try again
                    </Button>
                    <Button
                      className={cn(
                        'h-11 flex-1 rounded-xl font-semibold bg-secondary text-white',
                        'shadow-[0_0_24px_rgba(245,130,32,0.25)] hover:bg-secondary/90',
                      )}
                      onClick={() => router.push('/dashboard')}
                    >
                      Go to dashboard
                    </Button>
                  </div>
                </div>
              )}

              <p className="mt-8 text-xs leading-relaxed text-foreground/40">
                If you weren&apos;t expecting this invite, you can close this page or{' '}
                <a href="/contact" className="text-foreground/55 underline underline-offset-2 hover:text-foreground/75">
                  contact support
                </a>
                .
              </p>
            </div>

            <div className="border-t border-foreground/[0.08] px-6 py-5 sm:px-8">
              <p className="m-0 text-[12px] leading-relaxed text-foreground/40">
                FeasiAI Inc., 548 Market St, Suite 35435, San Francisco, CA 94104
              </p>
              <p className="mt-2 text-[12px] leading-relaxed text-foreground/40">
                You received this because you have an account on FeasiAI or were invited by a user.{' '}
                <a
                  href="/settings/notifications"
                  className="text-foreground/55 underline underline-offset-2 hover:text-foreground/75"
                >
                  Manage email preferences
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>

      <SiteFooter />
    </div>
  )
}
