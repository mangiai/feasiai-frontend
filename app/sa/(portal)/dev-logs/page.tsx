import { SAPageHeader } from '@/components/sa/sa-page-header'
import { DevLogsPanel } from '@/components/sa/dev-logs-panel'
import { ScrollTextIcon } from 'lucide-react'

export default function SADevLogsPage() {
  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Dev Logs"
        icon={ScrollTextIcon}
        subtitle="Live server output — agent pipeline events, structured dev logs, and raw stdout."
      />
      <DevLogsPanel />
    </div>
  )
}
