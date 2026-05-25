'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { MapPinIcon, PhoneIcon, MailIcon } from 'lucide-react'

export function SiteFooter() {
  return (
    <motion.footer 
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.7, ease: [0.25, 0.4, 0.25, 1] }}
      className="relative z-10 border-t border-foreground/[0.10]"
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-4">
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/images/feasiai-icon.svg" alt="FeasiAI" width={22} height={22} />
              <div className="flex flex-col leading-tight">
                <span className="text-sm font-bold text-foreground">FeasiAI</span>
              </div>
            </Link>
            <p className="text-xs text-foreground/40 leading-relaxed">
              AI-powered permit review and feasibility analysis for California housing development.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Services</h4>
            <ul className="space-y-2 text-[13px] text-foreground/40">
              <li><Link href="/feasibility" className="hover:text-foreground/70 transition-colors font-medium text-foreground/55">Feasibility Analysis</Link></li>
              <li><Link href="/adu" className="hover:text-foreground/70 transition-colors font-medium text-foreground/55">ADU Permit Review</Link></li>
              <li><a href="https://feasiai.com/land-use-consulting" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">Land-Use &amp; Entitlement Strategy</a></li>
              <li><a href="https://feasiai.com/permit-expediting-services" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">Permit Expediting</a></li>
              <li><a href="https://feasiai.com/feasibility-studies" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">Feasibility Studies</a></li>
              <li><a href="https://feasiai.com/due-diligence-consulting" target="_blank" rel="noopener noreferrer" className="hover:text-foreground/70 transition-colors">Due Diligence Consulting</a></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Company</h4>
            <ul className="space-y-2 text-[13px] text-foreground/40">
              <li><Link href="/about" className="hover:text-foreground/70 transition-colors">About</Link></li>
              <li><Link href="/how-it-works" className="hover:text-foreground/70 transition-colors">How It Works</Link></li>
              <li><Link href="/pricing" className="hover:text-foreground/70 transition-colors">Pricing</Link></li>
              <li><Link href="/contact" className="hover:text-foreground/70 transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-foreground/50 tracking-wider uppercase mb-4">Contact</h4>
            <ul className="space-y-2.5 text-[13px] text-foreground/40">
              <li className="flex items-start gap-2.5">
                <MapPinIcon className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 text-foreground/30" />
                12925 Riverside Dr Suite 302, Sherman Oaks, CA 91423
              </li>
              <li className="flex items-center gap-2.5">
                <PhoneIcon className="w-3.5 h-3.5 flex-shrink-0 text-foreground/30" />
                <a href="tel:8187935058" className="hover:text-foreground/70 transition-colors">(818) 793-5058</a>
              </li>
              <li className="flex items-center gap-2.5">
                <MailIcon className="w-3.5 h-3.5 flex-shrink-0 text-foreground/30" />
                <a href="mailto:sales@feasiai.com" className="hover:text-foreground/70 transition-colors">sales@feasiai.com</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-foreground/[0.05] mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-foreground/35">&copy; 2026 FeasiAI. All Rights Reserved.</p>
          <div className="flex gap-6 text-xs text-foreground/35">
            <Link href="/legal/terms" className="hover:text-foreground/55 transition-colors">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-foreground/55 transition-colors">Privacy</Link>
          </div>
        </div>
      </div>
    </motion.footer>
  )
}
