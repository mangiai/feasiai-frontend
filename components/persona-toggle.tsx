'use client'

import { HardHatIcon, Building2Icon, BarChart3Icon } from 'lucide-react'
import { setPersona, type Persona } from '@/lib/persona'
import { cn } from '@/lib/utils'

interface PersonaToggleProps {
  persona: Persona
}

const TABS: { id: Persona; label: string; icon: typeof HardHatIcon }[] = [
  { id: 'contractor', label: 'Contractor', icon: HardHatIcon },
  { id: 'city', label: 'City Reviewer', icon: Building2Icon },
  { id: 'feasibility', label: 'Feasibility', icon: BarChart3Icon },
]

export function PersonaToggle({ persona }: PersonaToggleProps) {
  const activeIdx = TABS.findIndex((t) => t.id === persona)
  const tabCount = TABS.length
  const widthPct = `calc(${100 / tabCount}% - ${(tabCount + 1) * 2 / tabCount}px)`

  return (
    <div className="flex justify-center">
      <div className="relative inline-flex rounded-full bg-muted/60 p-1 border border-border/50">
        {/* Sliding indicator */}
        <div
          className="absolute top-1 bottom-1 rounded-full bg-primary shadow-md transition-all duration-200 ease-out"
          style={{
            width: widthPct,
            left: `calc(${activeIdx} * ${100 / tabCount}% + 4px)`,
          }}
        />

        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setPersona(tab.id)}
            className={cn(
              'relative z-10 flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-semibold font-body transition-colors duration-200',
              persona === tab.id
                ? 'text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  )
}
