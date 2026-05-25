import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact — Get in Touch with FeasiAI',
  description: 'Have questions about ADU permits or FeasiAI? Reach out to our team for support, demos, or partnership inquiries.',
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
