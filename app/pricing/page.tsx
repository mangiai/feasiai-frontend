import type { Metadata } from 'next'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3Icon,
  CheckIcon,
  CreditCardIcon,
  Layers3Icon,
  ShieldCheckIcon,
  SparklesIcon,
  TargetIcon,
  Users2Icon,
} from 'lucide-react'

import { PricingActionButton } from '@/components/landing/pricing-action-button'
import { ScrollReveal, SectionTag } from '@/components/landing/motion-primitives'
import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'
import { Badge } from '@/components/ui/badge'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  CREDIT_PACKAGES,
  PLATFORM_ACCESS_PLANS,
  getBillableRunPricing,
} from '@/lib/pricing'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Pricing — Platform Access + Report Credits',
  description:
    'Explore FeasiAI pricing for workspace access, report credits, feasibility deliverables, and entitlement strategy work.',
}

type SectionSignal = {
  label: string
  value: string
  note: string
  icon: LucideIcon
}

type BillingStep = {
  title: string
  description: string
  icon: LucideIcon
}

type AccessPlanCard = {
  id: string
  name: string
  price: number
  description: string
  features: string[]
  popular: boolean
  eyebrow: string
  fit: string
  operatingMode: string
  ctaLabel: string
}

type DeliverableCard = {
  name: string
  price: number
  credits: number
  description: string
  icon: LucideIcon
  fit: string
  outcomes: string[]
  tone: 'standard' | 'strategy'
}

type CreditPackageCard = {
  id: string
  name: string
  price: number
  credits: number
  description: string
  features: string[]
  popular: boolean
  fit: string
  coverageLabel: string
  packageLabel: string
}

const surfaceCardClassName =
  'border-border/60 bg-background/82 backdrop-blur-xl shadow-[0_24px_90px_-60px_rgba(15,23,42,0.18)] dark:bg-card/60 dark:shadow-[0_32px_120px_-72px_rgba(2,6,23,0.72)]'

const mutedBodyClassName = 'text-sm leading-6 text-muted-foreground'

const standardReport = getBillableRunPricing('feasibility-analysis')
const strategyReport = getBillableRunPricing('feasibility-analysis', 'strategy')

function formatUsd(usdCents: number): string {
  return `$${(usdCents / 100).toLocaleString('en-US', { maximumFractionDigits: 0 })}`
}

function getRoundedCoverage(credits: number, perReportCredits: number): string {
  const rounded = Math.max(1, Math.round(credits / perReportCredits))
  return `~${rounded} ${rounded === 1 ? 'standard report' : 'standard reports'}`
}

const sectionSignals: SectionSignal[] = [
  {
    label: 'Platform access',
    value: '$149–$199 / month',
    note: 'Keeps the workspace, collaboration, and billing layer live for your team.',
    icon: Users2Icon,
  },
  {
    label: 'Standard deliverable',
    value: formatUsd(standardReport.priceUsdCents),
    note: `${standardReport.credits} credits for parcel-level feasibility and go / no-go diligence.`,
    icon: TargetIcon,
  },
  {
    label: 'Strategy-grade deliverable',
    value: formatUsd(strategyReport.priceUsdCents),
    note: `${strategyReport.credits} credits for deeper entitlement framing and consulting-grade recommendations.`,
    icon: SparklesIcon,
  },
]

const billingSteps: BillingStep[] = [
  {
    title: 'Subscribe for workspace access',
    description:
      'Choose the operating plan that matches how many people, projects, and active pursuits you manage each month.',
    icon: Users2Icon,
  },
  {
    title: 'Select the deliverable intensity',
    description:
      'Standard reports cover fast feasibility diligence. Strategy reports cover the higher-context work used for investor and entitlement decisions.',
    icon: Layers3Icon,
  },
  {
    title: 'Top up credits when work is ready',
    description:
      'Buy credits through Stripe only when a report is about to move, so spend tracks actual deal flow instead of inflated seat tiers.',
    icon: CreditCardIcon,
  },
]

const accessPlans: AccessPlanCard[] = PLATFORM_ACCESS_PLANS.map((plan) => {
  if (plan.id === 'starter_access') {
    return {
      id: plan.id,
      name: plan.name,
      price: plan.monthlyPrice / 100,
      description: plan.description,
      features: plan.features,
      popular: Boolean(plan.popular),
      eyebrow: 'Lean operating layer',
      fit: 'Best for solo operators, boutique consultants, and founders validating deals without a large internal team.',
      operatingMode:
        'Keeps your pipeline organized without forcing you into a bloated annual software commitment.',
      ctaLabel: 'Start Starter Access',
    }
  }

  return {
    id: plan.id,
    name: plan.name,
    price: plan.monthlyPrice / 100,
    description: plan.description,
    features: plan.features,
    popular: Boolean(plan.popular),
    eyebrow: 'Recommended for active teams',
    fit: 'Best for acquisition teams, brokerages, and operators juggling multiple active parcels or faster turnaround expectations.',
    operatingMode:
      'Built for higher throughput, tighter internal handoffs, and a cleaner client-facing delivery rhythm.',
    ctaLabel: 'Choose Growth Access',
  }
})

const deliverables: DeliverableCard[] = [
  {
    name: 'Standard AI feasibility report',
    price: standardReport.priceUsdCents / 100,
    credits: standardReport.credits,
    description: standardReport.description,
    icon: BarChart3Icon,
    fit: 'For fast parcel screening, acquisition diligence, and early-stage go / no-go decisions.',
    outcomes: [
      'Parcel-specific feasibility framing',
      'Code and constraint synthesis for quick decision-making',
      'Clear recommendation for next-step diligence',
    ],
    tone: 'standard',
  },
  {
    name: 'AI feasibility + entitlement strategy',
    price: strategyReport.priceUsdCents / 100,
    credits: strategyReport.credits,
    description: strategyReport.description,
    icon: SparklesIcon,
    fit: 'For higher-stakes sites where strategy, sequencing, and upside framing matter as much as the raw zoning check.',
    outcomes: [
      'Scenario-based development pathways',
      'Entitlement strategy with consulting-grade framing',
      'Stronger material for principals, investors, or sophisticated clients',
    ],
    tone: 'strategy',
  },
]

const creditPackages: CreditPackageCard[] = CREDIT_PACKAGES.map((pkg) => {
  const packageNotes: Record<
    string,
    Pick<CreditPackageCard, 'fit' | 'coverageLabel' | 'packageLabel'>
  > = {
    starter: {
      fit: 'A clean entry point when one feasibility answer will decide whether a site moves forward.',
      coverageLabel: 'Calibrated for one standard feasibility report.',
      packageLabel: 'Single-project buyer',
    },
    professional: {
      fit: 'Useful when the team is comparing multiple addresses or iterating on a short list of candidates.',
      coverageLabel: 'Sized for roughly two standard reports.',
      packageLabel: 'Repeat diligence',
    },
    business: {
      fit: 'Built for consulting-grade work where deeper strategy framing is the deliverable, not just screening.',
      coverageLabel: 'Ready for one full strategy report.',
      packageLabel: 'Strategy-led work',
    },
    enterprise: {
      fit: 'Designed for firms batching multiple sites and wanting fewer checkout events across the month.',
      coverageLabel: `${getRoundedCoverage(pkg.credits, standardReport.credits)} across active feasibility work.`,
      packageLabel: 'Batching pipeline',
    },
    unlimited: {
      fit: 'For studios, acquisition teams, and operators with ongoing deal volume and recurring report demand.',
      coverageLabel: `${getRoundedCoverage(pkg.credits, standardReport.credits)} across continuous sourcing cycles.`,
      packageLabel: 'Portfolio throughput',
    },
  }

  const notes = packageNotes[pkg.id] ?? {
    fit: pkg.description,
    coverageLabel: `${pkg.credits} credits ready to deploy.`,
    packageLabel: 'Flexible credits',
  }

  return {
    id: pkg.id,
    name: pkg.name,
    price: pkg.price / 100,
    credits: pkg.credits,
    description: pkg.description,
    features: pkg.features,
    popular: Boolean(pkg.popular),
    fit: notes.fit,
    coverageLabel: notes.coverageLabel,
    packageLabel: notes.packageLabel,
  }
})

function SignalCard({ icon: Icon, label, value, note }: SectionSignal) {
  return (
    <Card
      className={cn(
        surfaceCardClassName,
        'shadow-[0_24px_80px_-56px_rgba(245,158,11,0.18)] dark:shadow-[0_28px_110px_-72px_rgba(245,158,11,0.22)]'
      )}
    >
      <CardContent className="flex h-full flex-col gap-4 py-5">
        <div className="flex size-10 items-center justify-center rounded-2xl border border-secondary/20 bg-secondary/10 text-secondary">
          <Icon className="size-4" />
        </div>
        <div className="space-y-2">
          <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
            {label}
          </p>
          <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground">{value}</p>
          <p className={mutedBodyClassName}>{note}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader forceReadable />

      <main className="relative overflow-hidden bg-grid-pattern">
        <div className="absolute inset-0 bg-gradient-to-b from-background via-muted/35 to-background dark:via-background/95" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/80 to-transparent" />
        <div className="absolute left-[-4rem] top-16 h-72 w-72 rounded-full bg-secondary/12 blur-3xl dark:bg-secondary/10" />
        <div className="absolute right-[-2rem] top-24 h-80 w-80 rounded-full bg-info/12 blur-3xl dark:bg-info/10" />

        <section className="relative mx-auto max-w-7xl px-4 pb-14 pt-28 sm:px-6 lg:px-8 lg:pb-20">
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <ScrollReveal className="space-y-6">
              <SectionTag>Pricing architecture</SectionTag>

              <div className="space-y-5">
                <h1 className="max-w-4xl text-balance text-5xl font-semibold tracking-[-0.05em] text-foreground sm:text-6xl lg:text-7xl">
                  Pricing that reads clearly in both light and dark.
                </h1>
                <p className="max-w-3xl text-lg leading-8 text-muted-foreground sm:text-xl">
                  FeasiAI uses a hybrid model on purpose: keep platform access predictable, then buy report credits only when a feasibility or strategy deliverable is actually moving.
                </p>
              </div>

              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 backdrop-blur-sm dark:bg-card/50">
                  <ShieldCheckIcon className="size-4 text-emerald-500" />
                  Stripe-backed billing per workspace
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 backdrop-blur-sm dark:bg-card/50">
                  <Layers3Icon className="size-4 text-info" />
                  Access plan + credits, no seat bloat
                </div>
                <div className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-background/70 px-4 py-2 backdrop-blur-sm dark:bg-card/50">
                  <SparklesIcon className="size-4 text-secondary" />
                  Standard and strategy deliverables
                </div>
              </div>
            </ScrollReveal>

            <ScrollReveal delay={0.08}>
              <Card
                className={cn(
                  surfaceCardClassName,
                  'shadow-[0_32px_140px_-72px_rgba(245,130,32,0.22)] dark:shadow-[0_32px_140px_-72px_rgba(245,130,32,0.28)]'
                )}
              >
                <CardHeader className="space-y-3">
                  <Badge className="w-fit rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-secondary">
                    How billing works
                  </Badge>
                  <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                    Three moves. No hidden tiers.
                  </CardTitle>
                  <CardDescription className="max-w-xl text-sm leading-6 text-muted-foreground">
                    The page should answer one question fast: what do I subscribe to, what does a deliverable cost, and how do I top up without talking to sales for every report?
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {billingSteps.map((step, index) => {
                    const Icon = step.icon

                    return (
                      <div
                        key={step.title}
                        className="grid gap-3 rounded-2xl border border-border/60 bg-background/74 p-4 sm:grid-cols-[auto_1fr] sm:items-start dark:bg-background/35"
                      >
                        <div className="flex items-center gap-3 sm:block">
                          <div className="flex size-11 items-center justify-center rounded-2xl border border-border/60 bg-accent/50 text-foreground dark:bg-background/60">
                            <Icon className="size-4 text-secondary" />
                          </div>
                          <span className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70 sm:mt-3 sm:block">
                            Step {index + 1}
                          </span>
                        </div>

                        <div className="space-y-1.5">
                          <h2 className="text-base font-semibold text-foreground">{step.title}</h2>
                          <p className={mutedBodyClassName}>{step.description}</p>
                        </div>
                      </div>
                    )
                  })}
                </CardContent>
              </Card>
            </ScrollReveal>
          </div>

          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {sectionSignals.map((signal, index) => (
              <ScrollReveal key={signal.label} delay={0.05 * (index + 1)}>
                <SignalCard {...signal} />
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SectionTag>Platform access</SectionTag>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Pick the operating layer for your team.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Access plans are about workflow maturity, not report volume. They keep collaboration, pipeline visibility, and billing controls in place while credits stay reserved for paid deliverables.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-2">
            {accessPlans.map((plan, index) => (
              <ScrollReveal key={plan.id} delay={0.08 * (index + 1)}>
                <Card
                  className={cn(
                    surfaceCardClassName,
                    plan.popular &&
                      'border-secondary/40 shadow-[0_36px_140px_-80px_rgba(245,130,32,0.24)] dark:shadow-[0_36px_140px_-72px_rgba(245,130,32,0.32)]'
                  )}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="space-y-3">
                        <Badge className="w-fit rounded-full border border-border/70 bg-accent/50 px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-muted-foreground dark:bg-background/40">
                          {plan.eyebrow}
                        </Badge>
                        <div>
                          <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                            {plan.name}
                          </CardTitle>
                          <CardDescription className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
                            {plan.description}
                          </CardDescription>
                        </div>
                      </div>

                      {plan.popular ? (
                        <Badge className="rounded-full border border-secondary/20 bg-secondary/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-secondary">
                          Recommended
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.05em] text-foreground">
                        ${plan.price}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">/ month</span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-2xl border border-border/60 bg-background/72 p-4 dark:bg-background/35">
                        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                          Best fit
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{plan.fit}</p>
                      </div>
                      <div className="rounded-2xl border border-border/60 bg-background/72 p-4 dark:bg-background/35">
                        <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-muted-foreground/70">
                          Operating posture
                        </p>
                        <p className="mt-2 text-sm leading-6 text-foreground">{plan.operatingMode}</p>
                      </div>
                    </div>

                    <ul className="grid gap-3 sm:grid-cols-2">
                      {plan.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/72 px-4 py-3 text-sm text-foreground dark:bg-background/30"
                        >
                          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                            <CheckIcon className="size-3.5" />
                          </span>
                          <span className="leading-6">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <div className="rounded-2xl border border-dashed border-border/70 bg-accent/35 p-4 text-sm leading-6 text-muted-foreground dark:bg-background/30">
                      Access keeps your workspace live. Deliverables are funded separately with credits so you only spend when analysis is actually moving.
                    </div>

                    <PricingActionButton
                      subscribePlanId={plan.id}
                      label={plan.ctaLabel}
                      size="lg"
                      variant={plan.popular ? 'premium' : 'outline'}
                      className={cn(
                        'h-11 text-sm font-semibold tracking-[0.02em]',
                        !plan.popular &&
                          'border-border bg-background/80 text-foreground hover:bg-muted dark:bg-background/35'
                      )}
                    />
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SectionTag>Deliverable pricing</SectionTag>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Credits map cleanly to the work product.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Buyers should instantly understand what a standard report is, when strategy work is different, and why the pricing ladder makes sense.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 lg:grid-cols-2">
            {deliverables.map((deliverable, index) => {
              const Icon = deliverable.icon

              return (
                <ScrollReveal key={deliverable.name} delay={0.08 * (index + 1)}>
                  <Card
                    className={cn(
                      surfaceCardClassName,
                      deliverable.tone === 'strategy'
                        ? 'shadow-[0_34px_130px_-76px_rgba(59,130,246,0.22)] dark:shadow-[0_34px_130px_-76px_rgba(59,130,246,0.28)]'
                        : 'shadow-[0_34px_130px_-76px_rgba(245,130,32,0.2)] dark:shadow-[0_34px_130px_-76px_rgba(245,130,32,0.26)]'
                    )}
                  >
                    <CardHeader className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              'flex size-11 items-center justify-center rounded-2xl border',
                              deliverable.tone === 'strategy'
                                ? 'border-info/20 bg-info/10 text-info'
                                : 'border-secondary/20 bg-secondary/10 text-secondary'
                            )}
                          >
                            <Icon className="size-4" />
                          </div>
                          <div>
                            <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                              {deliverable.name}
                            </CardTitle>
                            <CardDescription className="mt-1 text-sm leading-6 text-muted-foreground">
                              {deliverable.fit}
                            </CardDescription>
                          </div>
                        </div>

                        <Badge className="rounded-full border border-border/70 bg-accent/50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground dark:bg-background/40">
                          {deliverable.credits} credits
                        </Badge>
                      </div>

                      <div className="flex items-end gap-2">
                        <span className="text-5xl font-semibold tracking-[-0.05em] text-foreground">
                          ${deliverable.price}
                        </span>
                        <span className="pb-1 text-sm text-muted-foreground">per report</span>
                      </div>

                      <p className={mutedBodyClassName}>{deliverable.description}</p>
                    </CardHeader>

                    <CardContent>
                      <ul className="grid gap-3">
                        {deliverable.outcomes.map((outcome) => (
                          <li
                            key={outcome}
                            className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/72 px-4 py-3 text-sm text-foreground dark:bg-background/30"
                          >
                            <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                              <CheckIcon className="size-3.5" />
                            </span>
                            <span className="leading-6">{outcome}</span>
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </ScrollReveal>
              )
            })}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <ScrollReveal className="mb-8 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="space-y-3">
              <SectionTag>Credit packages</SectionTag>
              <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                Buy credits in packs that match how you actually staff work.
              </h2>
            </div>
            <p className="max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
              Packages should feel like clear purchasing decisions: one-off due diligence, repeated screening, strategy-heavy work, or ongoing monthly throughput.
            </p>
          </ScrollReveal>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {creditPackages.map((pkg, index) => (
              <ScrollReveal key={pkg.id} delay={0.05 * (index + 1)}>
                <Card
                  className={cn(
                    surfaceCardClassName,
                    pkg.popular &&
                      'border-info/35 shadow-[0_34px_140px_-72px_rgba(59,130,246,0.22)] dark:shadow-[0_34px_140px_-72px_rgba(59,130,246,0.28)]'
                  )}
                >
                  <CardHeader className="space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-3">
                        <Badge className="w-fit rounded-full border border-border/70 bg-accent/50 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-muted-foreground dark:bg-background/40">
                          {pkg.packageLabel}
                        </Badge>
                        <div>
                          <CardTitle className="text-2xl font-semibold tracking-[-0.03em] text-foreground">
                            {pkg.name}
                          </CardTitle>
                          <CardDescription className="mt-2 text-sm leading-6 text-muted-foreground">
                            {pkg.fit}
                          </CardDescription>
                        </div>
                      </div>

                      {pkg.popular ? (
                        <Badge className="rounded-full border border-info/20 bg-info/10 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-info">
                          Most selected
                        </Badge>
                      ) : null}
                    </div>

                    <div className="flex items-end gap-2">
                      <span className="text-5xl font-semibold tracking-[-0.05em] text-foreground">
                        ${pkg.price}
                      </span>
                      <span className="pb-1 text-sm text-muted-foreground">/ package</span>
                    </div>

                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="rounded-full border border-border/70 bg-background/72 px-3 py-1 dark:bg-background/35">
                        {pkg.credits} credits
                      </span>
                      <span className="rounded-full border border-border/70 bg-background/72 px-3 py-1 dark:bg-background/35">
                        {pkg.coverageLabel}
                      </span>
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-6">
                    <p className={mutedBodyClassName}>{pkg.description}</p>

                    <ul className="grid gap-3">
                      {pkg.features.map((feature) => (
                        <li
                          key={feature}
                          className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/72 px-4 py-3 text-sm text-foreground dark:bg-background/30"
                        >
                          <span className="mt-0.5 flex size-5 items-center justify-center rounded-full bg-emerald-500/12 text-emerald-600 dark:text-emerald-400">
                            <CheckIcon className="size-3.5" />
                          </span>
                          <span className="leading-6">{feature}</span>
                        </li>
                      ))}
                    </ul>

                    <PricingActionButton
                      packageId={pkg.id}
                      label={pkg.popular ? 'Buy recommended pack' : 'Buy with Stripe'}
                      size="lg"
                      variant={pkg.popular ? 'premium' : 'outline'}
                      className={cn(
                        'h-11 text-sm font-semibold tracking-[0.02em]',
                        !pkg.popular &&
                          'border-border bg-background/80 text-foreground hover:bg-muted dark:bg-background/35'
                      )}
                    />
                  </CardContent>
                </Card>
              </ScrollReveal>
            ))}
          </div>
        </section>

        <section className="relative mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <ScrollReveal>
            <Card className={cn(surfaceCardClassName, 'relative overflow-hidden')}>
              <div className="absolute -right-10 top-0 h-36 w-36 rounded-full bg-info/14 blur-3xl dark:bg-info/12" />
              <div className="absolute -left-10 bottom-0 h-36 w-36 rounded-full bg-secondary/14 blur-3xl dark:bg-secondary/12" />

              <CardContent className="relative flex flex-col gap-8 py-8 md:py-10 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl space-y-4">
                  <SectionTag>Decision shortcut</SectionTag>
                  <h2 className="text-3xl font-semibold tracking-[-0.04em] text-foreground sm:text-4xl">
                    If you want the cleanest starting point, choose Growth Access and fund the first report pack when a site is ready.
                  </h2>
                  <p className="text-sm leading-7 text-muted-foreground sm:text-base">
                    That path gives teams the best day-one experience: strong workspace access, a credible commercial posture, and zero confusion about when spend turns into an actual deliverable.
                  </p>
                </div>

                <div className="min-w-full lg:min-w-[18rem]">
                  <PricingActionButton
                    subscribePlanId="growth_access"
                    label="Start Growth Access"
                    size="lg"
                    variant="premium"
                    className="h-12 w-full text-sm font-semibold tracking-[0.02em]"
                  />
                </div>
              </CardContent>
            </Card>
          </ScrollReveal>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
