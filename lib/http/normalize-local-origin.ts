export function normalizeLocalOrigin(origin: string): string {
  const trimmed = origin.replace(/\/+$/, '')

  if (process.env.NODE_ENV !== 'development') {
    return trimmed
  }

  try {
    const url = new URL(trimmed)

    if (url.hostname === '127.0.0.1') {
      url.hostname = 'localhost'
      return url.origin
    }

    return url.origin
  } catch {
    return trimmed
  }
}