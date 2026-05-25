const ZIMAS_HOST_PATTERN = /zimas\.lacity\.org/i

/**
 * Extract a street address from a ZIMAS URL when encoded in query/hash.
 * Many ZIMAS sessions use https://zimas.lacity.org/ without the address in the URL —
 * returns null so the UI can ask for "address as shown in ZIMAS".
 */
export function parseAddressFromZimasUrl(url: string): string | null {
  const trimmed = url.trim()
  if (!trimmed || !ZIMAS_HOST_PATTERN.test(trimmed)) {
    return null
  }

  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`)
    const candidates: string[] = []

    for (const key of ['address', 'Address', 'search', 'q', 'addr']) {
      const v = parsed.searchParams.get(key)
      if (v?.trim()) candidates.push(v.trim())
    }

    const hash = parsed.hash.replace(/^#/, '')
    if (hash) {
      const hashParams = new URLSearchParams(hash.includes('=') ? hash : '')
      for (const key of ['address', 'Address', 'search']) {
        const v = hashParams.get(key)
        if (v?.trim()) candidates.push(decodeURIComponent(v.trim()))
      }
      if (!hash.includes('=') && hash.length > 5 && !hash.startsWith('/')) {
        candidates.push(decodeURIComponent(hash))
      }
    }

    const best = candidates.find((c) => /\d/.test(c) && c.length >= 8)
    return best ?? null
  } catch {
    return null
  }
}

export function isZimasHostUrl(url: string): boolean {
  return ZIMAS_HOST_PATTERN.test(url.trim())
}
