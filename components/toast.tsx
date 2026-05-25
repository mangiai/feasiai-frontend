'use client'

import { createContext, useCallback, useContext, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { CheckCircle2Icon, AlertCircleIcon, InfoIcon, XCircleIcon, XIcon } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue>({ toast: () => {} })

export function useToast() {
  return useContext(ToastContext)
}

const ICONS: Record<ToastVariant, React.ElementType> = {
  success: CheckCircle2Icon,
  error: XCircleIcon,
  info: InfoIcon,
  warning: AlertCircleIcon,
}

const STYLES: Record<ToastVariant, string> = {
  success: 'border-success/30 bg-success/5 text-foreground',
  error: 'border-destructive/30 bg-destructive/5 text-foreground',
  info: 'border-info/30 bg-info/5 text-foreground',
  warning: 'border-warning/30 bg-warning/5 text-foreground',
}

const ICON_STYLES: Record<ToastVariant, string> = {
  success: 'text-success',
  error: 'text-destructive',
  info: 'text-info',
  warning: 'text-warning',
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, variant: ToastVariant = 'info') => {
    const id = crypto.randomUUID()
    setToasts(prev => [...prev, { id, message, variant }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="toast-viewport" role="status" aria-live="polite">
        {toasts.map(t => {
          const Icon = ICONS[t.variant]
          return (
            <div
              key={t.id}
              className={cn(
                'flex items-start gap-2.5 rounded-lg border px-4 py-3 shadow-lg backdrop-blur-sm animate-slide-in-left',
                STYLES[t.variant]
              )}
            >
              <Icon className={cn('w-4 h-4 mt-0.5 flex-shrink-0', ICON_STYLES[t.variant])} />
              <p className="text-sm flex-1">{t.message}</p>
              <button
                onClick={() => dismiss(t.id)}
                className="text-muted-foreground hover:text-foreground transition-colors"
              >
                <XIcon className="w-3.5 h-3.5" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
