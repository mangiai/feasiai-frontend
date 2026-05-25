'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { MenuIcon, XIcon, ArrowRightIcon } from 'lucide-react'

export function MobileNav({ scrolled = true }: { scrolled?: boolean }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  return (
    <div className="md:hidden">
      <Button variant="ghost" size="icon" className={`h-9 w-9 ${!scrolled ? 'text-foreground hover:bg-foreground/10' : ''}`} onClick={() => setOpen(!open)} aria-label="Toggle menu" aria-expanded={open}>
        {open ? <XIcon className="w-5 h-5" /> : <MenuIcon className="w-5 h-5" />}
      </Button>

      {open && (
        <div aria-label="Mobile navigation menu" className="absolute top-16 left-0 right-0 bg-background border-b border-border shadow-md animate-fade-up z-50">
          <div className="page-container py-4 flex flex-col gap-2">
            <Link href="/feasibility" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              Feasibility Analysis
            </Link>
            <Link href="/adu" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              ADU Permits
            </Link>
            <a href="#features" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              Features
            </a>
            <a href="#how-it-works" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              How It Works
            </a>
            <a href="https://feasiai.com/about-us/" target="_blank" rel="noopener noreferrer" className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              About
            </a>
            <Link href="/legal" onClick={() => setOpen(false)} className="px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground rounded-md hover:bg-muted transition-colors">
              Legal
            </Link>
            <div className="border-t border-border mt-1 pt-3 flex gap-2">
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button variant="outline" className="w-full font-medium">Sign In</Button>
              </Link>
              <Link href="/login" className="flex-1" onClick={() => setOpen(false)}>
                <Button className="w-full font-semibold">
                  Get Started <ArrowRightIcon className="w-3.5 h-3.5 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
