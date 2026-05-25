'use client'

import { usePersona } from '@/hooks/use-persona'
import { PersonaToggle } from '@/components/persona-toggle'
import { ContractorDashboard } from '@/components/contractor-dashboard'
import { CityDashboard } from '@/components/city-dashboard'
import { FeasibilityDashboard } from '@/components/feasibility-dashboard'
import { Breadcrumb } from '@/components/breadcrumb'

const SUBTITLES = {
  contractor: 'Track your corrections analyses and response packages',
  city: 'Review permit applications with AI-powered analysis',
  feasibility: 'Evaluate ADU potential with zoning & lot data',
} as const

export default function MyProjectsPage() {
  const persona = usePersona()

  return (
    <div className="space-y-6 animate-fade-up">
      <Breadcrumb items={[{ label: 'Home', href: '/dashboard' }, { label: 'Projects' }]} />

      <div className="page-header">
        <h1 className="heading-display text-foreground">Your Projects</h1>
        <p className="text-muted-foreground">
          {SUBTITLES[persona]}
        </p>
      </div>

      <PersonaToggle persona={persona} />

      {persona === 'city' && <CityDashboard />}
      {persona === 'contractor' && <ContractorDashboard />}
      {persona === 'feasibility' && <FeasibilityDashboard />}
    </div>
  )
}
