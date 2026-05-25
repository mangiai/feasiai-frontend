'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { UserIcon, CreditCardIcon, UsersIcon, BellIcon } from 'lucide-react'

const SETTINGS_NAV = [
  { label: 'Profile', href: '/settings', icon: UserIcon },
  { label: 'Billing', href: '/settings/billing', icon: CreditCardIcon },
  { label: 'Team', href: '/settings/team', icon: UsersIcon },
  { label: 'Notifications', href: '/settings/notifications', icon: BellIcon },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="max-w-5xl mx-auto w-full py-8 px-4">
      <h1 className="text-2xl font-semibold mb-6">Settings</h1>
      <div className="flex gap-8">
        {/* Side nav */}
        <nav className="w-48 flex-shrink-0 space-y-1">
          {SETTINGS_NAV.map(item => {
            const active =
              item.href === '/settings'
                ? pathname === '/settings'
                : pathname.startsWith(item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  'hover:bg-accent hover:text-accent-foreground',
                  active ? 'bg-accent text-accent-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* Content */}
        <div className="flex-1 min-w-0">{children}</div>
      </div>
    </div>
  )
}
