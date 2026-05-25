import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'ADU Permit Review — AI-Powered Corrections & Plan Analysis',
  description:
    'AI-powered ADU permit review for California. Corrections analysis, plan review, city code research, and permit-ready response letters — powered by specialized AI agents.',
  keywords: [
    'ADU',
    'accessory dwelling unit',
    'permit review',
    'corrections analysis',
    'plan check',
    'California ADU',
    'building code',
    'AI permit',
    'response letter',
    'FeasiAI',
  ],
  openGraph: {
    title: 'ADU Permit Review — Corrections, Plan Review & Code Research',
    description:
      'Upload a corrections letter or plan set. AI agents parse every item against state and city code, then generate professional response letters with exact citations.',
    type: 'website',
    url: '/adu',
  },
  alternates: {
    canonical: '/adu',
  },
}

export default function AduLayout({ children }: { children: React.ReactNode }) {
  return children
}
