import type { Metadata } from 'next'
import { Button } from '@/components/ui/button'

export const metadata: Metadata = {
  title: 'How It Works — From Upload to Permit-Ready Reports',
  description: 'See how FeasiAI takes your ADU plans from upload to permit-ready reports with AI-powered feasibility analysis and corrections response.',
}
import {
  FolderPlusIcon,
  UploadIcon,
  BrainCircuitIcon,
  FileTextIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import Link from 'next/link'
import { SiteHeader } from '@/components/landing/site-header'
import { SiteFooter } from '@/components/landing/site-footer'

const steps = [
  {
    number: 1,
    icon: FolderPlusIcon,
    title: 'Create Project',
    description:
      'Set up your ADU project with the property address and basic details. Our system automatically pulls parcel data, zoning, and overlay information.',
  },
  {
    number: 2,
    icon: UploadIcon,
    title: 'Upload Plans',
    description:
      'Upload your architectural plans, site plans, and any supporting documents. We accept PDF, PNG, and JPG files up to 50MB each.',
  },
  {
    number: 3,
    icon: BrainCircuitIcon,
    title: 'AI Analysis',
    description:
      'Our AI pipeline analyzes your plans against state and local ADU regulations, checking setbacks, height limits, lot coverage, parking, and more.',
  },
  {
    number: 4,
    icon: FileTextIcon,
    title: 'Get Report',
    description:
      'Receive a comprehensive feasibility report with a compliance checklist, identified issues, recommended actions, and cost estimates.',
  },
  {
    number: 5,
    icon: ShieldCheckIcon,
    title: 'Expert Verification',
    description:
      'Optionally have a licensed professional verify the AI findings for extra confidence before you submit to the building department.',
  },
]

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-20">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-bold tracking-tight mb-4">How It Works</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            From project setup to verified report — get your ADU feasibility analysis in five simple steps.
          </p>
        </div>

        <div className="relative">
          {/* Vertical timeline line */}
          <div className="absolute left-[27px] top-2 bottom-2 w-px bg-border hidden md:block" />

          <div className="space-y-12">
            {steps.map((step) => (
              <div key={step.number} className="flex gap-6 items-start">
                <div className="relative z-10 flex items-center justify-center w-14 h-14 rounded-full border-2 border-primary bg-background shrink-0">
                  <step.icon className="w-6 h-6 text-primary" />
                </div>
                <div className="pt-2">
                  <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                    Step {step.number}
                  </p>
                  <h2 className="text-xl font-semibold mb-2">{step.title}</h2>
                  <p className="text-muted-foreground leading-relaxed">{step.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="text-center mt-20">
          <h2 className="text-2xl font-bold mb-4">Ready to get started?</h2>
          <p className="text-muted-foreground mb-6">
            Choose a monthly platform plan, then purchase the report credits that match your project workflow.
          </p>
          <Link href="/pricing">
            <Button size="lg">See Pricing &amp; Plans</Button>
          </Link>
        </div>
      </div>
      <SiteFooter />
    </div>
  )
}
