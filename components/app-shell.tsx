'use client'

import { TooltipProvider } from '@/components/ui/tooltip'
import { WorkspaceProvider, useWorkspace } from '@/hooks/use-workspace'
import { Sidebar } from '@/components/sidebar'
import { TopBar } from '@/components/top-bar'
import { LockIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface AppShellProps {
  children: ReactNode
  userId: string
  userEmail: string
}

function WorkspaceLockWall({ children }: { children: ReactNode }) {
  const { isCurrentWorkspaceLocked, currentWorkspace, isLoading } = useWorkspace()

  if (!isLoading && isCurrentWorkspaceLocked && currentWorkspace) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-destructive/10 border border-destructive/20 flex items-center justify-center mb-5">
          <LockIcon className="w-7 h-7 text-destructive" />
        </div>
        <h2 className="text-xl font-semibold mb-2">Workspace Locked</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          <strong>{currentWorkspace.name}</strong> has been locked by an administrator.
          Please contact support to restore access.
        </p>
      </div>
    )
  }

  return <>{children}</>
}

export function AppShell({ children, userId, userEmail }: AppShellProps) {
  return (
    <WorkspaceProvider userId={userId}>
      <TooltipProvider delayDuration={300}>
        <div className="flex min-h-screen bg-grid-pattern">
          <Sidebar />
          <div className="flex flex-col flex-1 min-w-0">
            <TopBar userEmail={userEmail} />
            <main className="relative z-10 flex-1 p-6">
              <WorkspaceLockWall>{children}</WorkspaceLockWall>
            </main>
          </div>
        </div>
      </TooltipProvider>
    </WorkspaceProvider>
  )
}
