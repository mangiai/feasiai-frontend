import { SiteFooter } from '@/components/landing/site-footer'
import { SiteHeader } from '@/components/landing/site-header'

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="min-h-[55vh] bg-background pt-20 pb-12">{children}</main>
      <SiteFooter />
    </>
  )
}
