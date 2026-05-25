'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { MobileNav } from '@/components/mobile-nav'
import { ThemeToggle } from '@/components/theme-toggle'
import { cn } from '@/lib/utils'
import { ArrowRightIcon } from 'lucide-react'

const NAV_LINKS = [
  { label: 'Feasibility', href: '/feasibility' },
  { label: 'ADU Permits', href: '/adu' },
  { label: 'Pricing', href: '/pricing' },
  { label: 'About', href: '/about' },
  { label: 'How It Works', href: '/how-it-works' },
  { label: 'Contact', href: '/contact' },
  { label: 'Legal', href: '/legal' },
]

export function SiteHeader({ forceReadable = false }: { forceReadable?: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  const elevated = scrolled || forceReadable

  useEffect(() => {
    const cb = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', cb, { passive: true })
    cb()
    return () => window.removeEventListener('scroll', cb)
  }, [])

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        'fixed top-0 left-0 right-0 z-50 transition-all duration-500',
        elevated
          ? 'bg-background/78 backdrop-blur-2xl border-b border-foreground/[0.06] shadow-[0_1px_40px_rgba(0,0,0,0.12)] dark:shadow-[0_1px_40px_rgba(0,0,0,0.3)]'
          : 'bg-transparent'
      )}
    >
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <Image
            src="/images/feasiai-icon.svg"
            alt="FeasiAI"
            width={30}
            height={30}
            className="transition-transform group-hover:scale-110 duration-300"
          />
          <div className="flex flex-col leading-tight">
            <span className="text-[15px] font-bold tracking-tight text-foreground">FeasiAI</span>
          </div>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {NAV_LINKS.map((item, i) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.05, type: "spring", stiffness: 300, damping: 24 }}
            >
              <Link
                href={item.href}
                className={cn(
                  'text-[13px] font-medium transition-colors duration-200',
                  elevated ? 'text-foreground/75 hover:text-foreground' : 'text-foreground/55 hover:text-foreground'
                )}
              >
                {item.label}
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, type: "spring", stiffness: 300, damping: 24 }}
          className="flex items-center gap-2"
        >
          <ThemeToggle className={cn(
            'hover:text-foreground hover:bg-foreground/[0.06]',
            elevated ? 'text-foreground/75' : 'text-foreground/60'
          )} />
          <Link href="/login" className="hidden sm:block">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'hover:text-foreground hover:bg-foreground/[0.06] font-medium text-[13px]',
                elevated ? 'text-foreground/75' : 'text-foreground/60'
              )}
            >
              Sign In
            </Button>
          </Link>
          <Link href="/pricing">
            <Button
              size="sm"
              className="font-semibold bg-primary hover:bg-primary/90 text-white shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:shadow-[0_0_32px_rgba(16,185,129,0.4)] transition-all text-[13px] hover:scale-105 active:scale-95"
            >
              View Pricing
              <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
            </Button>
          </Link>
          <MobileNav scrolled={elevated} />
        </motion.div>
      </div>
    </motion.nav>
  )
}
