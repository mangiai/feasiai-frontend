import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Feasibility Analysis — AI-Powered Property Development Intelligence',
  description:
    'Evaluate 11 entitlement strategies in minutes with AI. CHIP, TOC, AB 1287, AB 2334, SB 79, AB 2011, State Density Bonus — every California housing incentive program analyzed for your property. Type an address, get a professional 20-page feasibility report.',
  keywords: [
    'feasibility analysis',
    'property development',
    'CHIP program',
    'TOC Transit Oriented Communities',
    'density bonus',
    'AB 1287',
    'AB 2334',
    'SB 79',
    'AB 2011',
    'California housing',
    'entitlement strategy',
    'zoning analysis',
    'LAMC 12.22',
    'AHIP',
    'MIIP',
    'AI feasibility report',
    'real estate development',
    'Los Angeles zoning',
    'ZIMAS',
    'FeasiAI',
  ],
  openGraph: {
    title: 'Feasibility Analysis — Every Strategy. Every Incentive. One Address.',
    description:
      'AI evaluates 11 California entitlement strategies simultaneously. CHIP, TOC, AB 1287, AB 2334, SB 79, AB 2011 — professional feasibility reports in minutes, not weeks.',
    type: 'website',
    url: '/feasibility',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AI Feasibility Analysis — 11 Strategies, One Address',
    description:
      'Evaluate CHIP, TOC, AB 1287, AB 2334, SB 79, AB 2011 and more. Professional development feasibility in minutes.',
  },
  alternates: {
    canonical: '/feasibility',
  },
}

export default function FeasibilityLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
