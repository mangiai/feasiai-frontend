'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { FileDropzone, type UploadFile } from '@/components/file-dropzone'
import {
  ArrowLeftIcon,
  BuildingIcon,
  FileTextIcon,
  RocketIcon,
  Loader2Icon,
  CheckCircle2Icon,
  BarChart3Icon,
  SearchIcon,
  AlertTriangleIcon,
  FlaskConicalIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import { useAddressAutocomplete } from '@/hooks/use-address-autocomplete'
import { useWorkspace } from '@/hooks/use-workspace'
import {
  ADDRESS_DIRECTIONS,
  STREET_TYPES,
  composeStructuredAddress,
  parseStructuredAddress,
  type StructuredAddress,
} from '@/lib/structured-address'
import { parseCachedZimasLookupResult, type CachedZimasLookupResult } from '@/lib/zimas-cache'
import { extractLotSizeFromRawRows, extractLotSizeFromZimasCache } from '@/lib/feasibility-checklist-summary'
import { isZimasLookupVerified } from '@/lib/zimas-verification'
import { ZimasApnFallback } from '@/components/zimas-apn-fallback'
import {
  FeasibilityAccordion,
  FeasibilityAddressBreakdown,
  FeasibilityAdvancedDetails,
  FeasibilityReviewCard,
  FeasibilityWizardBreadcrumbs,
  FeasibilityWizardProgress,
  FeasibilityWizardShell,
  FeasibilityZimasSearchPanel,
  ZimasPropertySummaryCard,
  type FeasibilityWizardStep,
} from '@/components/feasibility-wizard'
import {
  buildZimasStreetLine,
  hasMinAddressForZimas,
  LA_CITY_DEFAULT,
  LA_STATE_DEFAULT,
  withLaCityDefaults,
} from '@/lib/zimas-search-address'

type FlowType = 'city-review' | 'corrections-analysis' | 'feasibility-analysis'

const DEFAULT_TEST_ADDRESS = {
  number: '3686',
  direction: 'E',
  streetName: 'Colorado',
  streetType: 'Blvd',
  unit: '',
  city: 'Pasadena',
  state: 'CA',
  zip: '91107',
  formatted: '3686-3698 E Colorado Blvd, Pasadena, CA 91107',
}

// Realistic test data for full pipeline validation (3686-3698 E Colorado Blvd, Pasadena)
const DEFAULT_TEST_FIELDS = {
  projectName: '1447 S Shenandoah St — Feasibility',
  zone: '[Q]R3-1-O',
  lotSize: '6499',
  tocTier: '2',
  chipTier: 'T-1',
  lotWidth: '50',
  lotDepth: '130',
  existingBuildingYear: '1929',
  existingUnits: '2',
  rsoUnits: '2',
  existingParking: '1',
  hazardZones: 'Methane Hazard Site, Alquist-Priolo Fault Zone, Liquefaction',
  specificPlan: 'Specific Plan / Q-Condition / D-Condition',
  existingBuildingPlan: 'partial_demolition' as const,
  rsoReplacementPolicy: 'proportional_removed_units' as const,
  transitProximity: true as boolean | null,
}

// Cities with dedicated offline data — faster + more accurate
const ONBOARDED_CITIES = ['Placentia', 'Buena Park']

// All 88 incorporated cities in Los Angeles County
const LA_COUNTY_CITIES = [
  // Onboarded (dedicated skill data)
  'Placentia',
  'Buena Park',
  // LA County A-Z
  'Agoura Hills',
  'Alhambra',
  'Arcadia',
  'Artesia',
  'Avalon',
  'Azusa',
  'Baldwin Park',
  'Bell',
  'Bell Gardens',
  'Bellflower',
  'Beverly Hills',
  'Bradbury',
  'Burbank',
  'Calabasas',
  'Carson',
  'Cerritos',
  'Claremont',
  'Commerce',
  'Compton',
  'Covina',
  'Cudahy',
  'Culver City',
  'Diamond Bar',
  'Downey',
  'Duarte',
  'El Monte',
  'El Segundo',
  'Gardena',
  'Glendale',
  'Glendora',
  'Hawaiian Gardens',
  'Hawthorne',
  'Hermosa Beach',
  'Hidden Hills',
  'Huntington Park',
  'Industry',
  'Inglewood',
  'Irwindale',
  'La Cañada Flintridge',
  'La Habra Heights',
  'La Mirada',
  'La Puente',
  'La Verne',
  'Lakewood',
  'Lancaster',
  'Lawndale',
  'Lomita',
  'Long Beach',
  'Los Angeles',
  'Lynwood',
  'Malibu',
  'Manhattan Beach',
  'Maywood',
  'Monrovia',
  'Montebello',
  'Monterey Park',
  'Norwalk',
  'Palmdale',
  'Palos Verdes Estates',
  'Paramount',
  'Pasadena',
  'Pico Rivera',
  'Pomona',
  'Rancho Palos Verdes',
  'Redondo Beach',
  'Rolling Hills',
  'Rolling Hills Estates',
  'Rosemead',
  'San Dimas',
  'San Fernando',
  'San Gabriel',
  'San Marino',
  'Santa Clarita',
  'Santa Fe Springs',
  'Santa Monica',
  'Sierra Madre',
  'Signal Hill',
  'South El Monte',
  'South Gate',
  'South Pasadena',
  'Temple City',
  'Torrance',
  'Vernon',
  'Walnut',
  'West Covina',
  'West Hollywood',
  'Westlake Village',
  'Whittier',
]

// Common aliases users type for Los Angeles City
const LA_CITY_ALIASES = [
  'LA',
  'L.A.',
  'LA City',
  'Los Angeles City',
  'City of Los Angeles',
  'LA County',
  'Los Angeles County',
]

const CITY_SUGGESTIONS = Array.from(new Set([...LA_COUNTY_CITIES, ...LA_CITY_ALIASES]))
const ZIMAS_AUTO_LOOKUP_DELAY_MS = 700

type ZimasLookupFields = {
  zone?: string
  toc_tier?: string
  chip_tier?: string
  toia_tier?: string
  oc_tier?: string
  ct_tier?: string
  transit_proximity?: boolean
  high_quality_transit?: boolean
  specific_plan?: string
  general_plan_land_use?: string
  subarea?: string
  cpio?: string
  cugu?: string
  historic_preservation?: string
  historic_places_la?: string
  year_built?: number | null
  number_of_units?: number | null
  use_code?: string
  use_code_description?: string
  apn?: string
  lot_size?: number | null
  flood_zone?: string
  very_high_fire_hazard_severity_zone?: string
  liquefaction?: string
  landslide?: string
  coastal_zone?: string
  methane_hazard_site?: string
  detail_fields?: Record<string, Record<string, unknown>>
  q_condition_links?: Array<{ description?: string; url?: string }>
}

interface FlowOption {
  id: FlowType
  icon: React.ElementType
  title: string
  description: string
  fileHint: string
}

const FLOW_OPTIONS: FlowOption[] = [
  {
    id: 'feasibility-analysis',
    icon: BarChart3Icon,
    title: 'Feasibility Analysis',
    description: 'Evaluate up to 11 entitlement strategies for a property using CHIP ordinance data.',
    fileHint: 'Upload architectural plan PDF(s) — optional',
  },
]

export default function NewProjectPage() {
  const router = useRouter()
  const { currentWorkspace } = useWorkspace()

  // Form state
  const [flowType, setFlowType] = useState<FlowType | null>('feasibility-analysis')
  const [projectName, setProjectName] = useState('')
  const _dev = process.env.NODE_ENV === 'development'
  const [city, setCity] = useState('')
  const [address, setAddress] = useState('')
  const [addressNumber, setAddressNumber] = useState('')
  const [addressDirection, setAddressDirection] = useState('')
  const [addressStreetName, setAddressStreetName] = useState('')
  const [addressStreetType, setAddressStreetType] = useState('')
  const [addressUnit, setAddressUnit] = useState('')
  const [addressCity, setAddressCity] = useState('')
  const [addressState, setAddressState] = useState('')
  const [addressZip, setAddressZip] = useState('')
  const [files, setFiles] = useState<UploadFile[]>([])

  // Feasibility-specific fields
  const [zone, setZone] = useState('')
  const [lotSize, setLotSize] = useState('')
  const [tocTier, setTocTier] = useState('')
  const [chipTier, setChipTier] = useState('')
  const [lotWidth, setLotWidth] = useState('')
  const [lotDepth, setLotDepth] = useState('')
  // Extended feasibility fields (existing development + site constraints)
  const [existingBuildingYear, setExistingBuildingYear] = useState('')
  const [existingUnits, setExistingUnits] = useState('')
  const [rsoUnits, setRsoUnits] = useState('')
  const [existingParking, setExistingParking] = useState('')
  const [hazardZones, setHazardZones] = useState('')
  const [transitProximity, setTransitProximity] = useState<boolean | null>(null)
  const [specificPlan, setSpecificPlan] = useState('')
  const [existingBuildingPlan, setExistingBuildingPlan] = useState<'demolish' | 'keep_rear_development' | 'partial_demolition' | ''>('')
  const [rsoReplacementPolicy, setRsoReplacementPolicy] = useState<'proportional_removed_units' | 'full_if_any_demo' | 'auto_by_scope' | ''>('')

  // ZIMAS auto-lookup state
  const [isLookingUpZimas, setIsLookingUpZimas] = useState(false)
  const [zimasStatus, setZimasStatus] = useState<'idle' | 'success' | 'error' | 'select'>('idle')
  const [zimasMessage, setZimasMessage] = useState('')
  const [showApnFallback, setShowApnFallback] = useState(false)
  const [zimasLocked, setZimasLocked] = useState(false)
  const [zimasLookupMethod, setZimasLookupMethod] = useState<'address' | 'apn' | null>(null)
  const [zimasLockedApn, setZimasLockedApn] = useState('')
  const [zimasAddressOptions, setZimasAddressOptions] = useState<Array<{ index: number; address: string; score?: number; recommended?: boolean }>>([])
  const [selectedAddressIdx, setSelectedAddressIdx] = useState<number | null>(null)
  const [isResolvingAddressOption, setIsResolvingAddressOption] = useState(false)
  const [zimasLookupCache, setZimasLookupCache] = useState<CachedZimasLookupResult | null>(null)
  const zimasLookupInFlightRef = useRef(false)
  const lastAutoLookupKeyRef = useRef<string | null>(null)

  // Address autocomplete
  const {
    suggestions: addressSuggestions,
    isLoading: isLoadingSuggestions,
    isOpen: isSuggestionsOpen,
    fetchSuggestions,
    resolvePlace,
    close: closeSuggestions,
  } = useAddressAutocomplete(300)
  const addressWrapperRef = useRef<HTMLDivElement>(null)

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (addressWrapperRef.current && !addressWrapperRef.current.contains(e.target as Node)) {
        closeSuggestions()
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [closeSuggestions])

  const [feasibilityStep, setFeasibilityStep] = useState<FeasibilityWizardStep>(1)

  // Process state
  const [step, setStep] = useState<'configure' | 'uploading' | 'done'>('configure')
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Mounted guard — prevents hydration mismatch between SSR and client
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const isOnboarded = ONBOARDED_CITIES.some(
    (c) => c.toLowerCase() === city.toLowerCase().trim(),
  )
  const resolvedAddressCity = (addressCity || city).trim()

  const clearZimasLock = useCallback(() => {
    setZimasLocked(false)
    setZimasLookupMethod(null)
    setZimasLockedApn('')
  }, [])

  const resetZimasUi = useCallback(() => {
    if (zimasStatus !== 'idle') {
      setZimasStatus('idle')
      setZimasMessage('')
      setZimasAddressOptions([])
      setSelectedAddressIdx(null)
      setShowApnFallback(false)
    }
  }, [zimasStatus])

  const parseFirstNumber = useCallback((value: string): number | null => {
    const matched = value.replace(/,/g, '').match(/\d+(\.\d+)?/)
    if (!matched) return null
    const parsed = Number.parseFloat(matched[0])
    return Number.isFinite(parsed) ? parsed : null
  }, [])

  const extractDetailValues = useCallback((value: unknown): string[] => {
    if (!value) return []
    if (Array.isArray(value)) {
      return value
        .map((item) => (item && typeof item === 'object' ? (item as { value?: string }).value : undefined))
        .map((item) => item?.trim() || '')
        .filter(Boolean)
    }
    if (typeof value === 'object') {
      const obj = value as { value?: string }
      return obj.value?.trim() ? [obj.value.trim()] : []
    }
    return []
  }, [])

  const readDetailValues = useCallback((
    details: Record<string, Record<string, unknown>>,
    section: string,
    key: string,
  ): string[] => {
    return extractDetailValues(details?.[section]?.[key])
  }, [extractDetailValues])

  const normalizeZimasText = useCallback((value: string | null | undefined): string => {
    const trimmed = value?.trim() ?? ''
    if (!trimmed) return ''

    const normalized = trimmed.toUpperCase()
    if (['N/A', 'NONE', 'NOT ELIGIBLE', 'NULL', 'UNKNOWN'].includes(normalized)) {
      return ''
    }

    return trimmed
  }, [])

  const readDetailFromCandidates = useCallback((
    details: Record<string, Record<string, unknown>>,
    sections: string[],
    keys: string[],
  ): string => {
    for (const section of sections) {
      for (const key of keys) {
        const values = readDetailValues(details, section, key)
        for (const value of values) {
          const normalized = normalizeZimasText(value)
          if (normalized) return normalized
        }
      }
    }

    return ''
  }, [normalizeZimasText, readDetailValues])

  const readDetailValuesFromCandidates = useCallback((
    details: Record<string, Record<string, unknown>>,
    sections: string[],
    keys: string[],
  ): string[] => {
    const collected: string[] = []
    for (const section of sections) {
      for (const key of keys) {
        const values = readDetailValues(details, section, key)
        for (const value of values) {
          const normalized = normalizeZimasText(value)
          if (normalized) collected.push(normalized)
        }
      }
    }
    return collected
  }, [normalizeZimasText, readDetailValues])

  const pickBestNumericValue = useCallback((
    values: Array<string | number | null | undefined>,
    options?: { min?: number; max?: number; preferMax?: boolean; excludeZero?: boolean },
  ): number | null => {
    const parsed = values
      .map((value) => (typeof value === 'number' ? value : parseFirstNumber(String(value ?? ''))))
      .filter((value): value is number => value !== null && Number.isFinite(value))
      .filter((value) => (options?.excludeZero ? value !== 0 : true))
      .filter((value) => (options?.min !== undefined ? value >= options.min : true))
      .filter((value) => (options?.max !== undefined ? value <= options.max : true))

    if (!parsed.length) return null
    if (options?.preferMax === false) return parsed[0]
    return Math.max(...parsed)
  }, [parseFirstNumber])

  const extractApn = useCallback((values: string[]): string => {
    for (const value of values) {
      const match = value.replace(/,/g, '').match(/\b\d{7,12}\b/)
      if (match?.[0]) return match[0]
    }
    return ''
  }, [])

  const deriveChipTier = useCallback((fields: ZimasLookupFields): string => {
    return normalizeZimasText(fields.chip_tier) ||
      normalizeZimasText(fields.toia_tier) ||
      normalizeZimasText(fields.oc_tier) ||
      normalizeZimasText(fields.ct_tier)
  }, [normalizeZimasText])

  const getStructuredAddress = useCallback((): StructuredAddress => ({
    number: addressNumber,
    direction: addressDirection,
    streetName: addressStreetName,
    streetType: addressStreetType,
    unit: addressUnit,
    city: addressCity || city,
    state: addressState,
    zip: addressZip,
  }), [
    addressCity,
    addressDirection,
    addressNumber,
    addressState,
    addressStreetName,
    addressStreetType,
    addressUnit,
    addressZip,
    city,
  ])

  const structuredForZimas = useMemo(
    () => withLaCityDefaults(getStructuredAddress()),
    [getStructuredAddress],
  )
  const zimasStreetLine = useMemo(
    () => buildZimasStreetLine(structuredForZimas),
    [structuredForZimas],
  )
  const hasRequiredAddressParts = hasMinAddressForZimas(structuredForZimas)

  const isPositiveHazardFlag = useCallback((value: string): boolean => {
    const normalized = value.trim().toLowerCase()
    if (!normalized) return false
    return !['no', 'none', 'not mapped', 'n/a', 'na', '0'].includes(normalized)
  }, [])

  const applyZimasFieldsToForm = useCallback((
    fields: ZimasLookupFields,
    options?: { raw_data?: unknown },
  ) => {
    const details = (fields.detail_fields || {}) as Record<string, Record<string, unknown>>
    const assessorSections = ['assessor', 'assessor_information', 'housing']
    const addressSections = ['address_legal', 'address_legal_information', 'assessor', 'assessor_information', 'housing']
    const additionalSections = ['additional', 'additional_information']
    const seismicSections = ['seismic_hazards']

    const zoneValue = normalizeZimasText(fields.zone)
    const tocTierValue = normalizeZimasText(fields.toc_tier)
    const chipTierValue = deriveChipTier(fields)
    const specificPlanValue = normalizeZimasText(fields.specific_plan)

    const lotArea =
      (fields.lot_size != null && Number.isFinite(Number(fields.lot_size)) && Number(fields.lot_size) > 0
        ? String(Math.round(Number(fields.lot_size)))
        : '') ||
      readDetailFromCandidates(details, addressSections, [
        'lot_parcel_area_calculated',
        'lot_parcel_area',
        'lot_parcel_area_sq_ft',
      ]) ||
      extractLotSizeFromRawRows(options?.raw_data)
    const apn = normalizeZimasText(fields.apn) || extractApn(
      readDetailValuesFromCandidates(details, addressSections, ['assessor_parcel_no_apn']),
    )
    const yearBuiltValues = readDetailValuesFromCandidates(details, assessorSections, ['year_built'])
    const unitsValues = readDetailValuesFromCandidates(details, assessorSections, ['number_of_units'])
    const useCode = normalizeZimasText(fields.use_code) ||
      readDetailFromCandidates(details, assessorSections, ['use_code'])
    const lotWidthRaw = readDetailFromCandidates(
      details,
      ['address_legal', 'address_legal_information', 'assessor', 'assessor_information', 'housing'],
      ['lot_parcel_width', 'lot_width', 'parcel_width', 'lot_frontage', 'frontage', 'frontage_ft'],
    )
    const lotDepthRaw = readDetailFromCandidates(
      details,
      ['address_legal', 'address_legal_information', 'assessor', 'assessor_information', 'housing'],
      ['lot_parcel_depth', 'lot_depth', 'parcel_depth', 'lot_length', 'depth', 'depth_ft'],
    )
    const existingParkingRaw = readDetailFromCandidates(
      details,
      ['assessor', 'assessor_information', 'housing', 'building'],
      ['number_of_parking_spaces', 'parking_spaces', 'parking_space_count', 'total_parking_spaces', 'total_parking'],
    )
    const rsoUnitsRaw = readDetailFromCandidates(
      details,
      ['housing', 'additional', 'additional_information'],
      ['rso_units', 'rent_stabilized_units', 'rent_stabilization_ordinance_units'],
    )

    const lotAreaNumber = parseFirstNumber(lotArea)
    const yearBuiltNumber =
      pickBestNumericValue(
        [
          fields.year_built,
          ...yearBuiltValues,
        ],
        { min: 1800, max: 2100, preferMax: true, excludeZero: true },
      )
    const existingUnitsNumber =
      pickBestNumericValue(
        [
          fields.number_of_units,
          ...unitsValues,
        ],
        { min: 1, max: 1000, preferMax: true, excludeZero: true },
      )
    const lotWidthNumber = parseFirstNumber(lotWidthRaw)
    const lotDepthNumber = parseFirstNumber(lotDepthRaw)
    const existingParkingNumber = parseFirstNumber(existingParkingRaw)
    const rsoUnitsNumber = parseFirstNumber(rsoUnitsRaw)
    const yearBuilt = yearBuiltNumber !== null ? String(Math.trunc(yearBuiltNumber)) : ''
    const units = existingUnitsNumber !== null ? String(Math.trunc(existingUnitsNumber)) : ''
    const useCodeSummary = useCode || normalizeZimasText(fields.use_code_description)

    const hazardCandidates: Array<{ label: string; value: string }> = [
      { label: 'Flood Zone', value: normalizeZimasText(fields.flood_zone) || readDetailFromCandidates(details, additionalSections, ['flood_zone']) },
      { label: 'Very High Fire Hazard Severity Zone', value: normalizeZimasText(fields.very_high_fire_hazard_severity_zone) || readDetailFromCandidates(details, additionalSections, ['very_high_fire_hazard_severity_zone']) },
      { label: 'Landslide', value: normalizeZimasText(fields.landslide) || readDetailFromCandidates(details, seismicSections, ['landslide']) },
      { label: 'Liquefaction', value: normalizeZimasText(fields.liquefaction) || readDetailFromCandidates(details, seismicSections, ['liquefaction']) },
      { label: 'Coastal Zone', value: normalizeZimasText(fields.coastal_zone) || readDetailFromCandidates(details, additionalSections, ['coastal_zone']) },
      { label: 'Methane Hazard Site', value: normalizeZimasText(fields.methane_hazard_site) || readDetailFromCandidates(details, additionalSections, ['methane_hazard_site']) },
    ]

    const detectedHazards = hazardCandidates
      .filter((hazard) => isPositiveHazardFlag(hazard.value))
      .map((hazard) => `${hazard.label}: ${hazard.value}`)

    if (fields.historic_preservation === 'Yes' || fields.historic_places_la === 'Yes') {
      detectedHazards.push('Historic')
    }

    setZone(zoneValue)
    setTocTier(tocTierValue)
    setChipTier(chipTierValue)
    setSpecificPlan(specificPlanValue)
    setTransitProximity(typeof fields.transit_proximity === 'boolean' ? fields.transit_proximity : null)
    setLotSize(lotAreaNumber !== null ? String(Math.round(lotAreaNumber)) : '')
    setExistingBuildingYear(yearBuilt)
    setExistingUnits(units)
    if (lotWidthNumber !== null) setLotWidth(String(lotWidthNumber))
    if (lotDepthNumber !== null) setLotDepth(String(lotDepthNumber))
    if (existingParkingNumber !== null) setExistingParking(String(Math.trunc(existingParkingNumber)))
    if (rsoUnitsNumber !== null) setRsoUnits(String(Math.trunc(rsoUnitsNumber)))
    setHazardZones(detectedHazards.join(', '))

    return {
      hasZoningData: Boolean(
        zoneValue ||
        tocTierValue ||
        normalizeZimasText(fields.toia_tier) ||
        normalizeZimasText(fields.oc_tier) ||
        normalizeZimasText(fields.ct_tier),
      ),
      hasFeasibilityData: Boolean(apn || lotArea || yearBuilt || units || useCodeSummary || lotWidthRaw || lotDepthRaw || existingParkingRaw || rsoUnitsRaw),
    }
  }, [deriveChipTier, extractApn, isPositiveHazardFlag, normalizeZimasText, parseFirstNumber, pickBestNumericValue, readDetailFromCandidates, readDetailValuesFromCandidates])

  const applyStructuredAddress = useCallback((
    updates: Partial<StructuredAddress>,
    options?: { formatted?: string; skipZimasReset?: boolean },
  ) => {
    const current = getStructuredAddress()
    const next: StructuredAddress = {
      number: updates.number !== undefined ? updates.number : current.number,
      direction: updates.direction !== undefined ? updates.direction : current.direction,
      streetName: updates.streetName !== undefined ? updates.streetName : current.streetName,
      streetType: updates.streetType !== undefined ? updates.streetType : current.streetType,
      unit: updates.unit !== undefined ? updates.unit : current.unit,
      city: updates.city !== undefined ? updates.city : current.city,
      state: updates.state !== undefined ? updates.state : current.state,
      zip: updates.zip !== undefined ? updates.zip : current.zip,
    }

    setAddressNumber(next.number)
    setAddressDirection(next.direction)
    setAddressStreetName(next.streetName)
    setAddressStreetType(next.streetType)
    setAddressUnit(next.unit)
    setAddressCity(next.city)
    setAddressState(next.state)
    setAddressZip(next.zip)
    setCity(next.city)
    setAddress(options?.formatted ?? composeStructuredAddress(next))
    if (!options?.skipZimasReset) {
      setZimasLookupCache(null)
      lastAutoLookupKeyRef.current = null
      clearZimasLock()
      resetZimasUi()
    }
  }, [clearZimasLock, getStructuredAddress, resetZimasUi])

  const handleAddressInputChange = useCallback((nextAddress: string) => {
    const parsed = parseStructuredAddress(nextAddress, getStructuredAddress())
    applyStructuredAddress(parsed, { formatted: nextAddress })
    fetchSuggestions(nextAddress)
  }, [applyStructuredAddress, fetchSuggestions, getStructuredAddress])

  const handleFilesAdded = useCallback((newFiles: File[]) => {
    const uploads: UploadFile[] = newFiles.map((f) => ({
      file: f,
      id: `${f.name}-${f.size}-${Date.now()}`,
      status: 'pending' as const,
      progress: 0,
    }))
    setFiles((prev) => [...prev, ...uploads])
  }, [])

  const handleFileRemoved = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id))
  }, [])

  // Determine file_type based on flow + filename hints
  const inferFileType = (filename: string): string => {
    const lower = filename.toLowerCase()
    if (lower.includes('correction') || lower.includes('comment') || lower.includes('redline')) {
      return 'corrections-letter'
    }
    return 'plan-binder'
  }

  const isFeasibility = flowType === 'feasibility-analysis'

  useEffect(() => {
    if (flowType === 'feasibility-analysis') {
      setFeasibilityStep(1)
    }
  }, [flowType])

  // ── Fill all fields with realistic test data ──
  const handleFillTestData = useCallback(() => {
    setProjectName(DEFAULT_TEST_FIELDS.projectName)
    applyStructuredAddress(
      {
        number: DEFAULT_TEST_ADDRESS.number,
        direction: DEFAULT_TEST_ADDRESS.direction,
        streetName: DEFAULT_TEST_ADDRESS.streetName,
        streetType: DEFAULT_TEST_ADDRESS.streetType,
        unit: DEFAULT_TEST_ADDRESS.unit,
        city: DEFAULT_TEST_ADDRESS.city,
        state: DEFAULT_TEST_ADDRESS.state,
        zip: DEFAULT_TEST_ADDRESS.zip,
      },
      { formatted: DEFAULT_TEST_ADDRESS.formatted },
    )
    setZone(DEFAULT_TEST_FIELDS.zone)
    setLotSize(DEFAULT_TEST_FIELDS.lotSize)
    setTocTier(DEFAULT_TEST_FIELDS.tocTier)
    setChipTier(DEFAULT_TEST_FIELDS.chipTier)
    setLotWidth(DEFAULT_TEST_FIELDS.lotWidth)
    setLotDepth(DEFAULT_TEST_FIELDS.lotDepth)
    setExistingBuildingYear(DEFAULT_TEST_FIELDS.existingBuildingYear)
    setExistingUnits(DEFAULT_TEST_FIELDS.existingUnits)
    setRsoUnits(DEFAULT_TEST_FIELDS.rsoUnits)
    setExistingParking(DEFAULT_TEST_FIELDS.existingParking)
    setHazardZones(DEFAULT_TEST_FIELDS.hazardZones)
    setSpecificPlan(DEFAULT_TEST_FIELDS.specificPlan)
    setExistingBuildingPlan(DEFAULT_TEST_FIELDS.existingBuildingPlan)
    setRsoReplacementPolicy(DEFAULT_TEST_FIELDS.rsoReplacementPolicy)
    setTransitProximity(DEFAULT_TEST_FIELDS.transitProximity)
  }, [applyStructuredAddress])

  const applyResolvedZimasAddress = useCallback((resolvedLine: string) => {
    const parsed = parseStructuredAddress(resolvedLine, getStructuredAddress())
    applyStructuredAddress(
      {
        ...parsed,
        city: parsed.city || LA_CITY_DEFAULT,
        state: parsed.state || LA_STATE_DEFAULT,
      },
      { formatted: resolvedLine, skipZimasReset: true },
    )
  }, [applyStructuredAddress, getStructuredAddress])

  /** Street-address lookup failed (not found / no zoning) — offer APN, never during multi-address pick. */
  const offerApnAfterAddressLookupFailure = useCallback((message: string) => {
    setZimasAddressOptions([])
    setSelectedAddressIdx(null)
    setZimasStatus('error')
    setZimasMessage(message)
    setShowApnFallback(true)
  }, [])

  const lockZimasResolution = useCallback((
    method: 'address' | 'apn',
    cache: CachedZimasLookupResult,
    resolvedLine: string,
    apnDigits?: string,
  ) => {
    setZimasLookupCache(cache)
    setZimasLocked(true)
    setZimasLookupMethod(method)
    setZimasLockedApn(apnDigits ?? '')
    applyResolvedZimasAddress(resolvedLine)
    lastAutoLookupKeyRef.current = buildZimasStreetLine(
      parseStructuredAddress(resolvedLine, getStructuredAddress()),
    ).toLowerCase()
  }, [applyResolvedZimasAddress, getStructuredAddress])

  // ── ZIMAS auto-lookup handler ──
  const handleZimasLookup = useCallback(async (
    selectedIndex?: number,
    options?: { forceRefresh?: boolean; apn?: string },
  ) => {
    if (zimasLookupInFlightRef.current) {
      return
    }

    const apnDigits = options?.apn?.replace(/\D/g, '') ?? ''
    if (!apnDigits && !hasRequiredAddressParts && selectedIndex === undefined) {
      setZimasStatus('error')
      setZimasMessage('Enter house number and street name for ZIMAS lookup')
      return
    }

    const lookupAddress = apnDigits ? '' : zimasStreetLine
    if (!apnDigits && (!lookupAddress || lookupAddress.length < 3)) {
      setZimasStatus('error')
      setZimasMessage('Enter a valid street address first')
      return
    }

    const forceRefresh =
      options?.forceRefresh === true
      || selectedIndex !== undefined
      || Boolean(apnDigits)

    zimasLookupInFlightRef.current = true
    setIsLookingUpZimas(true)
    if (selectedIndex === undefined && !apnDigits) {
      setZimasLookupCache(null)
      clearZimasLock()
    }
    if (selectedIndex !== undefined) {
      setIsResolvingAddressOption(true)
    }
    if (!apnDigits) {
      setShowApnFallback(false)
    }
    setZimasStatus('idle')
    setZimasMessage('')

    const requestLookup = async (force: boolean) => {
      const res = await fetch('/api/zimas-lookup', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          address: lookupAddress || undefined,
          apn: apnDigits || undefined,
          selected_index: selectedIndex,
          force_refresh: force,
        }),
      })
      const data = await res.json()
      return { res, data }
    }

    try {
      let { res, data } = await requestLookup(forceRefresh)

      if (
        !apnDigits
        && selectedIndex === undefined
        && !data?.requires_selection
        && (!res.ok || !data?.success)
        && !forceRefresh
      ) {
        ;({ res, data } = await requestLookup(true))
      }

      if (res.status === 401) {
        setZimasStatus('error')
        setZimasMessage(
          data.code === 'SESSION_EXPIRED'
            ? 'Session expired — refresh the page or sign in again, then retry ZIMAS lookup.'
            : data.error || 'Sign in required for ZIMAS lookup',
        )
        return
      }

      if (data?.requires_selection && Array.isArray(data.address_options)) {
        setShowApnFallback(false)
        setZimasAddressOptions(data.address_options)
        const rec = data.address_options.find((o: { recommended?: boolean }) => o.recommended)
        setSelectedAddressIdx(rec ? rec.index : null)
        setZimasStatus('select')
        setZimasMessage(
          `${data.address_options.length} addresses found on ZIMAS — select the parcel you want, then confirm.`,
        )
        return
      }

      setZimasAddressOptions([])
      setSelectedAddressIdx(null)

      const cachedLookup = parseCachedZimasLookupResult(data)

      if (!apnDigits && (!res.ok || !data.success || !data.fields)) {
        offerApnAfterAddressLookupFailure(
          data.error
            || 'No ZIMAS match for this street address. Look up by Assessor Parcel Number (APN) below.',
        )
        return
      }

      if (apnDigits && (!res.ok || !data.success || !data.fields)) {
        setZimasStatus('error')
        setZimasMessage(data.error || 'APN lookup failed — verify the 10-digit APN on zimas.lacity.org.')
        setShowApnFallback(false)
        return
      }

      const { hasZoningData, hasFeasibilityData } = applyZimasFieldsToForm(
        data.fields as ZimasLookupFields,
        { raw_data: data.raw_data },
      )

      if (!apnDigits && !isZimasLookupVerified(cachedLookup)) {
        offerApnAfterAddressLookupFailure(
          'ZIMAS did not return zoning for this street address. Try Refresh ZIMAS or look up by APN below.',
        )
        return
      }

      if (apnDigits && !isZimasLookupVerified(cachedLookup)) {
        setZimasStatus('error')
        setZimasMessage('APN lookup did not return zoning data — verify the APN and try again.')
        setShowApnFallback(false)
        return
      }

      setShowApnFallback(false)
      const resolvedLine =
        typeof data.address === 'string' && data.address.trim()
          ? data.address.trim()
          : apnDigits
            ? lookupAddress || `APN ${apnDigits}`
            : zimasStreetLine

      if (cachedLookup) {
        lockZimasResolution(
          apnDigits ? 'apn' : 'address',
          cachedLookup,
          resolvedLine,
          apnDigits || undefined,
        )
      }

      if (!hasZoningData && !hasFeasibilityData) {
        clearZimasLock()
        setZimasLookupCache(null)
        if (!apnDigits) {
          offerApnAfterAddressLookupFailure(
            'No parcel data returned for this street address. Look up by APN below.',
          )
        } else {
          setZimasStatus('error')
          setZimasMessage('No parcel data returned for this APN.')
          setShowApnFallback(false)
        }
      } else if (!hasZoningData || !hasFeasibilityData) {
        setZimasStatus('success')
        setZimasMessage('Partial data found — zoning verified; some fields may need manual entry')
      } else {
        setZimasStatus('success')
        setZimasMessage(
          apnDigits
            ? `Verified by APN ${apnDigits} — address locked for this project`
            : 'ZIMAS verified — address locked for this project',
        )
      }
    } catch (_err) {
      if (!apnDigits) {
        offerApnAfterAddressLookupFailure('Network error during address lookup — retry or use APN below.')
      } else {
        setZimasStatus('error')
        setZimasMessage('Network error during APN lookup — try again.')
        setShowApnFallback(false)
      }
    } finally {
      setIsLookingUpZimas(false)
      setIsResolvingAddressOption(false)
      zimasLookupInFlightRef.current = false
    }
  }, [
    applyZimasFieldsToForm,
    clearZimasLock,
    hasRequiredAddressParts,
    lockZimasResolution,
    offerApnAfterAddressLookupFailure,
    zimasStreetLine,
  ])

  useEffect(() => {
    if (
      !isFeasibility ||
      step !== 'configure' ||
      feasibilityStep !== 2 ||
      !hasRequiredAddressParts ||
      isResolvingAddressOption ||
      zimasLocked
    ) {
      return
    }

    const autoLookupKey = zimasStreetLine.toLowerCase()

    if (!autoLookupKey.replaceAll('|', '') || autoLookupKey === lastAutoLookupKeyRef.current || zimasLookupInFlightRef.current) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      lastAutoLookupKeyRef.current = autoLookupKey
      void handleZimasLookup()
    }, ZIMAS_AUTO_LOOKUP_DELAY_MS)

    return () => window.clearTimeout(timeoutId)
  }, [
    handleZimasLookup,
    hasRequiredAddressParts,
    isFeasibility,
    isResolvingAddressOption,
    feasibilityStep,
    step,
    zimasLocked,
    zimasStreetLine,
  ])

  const zimasVerified = useMemo(
    () => !isFeasibility || isZimasLookupVerified(zimasLookupCache),
    [isFeasibility, zimasLookupCache],
  )

  const canFeasibilityStep1 =
    Boolean(isFeasibility && projectName.trim() && city.trim())
  const canFeasibilityStep2 = zimasVerified

  const advanceToFeasibilityStep2 = useCallback(() => {
    if (!hasMinAddressForZimas(getStructuredAddress())) {
      const parsed = parseStructuredAddress(projectName)
      if (parsed.number || parsed.streetName) {
        applyStructuredAddress(
          {
            number: parsed.number,
            direction: parsed.direction,
            streetName: parsed.streetName,
            streetType: parsed.streetType,
            unit: parsed.unit,
            city: parsed.city || city,
            state: parsed.state || LA_STATE_DEFAULT,
            zip: parsed.zip,
          },
          {
            formatted: projectName.includes(',') ? projectName : undefined,
            skipZimasReset: true,
          },
        )
      } else if (!addressCity.trim() && city.trim()) {
        applyStructuredAddress({ city }, { skipZimasReset: true })
      }
    }
    setFeasibilityStep(2)
  }, [addressCity, applyStructuredAddress, city, getStructuredAddress, projectName])
  const effectiveLotSize = lotSize.trim() || extractLotSizeFromZimasCache(zimasLookupCache)
  const hasFeasibilityCriticalData = Boolean(zone.trim() && effectiveLotSize)
  const handleZimasApnLookup = useCallback(
    (apn: string) => {
      lastAutoLookupKeyRef.current = null
      clearZimasLock()
      setZimasLookupCache(null)
      void handleZimasLookup(undefined, { apn, forceRefresh: true })
    },
    [clearZimasLock, handleZimasLookup],
  )

  const canSubmit =
    flowType &&
    projectName.trim() &&
    city.trim() &&
    currentWorkspace &&
    (isFeasibility || files.length > 0) &&
    zimasVerified &&
    (!isFeasibility || hasFeasibilityCriticalData) &&
    step === 'configure'

  // ── Main submit handler: create project + upload files in parallel ──
  const handleSubmit = async () => {
    if (!canSubmit) return
    setError(null)
    setStep('uploading')
    abortRef.current = new AbortController()

    try {
      // 1. Create project + get signed upload URLs
      const createRes = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          workspace_id: currentWorkspace.id,
          project_name: projectName.trim(),
          city: city.trim(),
          project_address: address.trim() || null,
          zimas_street_line: zimasStreetLine || undefined,
          flow_type: flowType,
          // Feasibility-specific fields
          ...(isFeasibility && {
            zone: zone.trim() || undefined,
            lot_size: parseFloat(lotSize) || parseFloat(effectiveLotSize) || undefined,
            toc_tier: tocTier.trim() || undefined,
            chip_tier: chipTier.trim() || undefined,
            lot_width: parseFloat(lotWidth) || undefined,
            lot_depth: parseFloat(lotDepth) || undefined,
            existing_building_year: parseInt(existingBuildingYear) || undefined,
            existing_units: parseInt(existingUnits) || undefined,
            rso_units: parseInt(rsoUnits) || undefined,
            existing_parking: parseInt(existingParking) || undefined,
            hazard_zones: hazardZones.trim() || undefined,
            transit_proximity: transitProximity ?? undefined,
            specific_plan: specificPlan.trim() || undefined,
            existing_building_plan: existingBuildingPlan || undefined,
            rso_replacement_policy: rsoReplacementPolicy || undefined,
            zimas_lookup_cache: zimasLookupCache || undefined,
            zimas_lookup_method: zimasLookupMethod || undefined,
            zimas_locked_apn: zimasLockedApn || undefined,
          }),
          files: files.map((f) => ({
            filename: f.file.name,
            file_type: inferFileType(f.file.name),
            size_bytes: f.file.size,
            mime_type: f.file.type || 'application/pdf',
          })),
        }),
        signal: abortRef.current.signal,
      })

      if (!createRes.ok) {
        const err = await createRes.json().catch(() => ({}))
        throw new Error(err.error || 'Failed to create project')
      }

      const { project_id, files: fileRecords } = await createRes.json()

      // 2. Upload files (if any)
      if (files.length > 0) {
        const uploadPromises = files.map(async (uploadFile, idx) => {
          const record = fileRecords[idx]
          if (!record?.upload_url) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: 'error', error: 'No upload URL' } : f,
              ),
            )
            return
          }

          setFiles((prev) =>
            prev.map((f) => (f.id === uploadFile.id ? { ...f, status: 'uploading' } : f)),
          )

          try {
            // Use XMLHttpRequest for upload progress tracking
            await uploadWithProgress(
              record.upload_url,
              uploadFile.file,
              (progress) => {
                setFiles((prev) =>
                  prev.map((f) =>
                    f.id === uploadFile.id ? { ...f, progress } : f,
                  ),
                )
              },
            )

            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id ? { ...f, status: 'done', progress: 100 } : f,
              ),
            )
          } catch (err) {
            setFiles((prev) =>
              prev.map((f) =>
                f.id === uploadFile.id
                  ? { ...f, status: 'error', error: err instanceof Error ? err.message : 'Upload failed' }
                  : f,
              ),
            )
            throw err
          }
        })

        // Wait for ALL uploads in parallel, tolerating partial failures
        const results = await Promise.allSettled(uploadPromises)
        const failures = results.filter(r => r.status === 'rejected')
        if (failures.length > 0) {
          throw new Error(`${failures.length} file(s) failed to upload`)
        }
      }

      // 3. Mark project as ready
      const completeRes = await fetch('/api/projects/upload-complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id }),
        signal: abortRef.current.signal,
      })

      if (!completeRes.ok) {
        const err = await completeRes.json().catch(() => ({}))
        throw new Error(
          (err as { error?: string }).error || 'Failed to finalize project after upload',
        )
      }

      setStep('done')

      // 4. Auto-navigate to the project after a brief pause
      setTimeout(() => {
        router.push(`/projects/${project_id}`)
      }, 1500)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return
      console.error('Project creation failed:', err)
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setStep('configure')
    }
  }

  // ── Upload with XHR for progress ──
  function uploadWithProgress(
    url: string,
    file: File,
    onProgress: (pct: number) => void,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      xhr.open('PUT', url)
      xhr.setRequestHeader('Content-Type', file.type || 'application/pdf')

      xhr.upload.onprogress = (e) => {
        if (e.lengthComputable) {
          onProgress((e.loaded / e.total) * 100)
        }
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve()
        } else {
          reject(new Error(`Upload failed: ${xhr.status}`))
        }
      }

      xhr.onerror = () => reject(new Error('Network error during upload'))
      xhr.send(file)
    })
  }

  // ── SSR placeholder — avoids hydration mismatch ──
  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10" />
          <div>
            <h1 className="heading-section text-foreground">New Project</h1>
            <p className="text-muted-foreground font-body">
            {currentWorkspace
              ? `Upload your plans and start an AI-powered review in ${currentWorkspace.name}`
              : 'Select a workspace before creating a project'}
            </p>
          </div>
        </div>
        <div className="h-[88px] rounded-xl border-2 border-border/50 bg-muted/5 animate-pulse" />
      </div>
    )
  }

  // ── DONE state ──
  if (step === 'done') {
    return (
      <div className="max-w-2xl mx-auto space-y-8 animate-fade-up">
        <div className="flex flex-col items-center justify-center py-16 space-y-6">
          <div className="relative">
            <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center">
              <CheckCircle2Icon className="w-8 h-8 text-success" />
            </div>
          </div>
          <div className="text-center space-y-2">
            <h1 className="heading-section text-foreground">Project Created</h1>
            <p className="text-muted-foreground font-body text-lg">
              Redirecting to your project...
            </p>
          </div>
        </div>
      </div>
    )
  }

  // ── MAIN FORM ──
  return (
    <div className="max-w-3xl mx-auto space-y-8 animate-fade-up">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button asChild variant="ghost" size="icon" className="shrink-0">
          <Link href="/dashboard">
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
        </Button>
        <div>
          <h1 className="heading-section text-foreground">New Project</h1>
          <p className="text-muted-foreground font-body">
            Upload your plans and start an AI-powered review
          </p>
        </div>
      </div>

      {/* Flow type is auto-selected to feasibility-analysis */}

      {isFeasibility && step === 'configure' && (
        <FeasibilityWizardProgress step={feasibilityStep} />
      )}

      {/* Project Details */}
      {flowType && (!isFeasibility || feasibilityStep >= 1) && (
        <Card
          className={cn(
            'shadow-[0_8px_32px_rgba(28,25,23,0.08)] animate-fade-up',
            isFeasibility ? 'border-emerald-600/20' : 'border-border/50',
          )}
        >
          <CardContent className={cn('p-6 space-y-5', isFeasibility && 'feasibility-wizard')}>
            {isFeasibility && (
              <FeasibilityWizardBreadcrumbs
                step={feasibilityStep}
                projectName={projectName}
                city={city}
              />
            )}
            {isFeasibility && process.env.NODE_ENV === 'development' && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleFillTestData}
                disabled={step !== 'configure'}
                className="h-7 text-xs font-body text-muted-foreground hover:text-emerald-700 dark:hover:text-emerald-300 gap-1.5 -mt-1"
              >
                <FlaskConicalIcon className="w-3.5 h-3.5" />
                Fill test data
              </Button>
            )}
            <FeasibilityWizardShell step={isFeasibility ? feasibilityStep : 1}>
            <div className="flex items-center gap-3 mb-2">
              <BuildingIcon className={cn('w-5 h-5', isFeasibility ? 'text-emerald-600' : 'text-primary')} />
              <h2 className="text-lg font-semibold text-foreground font-body">
                {isFeasibility
                  ? feasibilityStep === 1
                    ? 'Step 1 — Project basics'
                    : feasibilityStep === 2
                      ? 'Step 2 — Property & ZIMAS'
                      : 'Step 3 — Review'
                  : 'Project Details'}
              </h2>
            </div>

            {(!isFeasibility || feasibilityStep === 1) && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="project-name" className="font-body">
                  Project Name *
                </Label>
                <Input
                  id="project-name"
                  placeholder={isFeasibility ? 'e.g. Jefferson ADU feasibility' : 'e.g. 1232 N Jefferson ADU'}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                {isFeasibility && (
                  <p className="text-xs text-muted-foreground font-body">
                    A short label for your dashboard — not the street address (that comes in step 2).
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="city" className="font-body">
                  City *
                </Label>
                <Input
                  id="city"
                  placeholder="e.g. Los Angeles"
                  value={city}
                  onChange={(e) => {
                    if (isFeasibility) {
                      setCity(e.target.value)
                    } else {
                      applyStructuredAddress({ city: e.target.value })
                    }
                  }}
                  list="city-suggestions"
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <datalist id="city-suggestions">
                  {CITY_SUGGESTIONS.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
                {city.trim() && (
                  <p className="text-xs font-body">
                    {isOnboarded ? (
                      <span className="text-success">
                        <CheckCircle2Icon className="w-3 h-3 inline mr-1" />
                        Onboarded city — faster, offline research
                      </span>
                    ) : (
                      <span className="text-muted-foreground">
                        Will use live web research for city codes
                      </span>
                    )}
                  </p>
                )}
              </div>
            </div>
            )}

            {isFeasibility && feasibilityStep === 2 && (
            <div className="space-y-4">
              <div ref={addressWrapperRef}>
              <FeasibilityZimasSearchPanel
                city={city}
                address={address}
                disabled={step !== 'configure'}
                isLookingUp={isLookingUpZimas || isResolvingAddressOption}
                canLookup={Boolean(address.trim() && hasRequiredAddressParts)}
                status={
                  isLookingUpZimas || isResolvingAddressOption
                    ? 'loading'
                    : zimasStatus === 'success'
                      ? 'success'
                      : zimasStatus === 'select'
                        ? 'select'
                        : zimasStatus === 'error'
                          ? 'error'
                          : 'idle'
                }
                statusMessage={zimasMessage}
                locked={zimasLocked}
                onAddressChange={handleAddressInputChange}
                onAddressFocus={() => {
                  if (address.trim().length >= 3) fetchSuggestions(address)
                }}
                onRefresh={() => void handleZimasLookup(undefined, { forceRefresh: true })}
                suggestions={
                  <>
                    {isSuggestionsOpen && addressSuggestions.length > 0 && (
                      <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                        {addressSuggestions.map((s) => (
                          <li
                            key={s.placeId}
                            className="px-3 py-2 text-sm font-body cursor-pointer hover:bg-emerald-600/10 transition-colors"
                            onMouseDown={async (e) => {
                              e.preventDefault()
                              closeSuggestions()
                              const resolved = await resolvePlace(s.placeId)
                              if (resolved) {
                                applyStructuredAddress(
                                  {
                                    number: resolved.number,
                                    direction: resolved.direction,
                                    streetName: resolved.streetName,
                                    streetType: resolved.streetType,
                                    unit: resolved.unit,
                                    city: resolved.city,
                                    state: resolved.state,
                                    zip: resolved.zip,
                                  },
                                  { formatted: resolved.formatted },
                                )
                              } else {
                                handleAddressInputChange(s.description)
                              }
                            }}
                          >
                            <span className="font-medium">{s.mainText}</span>
                            {s.secondaryText && (
                              <span className="text-muted-foreground ml-1">{s.secondaryText}</span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {isLoadingSuggestions && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <Loader2Icon className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                      </div>
                    )}
                  </>
                }
              />
              </div>
                <FeasibilityAddressBreakdown
                  number={addressNumber}
                  direction={addressDirection}
                  streetName={addressStreetName}
                  streetType={addressStreetType}
                  unit={addressUnit}
                  city={addressCity || city}
                  state={addressState}
                  zip={addressZip}
                  disabled={step !== 'configure'}
                  locked={zimasLocked}
                  onNumber={(v) => applyStructuredAddress({ number: v })}
                  onDirection={(v) => applyStructuredAddress({ direction: v })}
                  onStreetName={(v) => applyStructuredAddress({ streetName: v })}
                  onStreetType={(v) => applyStructuredAddress({ streetType: v })}
                  onUnit={(v) => applyStructuredAddress({ unit: v })}
                  onCity={(v) => applyStructuredAddress({ city: v })}
                  onState={(v) => applyStructuredAddress({ state: v })}
                  onZip={(v) => applyStructuredAddress({ zip: v })}
                  directionsListId="address-directions"
                  streetTypesListId="street-types"
                />
              <datalist id="address-directions">
                {ADDRESS_DIRECTIONS.map((dir) => (
                  <option key={dir} value={dir} />
                ))}
              </datalist>
              <datalist id="street-types">
                {STREET_TYPES.map((type) => (
                  <option key={type} value={type} />
                ))}
              </datalist>
              {showApnFallback && zimasAddressOptions.length === 0 && step === 'configure' && (
                <FeasibilityAccordion
                  title="Lookup by APN"
                  subtitle="Street address did not verify — use the 10-digit Assessor Parcel Number from ZIMAS"
                  defaultOpen={zimasStatus === 'error'}
                  badge={
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-700 dark:text-amber-300">
                      Fallback
                    </span>
                  }
                >
                  <ZimasApnFallback
                    embedded
                    disabled={step !== 'configure'}
                    isLookingUp={isLookingUpZimas || isResolvingAddressOption}
                    onLookupByApn={handleZimasApnLookup}
                  />
                </FeasibilityAccordion>
              )}
              {isFeasibility && zimasAddressOptions.length > 0 && (
                <FeasibilityAccordion
                  title="Choose parcel"
                  subtitle={`${zimasAddressOptions.length} matching address${zimasAddressOptions.length > 1 ? 'es' : ''} — select one to continue`}
                  defaultOpen
                  badge={
                    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-600/10 text-emerald-700 dark:text-emerald-300">
                      Required
                    </span>
                  }
                >
                  <div className="space-y-1.5">
                    {zimasAddressOptions.map((opt) => (
                      <button
                        key={`${opt.index}-${opt.address}`}
                        type="button"
                        onClick={() => setSelectedAddressIdx(opt.index)}
                        disabled={step !== 'configure' || isLookingUpZimas || isResolvingAddressOption}
                        className={cn(
                          'w-full text-left rounded-md border px-3 py-2 text-xs font-body transition-colors disabled:opacity-60 flex items-center gap-2',
                          selectedAddressIdx === opt.index
                            ? 'border-emerald-600 bg-emerald-600/5 ring-1 ring-emerald-600/20'
                            : 'border-border/50 hover:border-emerald-600/30 hover:bg-muted/30',
                        )}
                      >
                        <span
                          className={cn(
                            'flex-shrink-0 w-3.5 h-3.5 rounded-full border-2 transition-colors',
                            selectedAddressIdx === opt.index
                              ? 'border-emerald-600 bg-emerald-600'
                              : 'border-muted-foreground/40',
                          )}
                        />
                        <span className="flex-1">{opt.address}</span>
                        {opt.recommended && (
                          <span className="flex-shrink-0 text-[10px] font-medium bg-emerald-600/10 text-emerald-700 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                            Best match
                          </span>
                        )}
                        {typeof opt.score === 'number' && (
                          <span
                            className={cn(
                              'flex-shrink-0 text-[10px] tabular-nums',
                              opt.score >= 0.8
                                ? 'text-green-600'
                                : opt.score >= 0.5
                                  ? 'text-amber-600'
                                  : 'text-muted-foreground',
                            )}
                          >
                            {Math.round(opt.score * 100)}%
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      if (selectedAddressIdx !== null) {
                        void handleZimasLookup(selectedAddressIdx, { forceRefresh: true })
                      }
                    }}
                    disabled={
                      selectedAddressIdx === null ||
                      step !== 'configure' ||
                      isLookingUpZimas ||
                      isResolvingAddressOption
                    }
                    className="w-full font-body bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    {isResolvingAddressOption ? (
                      <>
                        <Loader2Icon className="w-3.5 h-3.5 mr-1.5 animate-spin" />
                        Fetching data…
                      </>
                    ) : (
                      'Confirm & look up'
                    )}
                  </Button>
                </FeasibilityAccordion>
              )}
            </div>
            )}

            {!isFeasibility && (
            <div className="space-y-2">
              <Label htmlFor="address" className="font-body">
                Property Address
              </Label>
              <div className="relative" ref={addressWrapperRef}>
                <Input
                  id="address"
                  placeholder="e.g. 1232 N Jefferson St, Placentia, CA 92870"
                  value={address}
                  onChange={(e) => handleAddressInputChange(e.target.value)}
                  onFocus={() => {
                    if (address.trim().length >= 3) fetchSuggestions(address)
                  }}
                  disabled={step !== 'configure'}
                  className="font-body w-full"
                  autoComplete="off"
                />
                {isSuggestionsOpen && addressSuggestions.length > 0 && (
                  <ul className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                    {addressSuggestions.map((s) => (
                      <li
                        key={s.placeId}
                        className="px-3 py-2 text-sm font-body cursor-pointer hover:bg-accent transition-colors"
                        onMouseDown={async (e) => {
                          e.preventDefault()
                          closeSuggestions()
                          const resolved = await resolvePlace(s.placeId)
                          if (resolved) {
                            applyStructuredAddress(
                              {
                                number: resolved.number,
                                direction: resolved.direction,
                                streetName: resolved.streetName,
                                streetType: resolved.streetType,
                                unit: resolved.unit,
                                city: resolved.city,
                                state: resolved.state,
                                zip: resolved.zip,
                              },
                              { formatted: resolved.formatted },
                            )
                          } else {
                            handleAddressInputChange(s.description)
                          }
                        }}
                      >
                        <span className="font-medium">{s.mainText}</span>
                        {s.secondaryText && (
                          <span className="text-muted-foreground ml-1">{s.secondaryText}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {isLoadingSuggestions && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <Loader2Icon className="w-3.5 h-3.5 animate-spin text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="No. (e.g. 8815)"
                  value={addressNumber}
                  onChange={(e) => applyStructuredAddress({ number: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <Input
                  placeholder="Dir (N/S/E/W)"
                  list="address-directions"
                  value={addressDirection}
                  onChange={(e) => applyStructuredAddress({ direction: e.target.value.toUpperCase() })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <Input
                  placeholder="Street Name"
                  value={addressStreetName}
                  onChange={(e) => applyStructuredAddress({ streetName: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body md:col-span-2"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="Type (Ave, St...)"
                  list="street-types"
                  value={addressStreetType}
                  onChange={(e) => applyStructuredAddress({ streetType: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <Input
                  placeholder="Unit (optional)"
                  value={addressUnit}
                  onChange={(e) => applyStructuredAddress({ unit: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <Input
                  placeholder="City"
                  value={addressCity}
                  onChange={(e) => applyStructuredAddress({ city: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
                <Input
                  placeholder="State"
                  value={addressState}
                  onChange={(e) => applyStructuredAddress({ state: e.target.value.toUpperCase() })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
              </div>
              <div className="grid gap-3 md:grid-cols-4">
                <Input
                  placeholder="ZIP"
                  value={addressZip}
                  onChange={(e) => applyStructuredAddress({ zip: e.target.value })}
                  disabled={step !== 'configure'}
                  className="font-body"
                />
              </div>
            </div>
            )}

            {isFeasibility && feasibilityStep === 2 && zimasVerified && (
              <ZimasPropertySummaryCard
                zone={zone}
                lotSize={lotSize}
                tocTier={tocTier}
                chipTier={chipTier}
                hazardZones={hazardZones}
                transitProximity={transitProximity}
                specificPlan={specificPlan}
                zimasMessage={zimasMessage}
                zimasLookupCache={zimasLookupCache}
                onFixZone={setZone}
                onFixLotSize={setLotSize}
              />
            )}

            {isFeasibility && feasibilityStep === 3 && (
              <>
              <FeasibilityReviewCard
                projectName={projectName}
                city={city}
                address={address}
                zone={zone}
                lotSize={lotSize}
                tocTier={tocTier}
                chipTier={chipTier}
                transitProximity={transitProximity}
                hazardZones={hazardZones}
                specificPlan={specificPlan}
                existingBuildingYear={existingBuildingYear}
                existingUnits={existingUnits}
                fileCount={files.length}
                zimasVerified={zimasVerified}
                zimasLookupCache={zimasLookupCache}
              />
              <FeasibilityAdvancedDetails
                disabled={step !== 'configure'}
                existingBuildingYear={existingBuildingYear}
                existingUnits={existingUnits}
                existingBuildingPlan={existingBuildingPlan}
                rsoReplacementPolicy={rsoReplacementPolicy}
                onExistingBuildingYear={setExistingBuildingYear}
                onExistingUnits={setExistingUnits}
                onExistingBuildingPlan={setExistingBuildingPlan}
                onRsoReplacementPolicy={setRsoReplacementPolicy}
              />
              </>
            )}

            </FeasibilityWizardShell>
          </CardContent>
        </Card>
      )}

      {/* File Upload */}
      {flowType && (!isFeasibility || feasibilityStep === 3) && (
        <Card className="shadow-[0_8px_32px_rgba(28,25,23,0.08)] border-border/50 animate-fade-up">
          <CardContent className="p-6 space-y-4">
            <div className="flex items-center gap-3 mb-2">
              <FileTextIcon className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-foreground font-body">
                Upload Documents
                {isFeasibility && (
                  <span className="ml-1.5 text-sm font-normal text-muted-foreground">(optional)</span>
                )}
              </h2>
            </div>

            <FileDropzone
              files={files}
              onFilesAdded={handleFilesAdded}
              onFileRemoved={handleFileRemoved}
              accept=".pdf"
              maxFiles={5}
              maxSizeMb={100}
              label={
                FLOW_OPTIONS.find((o) => o.id === flowType)?.fileHint || 'Drop files here'
              }
              hint="PDF files up to 100 MB each"
              disabled={step !== 'configure'}
            />

            {flowType === 'corrections-analysis' && (
              <p className="text-xs text-muted-foreground font-body">
                Upload the <span className="font-semibold">plan binder PDF</span> and the{' '}
                <span className="font-semibold">corrections letter</span> (PDF or scanned pages).
                Name files with &quot;correction&quot; to auto-tag them.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 flex items-center gap-3">
          <div className="w-5 h-5 text-destructive shrink-0">⚠</div>
          <p className="text-sm text-destructive font-body">{error}</p>
        </div>
      )}

      {/* Submit / wizard navigation */}
      {flowType && (
        <div className="flex justify-between gap-3 pb-8">
          <div className="flex gap-2">
            <Button
              variant="outline"
              asChild
              className="rounded-full font-body"
              disabled={step !== 'configure'}
            >
              <Link href="/dashboard">Cancel</Link>
            </Button>
            {isFeasibility && feasibilityStep > 1 && step === 'configure' && (
              <Button
                type="button"
                variant="outline"
                className="rounded-full font-body"
                onClick={() => setFeasibilityStep((s) => (s > 1 ? ((s - 1) as FeasibilityWizardStep) : s))}
              >
                Back
              </Button>
            )}
          </div>
          {isFeasibility && feasibilityStep < 3 && step === 'configure' ? (
            <Button
              type="button"
              disabled={
                feasibilityStep === 1 ? !canFeasibilityStep1 : !canFeasibilityStep2 || !hasFeasibilityCriticalData
              }
              onClick={() => {
                if (feasibilityStep === 1 && canFeasibilityStep1) {
                  advanceToFeasibilityStep2()
                } else if (feasibilityStep === 2 && canFeasibilityStep2 && hasFeasibilityCriticalData) {
                  setFeasibilityStep(3)
                }
              }}
              className="rounded-full font-bold font-body px-8 bg-emerald-600 hover:bg-emerald-700 text-white hover:shadow-[0_0_24px_rgba(16,185,129,0.35)]"
            >
              Continue
            </Button>
          ) : (
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit}
              className="rounded-full font-bold font-body px-8 hover:shadow-[0_0_24px_rgba(45,106,79,0.3)] hover:brightness-110"
              title={
                !currentWorkspace
                  ? 'Select a workspace first'
                  : isFeasibility && !zimasVerified
                    ? 'Verify the address with ZIMAS before creating the project'
                    : isFeasibility && !hasFeasibilityCriticalData
                      ? 'Zone and lot size are required (from ZIMAS or manual entry)'
                      : undefined
              }
            >
              {step === 'uploading' ? (
                <>
                  <Loader2Icon className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <RocketIcon className="w-4 h-4 mr-2" />
                  {isFeasibility ? 'Create feasibility project' : 'Create & Upload'}
                </>
              )}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
