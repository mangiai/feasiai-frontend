import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Complete Setup',
}

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return children
}