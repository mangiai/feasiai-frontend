import Link from 'next/link'
import { HomeIcon } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-7xl font-bold text-slate-300">404</h1>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800">Page not found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            The page you&apos;re looking for doesn&apos;t exist or has been moved.
          </p>
        </div>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <HomeIcon className="w-4 h-4" />
            Home
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  )
}
