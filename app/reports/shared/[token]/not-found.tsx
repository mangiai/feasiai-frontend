import Link from 'next/link'
import { FileTextIcon } from 'lucide-react'

export default function SharedReportNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6 px-4">
        <div className="flex justify-center">
          <div className="rounded-full bg-muted p-4">
            <FileTextIcon className="w-10 h-10 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800">Report not found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This shared report link is invalid, expired, or the report has been removed.
          </p>
        </div>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Go to FeasiAI
        </Link>
      </div>
    </div>
  )
}
