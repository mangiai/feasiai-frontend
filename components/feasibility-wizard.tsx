'use client'

import { cn } from '@/lib/utils'
import {
  buildFeasibilityChecklistSummary,
  type ChecklistRow,
  type FeasibilityChecklistSummary,
} from '@/lib/feasibility-checklist-summary'
import type { CachedZimasLookupResult } from '@/lib/zimas-cache'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
import {
  CheckCircle2Icon,
  AlertTriangleIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  Loader2Icon,
  SearchIcon,
  ShieldCheckIcon,
} from 'lucide-react'
import { useMemo, useState, type ReactNode } from 'react'

const STEPS = [
  { id: 1 as const, title: 'Start', subtitle: 'Name & city' },
  { id: 2 as const, title: 'Property', subtitle: 'Address & ZIMAS' },
  { id: 3 as const, title: 'Finish', subtitle: 'Review & create' },
]

export type FeasibilityWizardStep = 1 | 2 | 3

const WZ_ACTIVE = 'border-emerald-600 bg-emerald-600 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)]'
const WZ_DONE = 'border-emerald-600/70 bg-emerald-600/15 text-emerald-700 dark:text-emerald-300'

export function FeasibilityWizardBreadcrumbs({
  step,
  projectName,
  city,
}: {
  step: FeasibilityWizardStep
  projectName: string
  city: string
}) {
  const crumbs = [
    { label: 'New project', active: false },
    { label: projectName.trim() || 'Untitled', active: step === 1 },
    { label: city.trim() || 'City', active: step === 1 },
    ...(step >= 2 ? [{ label: 'Property & ZIMAS', active: step === 2 }] : []),
    ...(step >= 3 ? [{ label: 'Review', active: step === 3 }] : []),
  ]

  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-xs font-body">
      {crumbs.map((crumb, i) => (
        <span key={`${crumb.label}-${i}`} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-muted-foreground/50">/</span>}
          <span
            className={cn(
              'truncate max-w-[12rem] transition-colors',
              crumb.active ? 'text-emerald-700 dark:text-emerald-300 font-semibold' : 'text-muted-foreground',
            )}
          >
            {crumb.label}
          </span>
        </span>
      ))}
    </nav>
  )
}

export function FeasibilityWizardProgress({ step }: { step: FeasibilityWizardStep }) {
  return (
    <nav aria-label="Feasibility steps" className="flex items-center gap-2 md:gap-4">
      {STEPS.map((s, index) => {
        const active = step === s.id
        const done = step > s.id
        return (
          <div key={s.id} className="flex items-center gap-2 md:gap-4 flex-1 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div
                className={cn(
                  'w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0 border-2 transition-all duration-300',
                  active && WZ_ACTIVE,
                  done && !active && WZ_DONE,
                  !active && !done && 'border-border/80 text-muted-foreground bg-card',
                )}
              >
                {done ? <CheckCircle2Icon className="w-4 h-4" /> : s.id}
              </div>
              <div className="min-w-0 hidden sm:block">
                <p
                  className={cn(
                    'text-sm font-semibold font-body truncate transition-colors',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {s.title}
                </p>
                <p className="text-xs text-muted-foreground font-body truncate">{s.subtitle}</p>
              </div>
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 flex-1 rounded-full transition-all duration-500',
                  done ? 'bg-emerald-600/50' : 'bg-border/60',
                )}
              />
            )}
          </div>
        )
      })}
    </nav>
  )
}

export function FeasibilityWizardShell({
  step,
  children,
}: {
  step: FeasibilityWizardStep
  children: React.ReactNode
}) {
  return (
    <div key={step} className="animate-fade-up space-y-5">
      {children}
    </div>
  )
}

export function FeasibilityAccordion(props: {
  title: string
  subtitle?: string
  defaultOpen?: boolean
  badge?: ReactNode
  children: ReactNode
  className?: string
}) {
  const [open, setOpen] = useState(props.defaultOpen ?? false)

  return (
    <Collapsible
      open={open}
      onOpenChange={setOpen}
      className={cn(
        'rounded-xl border bg-card transition-all duration-200',
        open ? 'border-emerald-600/35 shadow-sm' : 'border-border/60',
        props.className,
      )}
    >
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-emerald-600/5 transition-colors rounded-xl data-[state=open]:rounded-b-none">
        <div className="min-w-0 space-y-0.5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold font-body text-foreground">{props.title}</span>
            {props.badge}
          </div>
          {props.subtitle && (
            <p className="text-xs text-muted-foreground font-body">{props.subtitle}</p>
          )}
        </div>
        {open ? (
          <ChevronDownIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRightIcon className="w-4 h-4 shrink-0 text-muted-foreground" />
        )}
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-emerald-600/15 px-4 pb-4 pt-3 space-y-3 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:slide-in-from-top-1 duration-200">
        {props.children}
      </CollapsibleContent>
    </Collapsible>
  )
}

function statusIcon(status: ChecklistRow['status']) {
  if (status === 'ok') return <CheckCircle2Icon className="w-3.5 h-3.5 text-green-600 shrink-0" />
  if (status === 'blocked' || status === 'missing') {
    return <AlertTriangleIcon className="w-3.5 h-3.5 text-destructive shrink-0" />
  }
  return <AlertTriangleIcon className="w-3.5 h-3.5 text-amber-600 shrink-0" />
}

function DetailGrid({ items }: { items: Array<{ label: string; value: string; span?: boolean }> }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2 text-sm font-body">
      {items.map((item) => (
        <div key={item.label} className={cn(item.span && 'sm:col-span-2')}>
          <dt className="text-xs text-muted-foreground">{item.label}</dt>
          <dd className="font-medium text-foreground mt-0.5">{item.value}</dd>
        </div>
      ))}
    </dl>
  )
}

export function ZimasPropertySummaryCard(props: {
  zone: string
  lotSize: string
  tocTier: string
  chipTier: string
  hazardZones: string
  transitProximity: boolean | null
  specificPlan: string
  zimasMessage: string
  zimasLookupCache: CachedZimasLookupResult | null
  onFixZone?: (value: string) => void
  onFixLotSize?: (value: string) => void
}) {
  const fields = props.zimasLookupCache?.fields as Record<string, unknown> | undefined
  const apn = typeof fields?.apn === 'string' ? fields.apn : ''
  const generalPlan = typeof fields?.general_plan_land_use === 'string' ? fields.general_plan_land_use : ''
  const needsZone = !props.zone.trim()
  const needsLot = !props.lotSize.trim()
  const needsManual = needsZone || needsLot

  const parcelItems = [
    ...(apn ? [{ label: 'APN', value: apn }] : []),
    { label: 'Zone', value: props.zone || '—' },
    { label: 'Lot size', value: props.lotSize ? `${props.lotSize} sf` : '—' },
    { label: 'TOC tier', value: props.tocTier || '—' },
    { label: 'CHIP', value: props.chipTier || '—' },
    {
      label: 'Transit (½ mile)',
      value:
        props.transitProximity === true ? 'Yes' : props.transitProximity === false ? 'No' : 'Unknown',
    },
    ...(generalPlan ? [{ label: 'General plan', value: generalPlan, span: true }] : []),
    ...(props.specificPlan
      ? [{ label: 'Specific plan', value: props.specificPlan, span: true }]
      : []),
    ...(props.hazardZones
      ? [{ label: 'Hazards', value: props.hazardZones, span: true }]
      : []),
  ]

  return (
    <div className="space-y-3">
      <FeasibilityAccordion
        title="ZIMAS verification"
        subtitle={props.zimasMessage}
        defaultOpen
        badge={
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-600/10 text-green-700 dark:text-green-400">
            Verified
          </span>
        }
      >
        <p className="text-xs text-muted-foreground font-body">
          Parcel data is locked for this project. Change the street address above to run a new lookup.
        </p>
      </FeasibilityAccordion>

      <FeasibilityAccordion title="Parcel data from ZIMAS" defaultOpen>
        <DetailGrid items={parcelItems} />
      </FeasibilityAccordion>

      {needsManual && (
        <FeasibilityAccordion
          title="Required fields"
          subtitle="ZIMAS did not return everything needed for the feasibility report"
          defaultOpen
          badge={
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
              Action needed
            </span>
          }
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {needsZone && props.onFixZone && (
              <div className="space-y-1.5">
                <Label htmlFor="wizard-zone" className="text-xs font-body">
                  Zone code
                </Label>
                <Input
                  id="wizard-zone"
                  placeholder="e.g. RD3-1"
                  value={props.zone}
                  onChange={(e) => props.onFixZone?.(e.target.value)}
                  className="font-body h-9"
                />
              </div>
            )}
            {needsLot && props.onFixLotSize && (
              <div className="space-y-1.5">
                <Label htmlFor="wizard-lot" className="text-xs font-body">
                  Lot size (sq ft)
                </Label>
                <Input
                  id="wizard-lot"
                  type="number"
                  placeholder="e.g. 7500"
                  value={props.lotSize}
                  onChange={(e) => props.onFixLotSize?.(e.target.value)}
                  className="font-body h-9"
                />
              </div>
            )}
          </div>
        </FeasibilityAccordion>
      )}
    </div>
  )
}

export function FeasibilityReviewCard(props: {
  projectName: string
  city: string
  address: string
  zone: string
  lotSize: string
  tocTier: string
  chipTier: string
  transitProximity: boolean | null
  hazardZones: string
  specificPlan: string
  existingBuildingYear: string
  existingUnits: string
  fileCount: number
  zimasVerified: boolean
  zimasLookupCache: CachedZimasLookupResult | null
}) {
  const summary = useMemo(
    () =>
      buildFeasibilityChecklistSummary({
        projectName: props.projectName,
        city: props.city,
        address: props.address,
        zone: props.zone,
        lotSize: props.lotSize,
        tocTier: props.tocTier,
        chipTier: props.chipTier,
        transitProximity: props.transitProximity,
        hazardZones: props.hazardZones,
        specificPlan: props.specificPlan,
        existingBuildingYear: props.existingBuildingYear,
        existingUnits: props.existingUnits,
        zimasVerified: props.zimasVerified,
        zimasLookupCache: props.zimasLookupCache,
      }),
    [props],
  )

  const gateLabel =
    summary.gate === 'PROCEED'
      ? 'Ready — report will use verified property data'
      : summary.gate === 'PROCEED_WITH_FLAGS'
        ? 'Ready with verification flags — agent will research gaps'
        : 'Cannot run until required items are complete'

  const gateBadge =
    summary.gate === 'PROCEED' ? (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-green-600/10 text-green-700 dark:text-green-400">
        Ready
      </span>
    ) : summary.gate === 'PROCEED_WITH_FLAGS' ? (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
        Verify flags
      </span>
    ) : (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-destructive/10 text-destructive">
        Blocked
      </span>
    )

  return (
    <div className="space-y-3">
      <FeasibilityAccordion
        title="Report input checklist"
        subtitle={gateLabel}
        defaultOpen
        badge={gateBadge}
      >
        <ChecklistTable summary={summary} />
      </FeasibilityAccordion>

      <FeasibilityAccordion
        title="Project summary"
        subtitle={`${props.projectName} · ${props.city}`}
        defaultOpen={false}
      >
        <DetailGrid
          items={[
            { label: 'Address', value: props.address || '—', span: true },
            { label: 'Zone', value: props.zone || '—' },
            { label: 'Lot size', value: props.lotSize ? `${props.lotSize} sf` : '—' },
            {
              label: 'Plans',
              value:
                props.fileCount > 0
                  ? `${props.fileCount} PDF(s) attached`
                  : 'None — address-only feasibility',
              span: true,
            },
          ]}
        />
      </FeasibilityAccordion>
    </div>
  )
}

function ChecklistTable({ summary }: { summary: FeasibilityChecklistSummary }) {
  const [showAll, setShowAll] = useState(false)
  const primary = summary.rows.filter((r) =>
    ['address', 'zimas', 'zone', 'lot', 'toc', 'chip', 'transit'].includes(r.id),
  )
  const rest = summary.rows.filter((r) => !primary.includes(r))

  return (
    <div className="space-y-2">
      <table className="w-full text-xs font-body">
        <tbody>
          {(showAll ? summary.rows : primary).map((row) => (
            <ChecklistRowTr key={row.id} row={row} />
          ))}
        </tbody>
      </table>
      {rest.length > 0 && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="flex items-center gap-1 text-xs text-primary font-body hover:underline"
        >
          {showAll ? <ChevronDownIcon className="w-3.5 h-3.5" /> : <ChevronRightIcon className="w-3.5 h-3.5" />}
          {showAll ? 'Show fewer fields' : `Show all ${summary.rows.length} checklist fields`}
        </button>
      )}
    </div>
  )
}

function ChecklistRowTr({ row }: { row: ChecklistRow }) {
  return (
    <tr className="border-b border-border/40 last:border-0">
      <td className="py-2 pr-2 align-top w-6">{statusIcon(row.status)}</td>
      <td className="py-2 pr-2 text-muted-foreground align-top whitespace-nowrap">{row.label}</td>
      <td className="py-2 text-foreground align-top">{row.value}</td>
    </tr>
  )
}

export function FeasibilityAdvancedDetails(props: {
  disabled?: boolean
  existingBuildingYear: string
  existingUnits: string
  existingBuildingPlan: string
  rsoReplacementPolicy: string
  onExistingBuildingYear: (v: string) => void
  onExistingUnits: (v: string) => void
  onExistingBuildingPlan: (v: 'demolish' | 'keep_rear_development' | 'partial_demolition' | '') => void
  onRsoReplacementPolicy: (v: 'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope' | '') => void
}) {
  const year = Number.parseInt(props.existingBuildingYear, 10)
  const units = Number.parseInt(props.existingUnits, 10)
  const suggestOpen =
    (Number.isFinite(year) && year > 0 && year < 1978) ||
    (Number.isFinite(units) && units > 0)

  return (
    <FeasibilityAccordion
      title="Development intent"
      subtitle="Optional — demolition and RSO replacement assumptions"
      defaultOpen={suggestOpen}
      badge={
        suggestOpen ? (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
            Recommended
          </span>
        ) : (
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            Optional
          </span>
        )
      }
    >
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="wizard-existing-year" className="font-body text-xs">
            Existing building year
          </Label>
          <Input
            id="wizard-existing-year"
            type="number"
            placeholder="e.g. 1965"
            value={props.existingBuildingYear}
            onChange={(e) => props.onExistingBuildingYear(e.target.value)}
            disabled={props.disabled}
            className="font-body h-9"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="wizard-existing-units" className="font-body text-xs">
            Existing units
          </Label>
          <Input
            id="wizard-existing-units"
            type="number"
            placeholder="e.g. 4"
            value={props.existingUnits}
            onChange={(e) => props.onExistingUnits(e.target.value)}
            disabled={props.disabled}
            className="font-body h-9"
          />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="font-body text-xs">Existing building plan</Label>
          <select
            value={props.existingBuildingPlan}
            onChange={(e) =>
              props.onExistingBuildingPlan(
                e.target.value as 'demolish' | 'keep_rear_development' | 'partial_demolition' | '',
              )
            }
            disabled={props.disabled}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-body"
          >
            <option value="">Not specified</option>
            <option value="demolish">Demolish existing building</option>
            <option value="keep_rear_development">Keep building, develop rear only</option>
            <option value="partial_demolition">Partial demolition + new construction</option>
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label className="font-body text-xs">RSO replacement policy</Label>
          <select
            value={props.rsoReplacementPolicy}
            onChange={(e) =>
              props.onRsoReplacementPolicy(
                e.target.value as 'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope' | '',
              )
            }
            disabled={props.disabled}
            className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm font-body"
          >
            <option value="">Not specified</option>
            <option value="proportional_removed_units">Replace only removed RSO units</option>
            <option value="full_if_any_demo">Full replacement if any demolition</option>
            <option value="auto_by_scope">Auto by demolition scope</option>
          </select>
        </div>
      </div>
    </FeasibilityAccordion>
  )
}

export type ZimasUiStatus = 'idle' | 'loading' | 'success' | 'select' | 'error'

export function FeasibilityZimasSearchPanel(props: {
  city: string
  address: string
  disabled?: boolean
  isLookingUp: boolean
  canLookup: boolean
  status: ZimasUiStatus
  statusMessage: string
  locked?: boolean
  onAddressChange: (value: string) => void
  onAddressFocus?: () => void
  onRefresh: () => void
  suggestions?: React.ReactNode
}) {
  const showPulse = props.isLookingUp

  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-emerald-600/20 bg-emerald-600/[0.04] p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold font-body text-foreground">ZIMAS property lookup</p>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              City: <span className="font-medium text-foreground">{props.city || '—'}</span>
              {' · '}
              Street line only (Los Angeles parcels default to LA, CA)
            </p>
          </div>
          {showPulse && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 dark:text-emerald-300 shrink-0">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
              </span>
              Working…
            </span>
          )}
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="feasibility-zimas-address"
              placeholder="e.g. 3723 Rosemead Ave"
              value={props.address}
              onChange={(e) => props.onAddressChange(e.target.value)}
              onFocus={() => props.onAddressFocus?.()}
              disabled={props.disabled || props.locked}
              className={cn(
                'font-body h-11 bg-background/80 transition-shadow',
                showPulse && 'ring-2 ring-emerald-600/25 border-emerald-600/40',
              )}
              autoComplete="off"
            />
            {props.suggestions}
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={props.onRefresh}
            disabled={props.disabled || props.isLookingUp || !props.canLookup}
            className="shrink-0 font-body h-11 border-emerald-600/30 hover:bg-emerald-600/10 hover:text-emerald-800 dark:hover:text-emerald-200"
          >
            {props.isLookingUp ? (
              <Loader2Icon className="w-4 h-4 animate-spin" />
            ) : (
              <SearchIcon className="w-4 h-4" />
            )}
            <span className="ml-2 hidden sm:inline">{props.isLookingUp ? 'Looking up' : 'Refresh'}</span>
          </Button>
        </div>

        {props.status !== 'idle' && props.statusMessage && (
          <p
            className={cn(
              'text-xs font-body flex items-center gap-1.5 transition-opacity duration-300',
              props.status === 'success' && 'text-emerald-700 dark:text-emerald-300',
              props.status === 'select' && 'text-emerald-700 dark:text-emerald-300',
              props.status === 'error' && 'text-amber-600',
              props.status === 'loading' && 'text-muted-foreground',
            )}
          >
            {props.status === 'success' && <CheckCircle2Icon className="w-3.5 h-3.5 shrink-0" />}
            {props.status === 'error' && <AlertTriangleIcon className="w-3.5 h-3.5 shrink-0" />}
            {props.status === 'loading' && <Loader2Icon className="w-3.5 h-3.5 shrink-0 animate-spin" />}
            {props.statusMessage}
          </p>
        )}
        {props.locked && (
          <p className="text-xs font-body text-emerald-700/90 dark:text-emerald-300/90 flex items-center gap-1">
            <ShieldCheckIcon className="w-3.5 h-3.5" />
            Parcel locked — change the address above to unlock
          </p>
        )}
      </div>
    </div>
  )
}

export function FeasibilityAddressBreakdown(props: {
  number: string
  direction: string
  streetName: string
  streetType: string
  unit: string
  city: string
  state: string
  zip: string
  disabled?: boolean
  locked?: boolean
  onNumber: (v: string) => void
  onDirection: (v: string) => void
  onStreetName: (v: string) => void
  onStreetType: (v: string) => void
  onUnit: (v: string) => void
  onCity: (v: string) => void
  onState: (v: string) => void
  onZip: (v: string) => void
  directionsListId?: string
  streetTypesListId?: string
}) {
  const fieldCls = 'font-body h-9 bg-muted/20 border-border/50'
  const breakdown = (
    <div className="grid gap-2 sm:grid-cols-6">
      <div className="sm:col-span-1 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">No.</Label>
        <Input placeholder="3723" value={props.number} onChange={(e) => props.onNumber(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-1 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">Dir</Label>
        <Input list={props.directionsListId} placeholder="N" value={props.direction} onChange={(e) => props.onDirection(e.target.value.toUpperCase())} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">Street</Label>
        <Input placeholder="Rosemead" value={props.streetName} onChange={(e) => props.onStreetName(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-1 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">Type</Label>
        <Input list={props.streetTypesListId} placeholder="Ave" value={props.streetType} onChange={(e) => props.onStreetType(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-1 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">Unit</Label>
        <Input placeholder="—" value={props.unit} onChange={(e) => props.onUnit(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">City</Label>
        <Input placeholder="Los Angeles" value={props.city} onChange={(e) => props.onCity(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">State</Label>
        <Input placeholder="CA" value={props.state} onChange={(e) => props.onState(e.target.value.toUpperCase())} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
      <div className="sm:col-span-2 space-y-1">
        <Label className="text-[10px] uppercase tracking-wide text-muted-foreground font-body">ZIP</Label>
        <Input placeholder="90032" value={props.zip} onChange={(e) => props.onZip(e.target.value)} disabled={props.disabled || props.locked} className={fieldCls} />
      </div>
    </div>
  )

  return (
    <FeasibilityAccordion title="Address breakdown" subtitle="Optional detail — auto-filled from lookup" defaultOpen={false}>
      {breakdown}
    </FeasibilityAccordion>
  )
}
