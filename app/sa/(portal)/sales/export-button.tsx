'use client'

import { Button } from '@/components/ui/button'
import { DownloadIcon } from 'lucide-react'

interface Purchase {
  id: string
  workspace_id: string
  amount: number
  balance_after: number
  description: string
  created_at: string
  workspaces?: { name: string } | null
}

export function SalesExportButton({ purchases }: { purchases: Purchase[] }) {
  function handleExport() {
    const header = 'Workspace,Amount,Balance After,Description,Date'
    const rows = purchases.map((p) =>
      [
        p.workspaces?.name || '',
        p.amount ?? 0,
        p.balance_after ?? '',
        `"${(p.description || '').replace(/"/g, '""')}"`,
        p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
      ].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `sales-export-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Button variant="outline" size="sm" onClick={handleExport}>
      <DownloadIcon className="mr-1.5 h-4 w-4" />
      Export CSV
    </Button>
  )
}
