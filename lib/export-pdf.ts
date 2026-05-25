/**
 * Server-side branded PDF (md-to-pdf + FeasiAI template) via Next.js proxy.
 * Uses cookie session — no Bearer header (see api-auth dual-auth behavior).
 */

import { parseContentDispositionFilename } from '@/lib/report-download-filename'

export async function downloadMarkdownAsBrandedPdf(
  markdown: string,
  filenameBase: string,
  options?: {
    projectId?: string
    projectName?: string | null
    projectAddress?: string | null
    reportLabel?: string
    includeZimasScreenshots?: boolean
  },
): Promise<void> {
  const safe = filenameBase.replace(/[^a-zA-Z0-9._\s-]/g, '').trim().replace(/\s+/g, '-').slice(0, 120) || 'report'

  // In Next dev + Turbopack on Windows, newly-added app routes can briefly 404 during compilation.
  // Retry once on 404 to avoid a flaky first click.
  const makeRequest = () => fetch('/api/export_pdf', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      markdown,
      filename: safe,
      prepend_brand: true,
      ...(options?.projectId ? { project_id: options.projectId } : {}),
      ...(options?.projectName ? { project_name: options.projectName.trim() } : {}),
      ...(options?.projectAddress ? { project_address: options.projectAddress.trim() } : {}),
      ...(options?.reportLabel ? { report_label: options.reportLabel.trim() } : {}),
      include_zimas_screenshots: options?.includeZimasScreenshots !== false,
    }),
  })

  let res = await makeRequest()
  if (res.status === 404) {
    await new Promise(r => setTimeout(r, 300))
    res = await makeRequest()
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(typeof err.error === 'string' ? err.error : `PDF export failed (${res.status})`)
  }

  const headerName = parseContentDispositionFilename(res.headers.get('Content-Disposition'))
  const downloadName = headerName?.endsWith('.pdf')
    ? headerName
    : headerName
      ? `${headerName}.pdf`
      : `${safe}.pdf`

  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = downloadName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
