import Link from 'next/link'

export default function ReferralNotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center space-y-6 px-4">
        <h1 className="text-7xl font-bold text-slate-300">404</h1>
        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-slate-800">Referral not found</h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This referral link is invalid or has expired.
          </p>
        </div>
        <Link
          href="/signup"
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Sign up
        </Link>
      </div>
    </div>
  )
}
