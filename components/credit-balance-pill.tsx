import Link from 'next/link'
import { CoinsIcon } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

interface CreditBalancePillProps {
  balance: number
}

export function CreditBalancePill({ balance }: CreditBalancePillProps) {
  const isLow = balance < 50

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link
            href="/settings/billing"
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium transition-colors hover:opacity-80',
              isLow
                ? 'bg-destructive/10 text-destructive'
                : 'bg-primary/10 text-primary'
            )}
          >
            <CoinsIcon className="w-3.5 h-3.5" />
            <span>{balance.toLocaleString()}</span>
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Click to manage credits</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
