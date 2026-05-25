import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Legal',
  description: 'Privacy Policy and Terms of Service for FeasiAI.',
}

export default function LegalIndexPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 sm:px-6">
      <h1 className="text-2xl font-semibold tracking-tight text-foreground">Legal</h1>
      <p className="mt-2 text-sm text-foreground/60">
        Official policies for the FeasiAI service operated by FeasiAI.
      </p>
      <ul className="mt-8 space-y-4 text-sm">
        <li>
          <Link href="/legal/privacy" className="font-medium text-primary underline-offset-4 hover:underline">
            Privacy Policy
          </Link>
          <p className="mt-1 text-foreground/55">How we collect, use, disclose, and protect personal information.</p>
        </li>
        <li>
          <Link href="/legal/terms" className="font-medium text-primary underline-offset-4 hover:underline">
            Terms of Service
          </Link>
          <p className="mt-1 text-foreground/55">Terms and conditions that govern your access and use of FeasiAI.</p>
        </li>
      </ul>
    </div>
  )
}
