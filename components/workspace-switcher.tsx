'use client'

import { useState } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { ChevronsUpDownIcon, CheckIcon, PlusIcon, Loader2Icon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface WorkspaceSwitcherProps {
  collapsed?: boolean
}

export function WorkspaceSwitcher({ collapsed }: WorkspaceSwitcherProps) {
  const { workspaces, currentWorkspace, switchWorkspace } = useWorkspace()
  const [showCreate, setShowCreate] = useState(false)
  const [newWorkspaceName, setNewWorkspaceName] = useState('')
  const [creating, setCreating] = useState(false)

  const initial = currentWorkspace?.name?.charAt(0)?.toUpperCase() ?? 'W'

  async function handleCreateWorkspace() {
    if (!newWorkspaceName.trim()) return
    setCreating(true)
    try {
      const res = await fetch('/api/workspaces', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newWorkspaceName.trim() }),
      })
      if (res.ok) {
        const data = await res.json()
        if (data?.id) {
          switchWorkspace(data.id)
        }
        setNewWorkspaceName('')
        setShowCreate(false)
        window.location.reload()
      }
    } catch {
      // ignore
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className={cn(
              'w-full justify-start gap-2 h-9',
              collapsed && 'justify-center px-2'
            )}
          >
            <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary flex-shrink-0">
              {initial}
            </div>
            {!collapsed && (
              <>
                <span className="text-sm font-medium truncate flex-1 text-left">
                  {currentWorkspace?.name ?? 'Select workspace'}
                </span>
                <ChevronsUpDownIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              </>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          <DropdownMenuLabel className="text-xs">Workspaces</DropdownMenuLabel>
          {workspaces.map((ws) => (
            <DropdownMenuItem
              key={ws.id}
              onClick={() => switchWorkspace(ws.id)}
              className="gap-2"
            >
              <div className="w-5 h-5 rounded bg-primary/10 flex items-center justify-center text-xs font-bold text-primary">
                {ws.name.charAt(0).toUpperCase()}
              </div>
              <span className="truncate flex-1">{ws.name}</span>
              {ws.id === currentWorkspace?.id && (
                <CheckIcon className="w-3.5 h-3.5 text-primary" />
              )}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem className="gap-2 text-muted-foreground" onClick={() => setShowCreate(true)}>
            <PlusIcon className="w-4 h-4" />
            Create workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={showCreate} onOpenChange={setShowCreate}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Create workspace</AlertDialogTitle>
            <AlertDialogDescription>
              Enter a name for your new workspace.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4 space-y-2">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={newWorkspaceName}
              onChange={e => setNewWorkspaceName(e.target.value)}
              placeholder="My Workspace"
              onKeyDown={e => e.key === 'Enter' && handleCreateWorkspace()}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleCreateWorkspace} disabled={creating || !newWorkspaceName.trim()}>
              {creating ? <Loader2Icon className="w-4 h-4 animate-spin mr-1" /> : null}
              Create
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
