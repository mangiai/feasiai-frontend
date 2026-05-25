import { describe, expect, it } from 'vitest'
import { buildReportPdfFilename } from '../report-download-filename'

describe('buildReportPdfFilename', () => {
  it('prefers project name over address', () => {
    expect(
      buildReportPdfFilename({
        projectName: '3723 Rosemead Ave',
        address: '999 Other St',
        reportLabel: 'Feasibility Report',
      }),
    ).toBe('3723 Rosemead Ave - Feasibility Report')
  })

  it('falls back to address when project name missing', () => {
    expect(
      buildReportPdfFilename({
        address: '3723 Rosemead Ave',
        reportLabel: 'Feasibility Report',
      }),
    ).toBe('3723 Rosemead Ave - Feasibility Report')
  })
})
