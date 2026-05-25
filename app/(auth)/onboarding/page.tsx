'use client'

import { Suspense, useState, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import { sanitizeRedirectPath } from '@/lib/auth/redirects'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Loader2Icon,
  ArrowRightIcon,
  ArrowLeftIcon,
  CheckCircle2Icon,
  UserIcon,
  BuildingIcon,
  HardHatIcon,
  GavelIcon,
  BarChart3Icon,
  SparklesIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProfessionType, AccountType } from '@/types/database'

type OnboardingStep = 'profile' | 'account-type' | 'workspace' | 'complete'

const STEPS: OnboardingStep[] = ['profile', 'account-type', 'workspace', 'complete']

const PROFESSION_OPTIONS: { value: ProfessionType; label: string; icon: typeof HardHatIcon; description: string }[] = [
  { value: 'contractor', label: 'Contractor', icon: HardHatIcon, description: 'Build ADUs and respond to corrections' },
  { value: 'architect', label: 'Architect / Designer', icon: BuildingIcon, description: 'Design ADU plans and navigate permits' },
  { value: 'property_owner', label: 'Homeowner', icon: UserIcon, description: 'Exploring ADU potential for your property' },
  { value: 'developer', label: 'Developer', icon: GavelIcon, description: 'Develop properties and manage permits' },
  { value: 'consultant', label: 'Consultant', icon: BarChart3Icon, description: 'Advise clients on ADU feasibility' },
  { value: 'other', label: 'Other', icon: SparklesIcon, description: 'Something else entirely' },
]

const ACCOUNT_OPTIONS: { value: AccountType; label: string; description: string }[] = [
  { value: 'individual', label: 'Personal account', description: 'For individual use — projects are just for you' },
  { value: 'company', label: 'Company / Team', description: 'Create a workspace to collaborate with your team' },
]

export default function OnboardingPage() {
  return (
    <Suspense fallback={<OnboardingLoadingState />}>
      <OnboardingContent />
    </Suspense>
  )
}

function OnboardingLoadingState() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
      <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

function OnboardingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const nextPath = sanitizeRedirectPath(searchParams.get('next'))

  const [authChecking, setAuthChecking] = useState(true)
  const [step, setStep] = useState<OnboardingStep>('profile')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        const loginHref = nextPath === '/dashboard'
          ? '/login'
          : `/login?redirect=${encodeURIComponent(nextPath)}`
        router.replace(loginHref)
        return
      }
      // Check if onboarding already completed
      const db = supabase as unknown as {
        from: (table: string) => {
          select: (cols: string) => { eq: (col: string, val: string) => { single: () => Promise<{ data: Record<string, unknown> | null }> } }
        }
      }
      const { data: profile } = await db.from('profiles').select('onboarding_status').eq('id', user.id).single()
      if (profile?.onboarding_status === 'completed') {
        router.replace(nextPath)
        return
      }
      setAuthChecking(false)
    }
    checkAuth()
  }, [nextPath, supabase, router])

  // Profile fields
  const [fullName, setFullName] = useState('')
  const [profession, setProfession] = useState<ProfessionType | null>(null)

  // Account type
  const [accountType, setAccountType] = useState<AccountType>('individual')

  // Workspace fields (only for company)
  const [companyName, setCompanyName] = useState('')

  const currentStepIndex = STEPS.indexOf(step)
  const progress = ((currentStepIndex + 1) / STEPS.length) * 100

  const goBack = useCallback(() => {
    const idx = STEPS.indexOf(step)
    if (idx > 0) {
      setStep(STEPS[idx - 1])
      setError(null)
    }
  }, [step])

  const handleProfileNext = useCallback(async () => {
    if (!fullName.trim()) {
      setError('Please enter your name')
      return
    }
    if (!profession) {
      setError('Please select your profession')
      return
    }
    setError(null)
    setStep('account-type')
  }, [fullName, profession])

  const handleComplete = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Use untyped calls for new public schema tables (types will resolve
      // correctly once Supabase generates types from the live database)
      const db = supabase as unknown as {
        from: (table: string) => {
          update: (values: Record<string, unknown>) => { eq: (col: string, val: string) => Promise<{ error: Error | null }> }
          select: (cols: string) => {
            eq: (col: string, val: string) => { eq: (col: string, val: string) => { limit: (n: number) => Promise<{ data: Record<string, string>[] | null }> } }
          }
        }
      }

      const { error: profileError } = await db
        .from('profiles')
        .update({
          full_name: fullName.trim(),
          profession: profession,
          account_type: accountType,
          onboarding_status: 'completed',
        })
        .eq('id', user.id)

      if (profileError) throw profileError

      // If company account, update the personal workspace to a team workspace
      if (accountType === 'company' && companyName.trim()) {
        const { data: memberships } = await db
          .from('workspace_memberships')
          .select('workspace_id')
          .eq('user_id', user.id)
          .eq('role', 'owner')
          .limit(1)

        if (memberships && memberships.length > 0) {
          await db
            .from('workspaces')
            .update({
              name: companyName.trim(),
              type: 'team',
            })
            .eq('id', memberships[0].workspace_id)
        }
      }

      setStep('complete')

      // Brief pause to show success, then redirect
      setTimeout(() => {
        router.push(nextPath)
        router.refresh()
      }, 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save profile')
      setLoading(false)
    }
  }, [supabase, fullName, profession, accountType, companyName, nextPath, router])

  const handleAccountTypeNext = useCallback(() => {
    setError(null)
    if (accountType === 'company') {
      setStep('workspace')
    } else {
      // Skip workspace step for individual accounts
      handleComplete()
    }
  }, [accountType, handleComplete])

  const handleWorkspaceNext = useCallback(() => {
    if (accountType === 'company' && !companyName.trim()) {
      setError('Please enter your company name')
      return
    }
    setError(null)
    handleComplete()
  }, [accountType, companyName, handleComplete])

  if (authChecking) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
        <Loader2Icon className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-grid-pattern">
      <div className="w-full max-w-lg space-y-6 animate-fade-up">
        {/* Logo */}
        <div className="text-center">
          <div className="flex justify-center mb-3">
            <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={40} height={40} priority />
          </div>
          <h1 className="text-lg font-bold text-foreground tracking-tight">Welcome to FeasiAI</h1>
        </div>

        {/* Progress bar */}
        <div className="w-full h-1 bg-muted rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>

        <Card className="shadow-card border-border/50">
          <CardContent className="pt-6 pb-6 px-6 space-y-5">
            {error && (
              <div className="flex items-start gap-2.5 p-3 rounded-lg bg-destructive/5 border border-destructive/20">
                <p className="text-sm text-destructive">{error}</p>
              </div>
            )}

            {/* Step: Profile */}
            {step === 'profile' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Tell us about yourself</h2>
                  <p className="text-sm text-muted-foreground mt-1">This helps us personalize your experience</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="fullName" className="text-sm font-medium text-foreground">Full name</label>
                  <Input
                    id="fullName"
                    placeholder="Jane Smith"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoFocus
                    autoComplete="name"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground">What do you do?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROFESSION_OPTIONS.map(({ value, label, icon: Icon, description }) => (
                      <button
                        key={value}
                        type="button"
                        onClick={() => setProfession(value)}
                        className={cn(
                          'flex flex-col items-start gap-1.5 p-3 rounded-lg border text-left transition-all',
                          'hover:border-primary/50 hover:bg-primary/5',
                          profession === value
                            ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                            : 'border-border'
                        )}
                      >
                        <Icon className={cn(
                          'w-4 h-4',
                          profession === value ? 'text-primary' : 'text-muted-foreground'
                        )} />
                        <div>
                          <div className="text-sm font-medium text-foreground">{label}</div>
                          <div className="text-xs text-muted-foreground">{description}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <Button onClick={handleProfileNext} className="w-full font-semibold" size="lg">
                  Continue
                  <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {/* Step: Account Type */}
            {step === 'account-type' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">How will you use FeasiAI?</h2>
                  <p className="text-sm text-muted-foreground mt-1">You can always change this later</p>
                </div>

                <div className="space-y-2">
                  {ACCOUNT_OPTIONS.map(({ value, label, description }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setAccountType(value)}
                      className={cn(
                        'flex items-start gap-3 w-full p-4 rounded-lg border text-left transition-all',
                        'hover:border-primary/50 hover:bg-primary/5',
                        accountType === value
                          ? 'border-primary bg-primary/5 ring-1 ring-primary/20'
                          : 'border-border'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 mt-0.5 flex-shrink-0 flex items-center justify-center',
                        accountType === value ? 'border-primary' : 'border-muted-foreground/40'
                      )}>
                        {accountType === value && (
                          <div className="w-2 h-2 rounded-full bg-primary" />
                        )}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">{label}</div>
                        <div className="text-xs text-muted-foreground">{description}</div>
                      </div>
                    </button>
                  ))}
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} size="lg" className="flex-shrink-0">
                    <ArrowLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button onClick={handleAccountTypeNext} className="flex-1 font-semibold" size="lg">
                    {accountType === 'company' ? 'Set up workspace' : 'Finish setup'}
                    <ArrowRightIcon className="w-4 h-4 ml-1.5" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Workspace */}
            {step === 'workspace' && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-lg font-semibold text-foreground">Create your workspace</h2>
                  <p className="text-sm text-muted-foreground mt-1">Your team will collaborate here</p>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="companyName" className="text-sm font-medium text-foreground">Company name</label>
                  <Input
                    id="companyName"
                    placeholder="Acme Construction"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    autoFocus
                  />
                </div>

                <div className="flex gap-2">
                  <Button variant="outline" onClick={goBack} size="lg" className="flex-shrink-0">
                    <ArrowLeftIcon className="w-4 h-4" />
                  </Button>
                  <Button
                    onClick={handleWorkspaceNext}
                    disabled={loading}
                    className="flex-1 font-semibold"
                    size="lg"
                  >
                    {loading ? (
                      <Loader2Icon className="w-4 h-4 animate-spin mr-1.5" />
                    ) : (
                      <CheckCircle2Icon className="w-4 h-4 mr-1.5" />
                    )}
                    {loading ? 'Setting up...' : 'Finish setup'}
                  </Button>
                </div>
              </div>
            )}

            {/* Step: Complete */}
            {step === 'complete' && (
              <div className="text-center space-y-4 py-4">
                <div className="flex justify-center">
                  <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle2Icon className="w-6 h-6 text-green-500" />
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-foreground">You&apos;re all set!</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Welcome to FeasiAI, {fullName.split(' ')[0]}. Redirecting to your dashboard...
                  </p>
                </div>
                <Loader2Icon className="w-4 h-4 animate-spin mx-auto text-muted-foreground" />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
