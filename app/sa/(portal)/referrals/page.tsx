import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StatsCard } from '@/components/stats-card'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  LinkIcon,
  MousePointerClickIcon,
  UserPlusIcon,
  TrophyIcon,
} from 'lucide-react'

export default async function SAReferralsPage() {
  const supabase = await createClient()

  const [linksRes, eventsRes] = await Promise.all([
    supabase
      .from('referral_links')
      .select('id, code, campaign_name, campaign_source, destination_url, click_count, signup_count, conversion_count, is_active, expires_at, created_at, owner_user_id, profiles:owner_user_id(full_name, email)')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('referral_events')
      .select('id, event_type, created_at, user_id, referral_link_id, referral_links(code, campaign_name)')
      .order('created_at', { ascending: false })
      .limit(100),
  ])

  const links = (linksRes.data as any[]) ?? []
  const events = (eventsRes.data as any[]) ?? []

  const totalLinks = links.length
  const totalClicks = links.reduce((sum, l) => sum + (l.click_count ?? 0), 0)
  const totalSignups = links.reduce((sum, l) => sum + (l.signup_count ?? 0), 0)
  const totalConversions = links.reduce((sum, l) => sum + (l.conversion_count ?? 0), 0)

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Referral Management" icon={LinkIcon} subtitle="Campaign link performance and referral events." />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatsCard icon={LinkIcon} label="Total Links" value={totalLinks} />
        <StatsCard icon={MousePointerClickIcon} label="Total Clicks" value={totalClicks} />
        <StatsCard icon={UserPlusIcon} label="Total Signups" value={totalSignups} />
        <StatsCard icon={TrophyIcon} label="Conversions" value={totalConversions} />
      </div>

      {/* Referral Links Table */}
      <Card>
        <CardHeader>
          <CardTitle>Referral Links</CardTitle>
          <CardDescription>All referral links and their performance metrics</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Code</th>
                  <th className="text-left px-4 py-3 font-medium">Owner</th>
                  <th className="text-left px-4 py-3 font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium">Clicks</th>
                  <th className="text-left px-4 py-3 font-medium">Signups</th>
                  <th className="text-left px-4 py-3 font-medium">Conversions</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                  <th className="text-left px-4 py-3 font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {links.map((link: any) => (
                  <tr key={link.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{link.code}</td>
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-xs">{link.profiles?.full_name || '—'}</p>
                        <p className="text-xs text-muted-foreground">{link.profiles?.email || ''}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {link.campaign_name || '—'}
                      {link.campaign_source && (
                        <span className="block text-xs">{link.campaign_source}</span>
                      )}
                    </td>
                    <td className="px-4 py-3">{link.click_count ?? 0}</td>
                    <td className="px-4 py-3">{link.signup_count ?? 0}</td>
                    <td className="px-4 py-3">{link.conversion_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <Badge variant={link.is_active ? 'default' : 'secondary'}>
                        {link.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {link.created_at ? new Date(link.created_at).toLocaleDateString() : '—'}
                    </td>
                  </tr>
                ))}
                {links.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">No referral links found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Referral Events Table */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Referral Events</CardTitle>
          <CardDescription>Last 100 referral tracking events</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="text-left px-4 py-3 font-medium">Event Type</th>
                  <th className="text-left px-4 py-3 font-medium">Referral Code</th>
                  <th className="text-left px-4 py-3 font-medium">Campaign</th>
                  <th className="text-left px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {events.map((event: any) => (
                  <tr key={event.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-3">
                      <Badge variant="outline">{event.event_type?.replace(/_/g, ' ') || '—'}</Badge>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{event.referral_links?.code || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{event.referral_links?.campaign_name || '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {event.created_at ? new Date(event.created_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))}
                {events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">No referral events found.</td>
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
