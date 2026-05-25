/**
 * Build a human-readable PDF download name: "{project name} - {report label}".
 * Project name is preferred (matches how users name projects in the UI).
 */
export function buildReportPdfFilename(options: {
  address?: string | null
  projectName?: string | null
  reportLabel?: string
}): string {
  const subject =
    options.projectName?.trim() ||
    options.address?.trim() ||
    'Property'
  const label = options.reportLabel?.trim() || 'Feasibility Report'
  return `${subject} - ${label}`
}

/** Parse filename from Content-Disposition (Safari uses this over anchor.download for blobs). */
export function parseContentDispositionFilename(header: string | null): string | null {
  if (!header) return null
  const utf8 = header.match(/filename\*=UTF-8''([^;\s]+)/i)
  if (utf8?.[1]) {
    try {
      return decodeURIComponent(utf8[1])
    } catch {
      return utf8[1]
    }
  }
  const quoted = header.match(/filename="([^"]+)"/i)
  if (quoted?.[1]) return quoted[1]
  const plain = header.match(/filename=([^;\s]+)/i)
  return plain?.[1]?.replace(/"/g, '') ?? null
}
