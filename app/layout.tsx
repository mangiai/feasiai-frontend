import type { Metadata } from "next"
import { ToastProvider } from "@/components/toast"
import { ThemeProvider } from "@/components/theme-provider"
import "./globals.css"

export const metadata: Metadata = {
  title: {
    default: 'FeasiAI — AI-Powered Feasibility Analysis & Permit Review',
    template: '%s | FeasiAI',
  },
  description: 'AI-powered California property feasibility analysis and ADU permit review. Evaluate entitlement strategies (CHIP, TOC, AB 1287, SB 79), corrections response, and plan review.',
  keywords: ['feasibility analysis', 'CHIP program', 'ADU', 'permit', 'California', 'density bonus', 'TOC', 'AB 1287', 'entitlement', 'AI', 'plan review', 'zoning'],
  authors: [{ name: 'FeasiAI' }],
  icons: {
    icon: "/images/feasiai-icon.svg",
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'FeasiAI',
  },
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      style={{ ['--font-display' as string]: 'var(--font-body)' }}
    >
      <body className="antialiased bg-app-gradient">
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem disableTransitionOnChange>
          <ToastProvider>
            {children}
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
