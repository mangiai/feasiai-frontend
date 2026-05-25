export type UsageRangePreset = '7d' | 'month' | 'quarter' | 'custom'

const PRESET_MS: Record<Exclude<UsageRangePreset, 'custom'>, number> = {
  '7d': 7 * 24 * 60 * 60 * 1000,
  month: 30 * 24 * 60 * 60 * 1000,
  quarter: 90 * 24 * 60 * 60 * 1000,
}

const MAX_CUSTOM_RANGE_MS = 370 * 24 * 60 * 60 * 1000

export type ParsedUsageRange =
  | {
    ok: true
    preset: UsageRangePreset
    label: string
    startIso: string
    endIso: string
  }
  | {
    ok: false
    message: string
  }

function parseDateBoundary(value: string | null, boundary: 'start' | 'end'): Date | null {
  if (!value) return null

  const trimmed = value.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return new Date(`${trimmed}T${boundary === 'start' ? '00:00:00.000' : '23:59:59.999'}Z`)
  }

  const parsed = new Date(trimmed)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

export function parseUsageRange(searchParams: URLSearchParams): ParsedUsageRange {
  const now = new Date()
  const rawRange = (searchParams.get('range') || searchParams.get('window') || '7d').toLowerCase()
  const preset: UsageRangePreset =
    rawRange === 'month' || rawRange === '30d'
      ? 'month'
      : rawRange === 'quarter' || rawRange === '90d'
        ? 'quarter'
        : rawRange === 'custom'
          ? 'custom'
          : '7d'

  if (preset !== 'custom') {
    return {
      ok: true,
      preset,
      label: preset === '7d' ? '7d' : preset === 'month' ? 'Month' : 'Quarter',
      startIso: new Date(now.getTime() - PRESET_MS[preset]).toISOString(),
      endIso: now.toISOString(),
    }
  }

  const start = parseDateBoundary(searchParams.get('from'), 'start')
  const end = parseDateBoundary(searchParams.get('to'), 'end')

  if (!start || !end) {
    return { ok: false, message: 'Custom range requires valid from and to dates.' }
  }

  if (start.getTime() > end.getTime()) {
    return { ok: false, message: 'Custom range start date must be before the end date.' }
  }

  if (end.getTime() - start.getTime() > MAX_CUSTOM_RANGE_MS) {
    return { ok: false, message: 'Custom range cannot exceed 370 days.' }
  }

  return {
    ok: true,
    preset,
    label: 'Custom',
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

