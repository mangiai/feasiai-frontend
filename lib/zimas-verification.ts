import type { CachedZimasLookupResult } from '@/lib/zimas-cache'

function asString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

/**
 * True when a ZIMAS lookup succeeded and returned enough data to run feasibility.
 * Requires zone (or TOC/CHIP tier signal) — lot-only is not sufficient.
 */
export function isZimasLookupVerified(cache: CachedZimasLookupResult | null): boolean {
  if (!cache?.success || !cache.fields || typeof cache.fields !== 'object') {
    return false
  }

  const fields = cache.fields as Record<string, unknown>
  const zone = asString(fields.zone) ?? asString(fields.zone_code)
  const toc = asString(fields.toc_tier)
  const toia = asString(fields.toia_tier)
  const oc = asString(fields.oc_tier)
  const ct = asString(fields.ct_tier)

  return Boolean(zone || toc || toia || oc || ct)
}
