import { useState, useRef, useCallback, useEffect } from 'react'

export interface AddressSuggestion {
  placeId: string
  description: string
  mainText: string
  secondaryText: string
}

export interface ResolvedAddress {
  formatted: string
  number: string
  direction: string
  streetName: string
  streetType: string
  unit: string
  city: string
  state: string
  zip: string
}

/**
 * Hook for address autocomplete via Google Places API.
 * Debounces input, fetches suggestions, and resolves place details.
 */
export function useAddressAutocomplete(debounceMs = 300) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  const fetchSuggestions = useCallback((query: string) => {
    // Cancel any pending request
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (abortRef.current) abortRef.current.abort()

    if (!query || query.trim().length < 3) {
      setSuggestions([])
      setIsOpen(false)
      return
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController()
      abortRef.current = controller
      setIsLoading(true)

      try {
        const res = await fetch(
          `/api/address-autocomplete?q=${encodeURIComponent(query.trim())}`,
          { signal: controller.signal },
        )
        const data = await res.json()
        if (!controller.signal.aborted) {
          setSuggestions(data.suggestions || [])
          setIsOpen((data.suggestions || []).length > 0)
        }
      } catch {
        // Aborted or network error — ignore
      } finally {
        if (!controller.signal.aborted) {
          setIsLoading(false)
        }
      }
    }, debounceMs)
  }, [debounceMs])

  const resolvePlace = useCallback(async (placeId: string): Promise<ResolvedAddress | null> => {
    try {
      const res = await fetch('/api/address-autocomplete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ placeId }),
      })
      const data = await res.json()
      if (data.error) return null
      return data as ResolvedAddress
    } catch {
      return null
    }
  }, [])

  const close = useCallback(() => {
    setIsOpen(false)
    setSuggestions([])
  }, [])

  // Cleanup on unmount: cancel pending debounce + abort in-flight fetch
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      if (abortRef.current) abortRef.current.abort()
    }
  }, [])

  return {
    suggestions,
    isLoading,
    isOpen,
    fetchSuggestions,
    resolvePlace,
    close,
  }
}
