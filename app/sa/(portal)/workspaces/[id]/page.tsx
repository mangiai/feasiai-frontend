import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import {
  ArrowLeftIcon,
  BuildingIcon,
  UsersIcon,
  FolderIcon,
  CoinsIcon,
  CrownIcon,
  MapPinIcon,
  LockIcon,
  ActivityIcon,
} from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { LockWorkspaceButton } from './lock-button'

export default async function SAWorkspaceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch all data in parallel
  const [workspaceRes, membersRes, projectsRes, billingRes, ledgerRes] = await Promise.all([
    supabase.from('workspaces').select('*').eq('id', id).single(),
    supabase
      .from('workspace_memberships')
      .select('*, profile:profiles(*)')
      .eq('workspace_id', id)
      .order('created_at'),
    supabase
      .from('projects')
      .select('id, name, status, flow_type, city, credits_used, created_at, verification_status')
      .eq('workspace_id', id)
      .order('created_at', { ascending: false }),
    supabase
      .from('billing_accounts')
      .select('credit_balance, plan_type, stripe_customer_id')
      .eq('workspace_id', id)
      .single(),
    supabase
      .from('credit_ledger')
      .select('id, transaction_type, amount, description, created_at')
      .eq('workspace_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ])

  if (!workspaceRes.data) notFound()

  const workspace = workspaceRes.data
  const members = (membersRes.data ?? []) as any[]
  const projects = (projectsRes.data ?? []) as any[]
  const billing = billingRes.data
  const ledger = (ledgerRes.data ?? []) as any[]

  const settings = (workspace.settings as Record<string, unknown>) ?? {}
  const isLocked = settings.is_locked === true
  const lockedAt = settings.locked_at as string | null

  const totalCreditsUsed = projects.reduce((sum: number, p: any) => sum + (p.credits_used || 0), 0)
  const activeMembers = members.filter((m: any) => m.is_active).length

  const statusVariant = (s: string) => {
    if (s === 'completed') return 'default'
    if (s === 'running') return 'secondary'
    if (s === 'failed') return 'destructive'
    return 'outline'
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm">
        <Link
          href="/sa/workspaces"
          className="flex items-center gap-1.5 text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeftIcon className="w-3.5 h-3.5" />
          Workspaces
        </Link>
        <span className="text-muted-foreground">/</span>
        <span className="text-foreground font-medium">{workspace.name}</span>
      </div>

      <SAPageHeader
        title={workspace.name}
        icon={BuildingIcon}
        subtitle={`${workspace.slug}${workspace.company_name ? ` · ${workspace.company_name}` : ''} · Created ${new Date(
          workspace.created_at
        ).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })}${isLocked && lockedAt ? ` · Locked ${new Date(lockedAt).toLocaleDateString()}` : ''}`}
        badge={
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">{workspace.type}</Badge>
            {isLocked ? (
              <Badge variant="destructive" className="gap-1">
                <LockIcon className="w-3 h-3" />
                Locked
              </Badge>
            ) : null}
          </div>
        }
        actions={<LockWorkspaceButton workspaceId={workspace.id} isLocked={isLocked} />}
      />

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <UsersIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Members</span>
            </div>
            <p className="text-2xl font-bold">{members.length}</p>
            <p className="text-xs text-muted-foreground">{activeMembers} active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <FolderIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Projects</span>
            </div>
            <p className="text-2xl font-bold">{projects.length}</p>
            <p className="text-xs text-muted-foreground">
              {projects.filter((p: any) => p.status === 'completed').length} completed
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <CoinsIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Credit Balance</span>
            </div>
            <p className="text-2xl font-bold">{billing?.credit_balance?.toLocaleString() ?? 0}</p>
            <p className="text-xs text-muted-foreground capitalize">{billing?.plan_type ?? 'free'} plan</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5 pb-4">
            <div className="flex items-center gap-2 text-muted-foreground mb-1">
              <ActivityIcon className="w-4 h-4" />
              <span className="text-xs font-medium">Credits Consumed</span>
            </div>
            <p className="text-2xl font-bold">{totalCreditsUsed.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">across all projects</p>
          </CardContent>
        </Card>
      </div>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>All users with access to this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">User</th>
                  <th className="text-left px-4 py-3 font-medium">Email</th>
                  <th className="text-left px-4 py-3 font-medium">Role</th>
                  <th className="text-left px-4 py-3 font-medium">Account Type</th>
                  <th className="text-left px-4 py-3 font-medium">Joined</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {members.map((m: any) => (
                  <tr key={m.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">
                      <div className="flex items-center gap-2">
                        {m.role === 'owner' && (
                          <CrownIcon className="w-3.5 h-3.5 text-secondary flex-shrink-0" />
                        )}
                        {m.profile?.full_name || <span className="text-muted-foreground">Unnamed</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{m.profile?.email || '—'}</td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={m.role === 'owner' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {m.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground capitalize">
                      {m.profile?.account_type || '—'}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(m.joined_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={m.is_active ? 'secondary' : 'destructive'}>
                        {m.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {members.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No members found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Projects table */}
      <Card>
        <CardHeader>
          <CardTitle>Projects ({projects.length})</CardTitle>
          <CardDescription>All projects created within this workspace.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium">Type</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">City</th>
                  <th className="text-left px-4 py-3 font-medium">Credits</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {projects.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{p.name}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="capitalize text-xs">
                        {(p.flow_type || '—').replace(/_/g, ' ')}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant(p.status)} className="capitalize text-xs">
                        {p.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <div className="flex items-center gap-1">
                        {p.city && <MapPinIcon className="w-3 h-3 flex-shrink-0" />}
                        {p.city || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-3">{(p.credits_used ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
                {projects.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                      No projects yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Recent credit ledger */}
      {ledger.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Recent Transactions</CardTitle>
            <CardDescription>Last 10 credit ledger entries for this workspace.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">Type</th>
                    <th className="text-left px-4 py-3 font-medium">Description</th>
                    <th className="text-left px-4 py-3 font-medium">Amount</th>
                    <th className="text-left px-4 py-3 font-medium">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {ledger.map((t: any) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="capitalize text-xs">
                          {t.transaction_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground max-w-xs truncate">
                        {t.description}
                      </td>
                      <td
                        className={`px-4 py-3 font-mono font-medium ${
                          t.amount > 0 ? 'text-green-500' : 'text-destructive'
                        }`}
                      >
                        {t.amount > 0 ? '+' : ''}{t.amount.toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {new Date(t.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Danger Zone */}
      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-destructive">Danger Zone</CardTitle>
          <CardDescription>
            These actions affect all members of this workspace immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-start justify-between gap-4 p-4 rounded-lg border border-destructive/20 bg-destructive/5">
            <div className="space-y-1">
              <p className="font-medium text-sm">
                {isLocked ? 'Workspace is currently locked' : 'Lock this workspace'}
              </p>
              <p className="text-sm text-muted-foreground max-w-md">
                {isLocked
                  ? 'All members are blocked from accessing this workspace. Unlock to restore their access.'
                  : 'Immediately block all members from accessing this workspace. They will see a locked message instead of the dashboard.'}
              </p>
            </div>
            <LockWorkspaceButton workspaceId={workspace.id} isLocked={isLocked} />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
