import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/stats-card'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  UsersIcon,
  MailIcon,
  FileTextIcon,
  HandshakeIcon,
} from 'lucide-react'

export default async function SACollaborationsPage() {
  const supabase = await createClient()

  const [collabsRes, sharedReportsRes] = await Promise.all([
    supabase
      .from('project_collaborations')
      .select(`
        id, project_id, report_id, scope, status, invite_token, expires_at, accepted_at, created_at, updated_at,
        grantee:grantee_user_id(full_name, email),
        inviter:invited_by(full_name, email),
        projects(name),
        reports(title)
      `)
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('project_collaborations')
      .select('report_id', { count: 'exact', head: true })
      .not('report_id', 'is', null),
  ])

  const collabs = (collabsRes.data as any[]) ?? []
  const sharedReports = sharedReportsRes.count ?? 0

  const activeCount = collabs.filter((c) => c.status === 'accepted').length
  const pendingCount = collabs.filter((c) => c.status === 'pending').length

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Collaboration Hub" icon={HandshakeIcon} subtitle="Cross-workspace sharing and invitation status." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatsCard icon={UsersIcon} label="Active Collaborations" value={activeCount} />
        <StatsCard icon={MailIcon} label="Pending Invitations" value={pendingCount} />
        <StatsCard icon={FileTextIcon} label="Shared Reports" value={sharedReports} />
      </div>

      {/* Collaborations Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Collaborations</CardTitle>
          <CardDescription>Project and report sharing across the platform</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Project</th>
                  <th className="text-left px-4 py-3 font-medium">Report</th>
                  <th className="text-left px-4 py-3 font-medium">Grantee</th>
                  <th className="text-left px-4 py-3 font-medium">Invited By</th>
                  <th className="text-left px-4 py-3 font-medium">Scope</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {collabs.map((c: any) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium">{c.projects?.name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{c.reports?.title || '—'}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-xs">{c.grantee?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.grantee?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-xs">{c.inviter?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{c.inviter?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="outline">{c.scope || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          c.status === 'accepted' ? 'default' :
                          c.status === 'pending' ? 'secondary' : 'outline'
                        }
                      >
                        {c.status || '—'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {collabs.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">No collaborations found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
