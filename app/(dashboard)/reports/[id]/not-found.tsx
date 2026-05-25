import Link from 'next/link'
import { FileTextIcon, ArrowLeftIcon } from 'lucide-react'

export default function ReportNotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <div className="rounded-full bg-muted p-4">
        <FileTextIcon className="w-10 h-10 text-muted-foreground" />
      </div>
      <h2 className="text-lg font-semibold">Report not found</h2>
      <p className="text-sm text-muted-foreground max-w-md text-center">
        This report doesn&apos;t exist or you don&apos;t have permission to view it.
      </p>
      <div className="flex items-center gap-3">
        <Link
          href="/reports"
          className="inline-flex items-center justify-center gap-1.5 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          All Reports
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Dashboard
        </Link>
      </div>
    </div>
  )
}
