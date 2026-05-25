'use client'

import { useState, useEffect, useCallback } from 'react'
import { useWorkspace } from '@/hooks/use-workspace'
import { getPublicClientOrigin } from '@/lib/http/public-client-origin'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { StatsCard } from '@/components/stats-card'
import { EmptyState } from '@/components/empty-state'
import { LinkIcon, CopyIcon, PlusIcon, MousePointerClickIcon, UserPlusIcon, CoinsIcon } from 'lucide-react'

interface ReferralLinkWithStats {
  id: string
  code: string
  campaign_name: string | null
  destination_url: string
  created_at: string
  clicks: number
  signups: number
  conversions: number
  credits: number
}

interface DashboardStats {
  total_links: number
  total_clicks: number
  total_signups: number
  total_conversions: number
  total_credits_earned: number
}

export default function ReferralsPage() {
  useWorkspace()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [links, setLinks] = useState<ReferralLinkWithStats[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [campaignName, setCampaignName] = useState('')
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    const run = async () => {
      setLoading(true)
      try {
        const res = await fetch('/api/referrals/dashboard')
        if (res.ok) {
          const data = (await res.json()) as { stats: DashboardStats; links: ReferralLinkWithStats[] }
          if (!mounted) return
          setStats(data.stats)
          setLinks(data.links)
        }
      } finally {
        if (!mounted) return
        setLoading(false)
      }
    }
    run()
    return () => {
      mounted = false
    }
  }, [])

  const loadDashboard = useCallback(async () => {
    const res = await fetch('/api/referrals/dashboard')
    if (!res.ok) return
    const data = (await res.json()) as { stats: DashboardStats; links: ReferralLinkWithStats[] }
    setStats(data.stats)
    setLinks(data.links)
  }, [])

  async function handleCreateLink() {
    setCreating(true)
    const res = await fetch('/api/referrals/links', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        campaign_name: campaignName.trim() || undefined,
      }),
    })
    if (res.ok) {
      setCampaignName('')
      await loadDashboard()
    }
    setCreating(false)
  }

  function copyLink(code: string) {
    const url = `${getPublicClientOrigin()}/r/${code}`
    navigator.clipboard.writeText(url)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2000)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Referrals</h1>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Referrals</h1>
          <p className="text-muted-foreground">
            Share your referral links and earn credits when people sign up.
          </p>
        </div>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatsCard label="Total Links" value={stats.total_links} icon={LinkIcon} />
          <StatsCard label="Total Clicks" value={stats.total_clicks} icon={MousePointerClickIcon} />
          <StatsCard label="Signups" value={stats.total_signups} icon={UserPlusIcon} />
          <StatsCard label="Credits Earned" value={stats.total_credits_earned} icon={CoinsIcon} />
        </div>
      )}

      {/* Generate New Link */}
      <Card>
        <CardHeader>
          <CardTitle>Generate New Link</CardTitle>
          <CardDescription>Create a referral link with an optional campaign name for tracking.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3">
            <Input
              placeholder="Campaign name (optional)"
              value={campaignName}
              onChange={e => setCampaignName(e.target.value)}
              className="max-w-xs"
            />
            <Button onClick={handleCreateLink} disabled={creating}>
              <PlusIcon className="w-4 h-4 mr-2" />
              {creating ? 'Creating...' : 'Generate Link'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Links Table */}
      {links.length === 0 ? (
        <EmptyState
          icon={LinkIcon}
          title="No referral links yet"
          description="Generate your first referral link to start earning credits."
          actionLabel="Generate Link"
          onAction={handleCreateLink}
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Your Referral Links</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-4 font-medium">Code</th>
                    <th className="pb-2 pr-4 font-medium">Campaign</th>
                    <th className="pb-2 pr-4 font-medium">Clicks</th>
                    <th className="pb-2 pr-4 font-medium">Signups</th>
                    <th className="pb-2 pr-4 font-medium">Conversions</th>
                    <th className="pb-2 pr-4 font-medium">Created</th>
                    <th className="pb-2 font-medium"></th>
                  </tr>
                </thead>
                <tbody>
                  {links.map(link => (
                    <tr key={link.id} className="border-b last:border-0">
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="font-mono">{link.code}</Badge>
                      </td>
                      <td className="py-3 pr-4">
                        {link.campaign_name || <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="py-3 pr-4">{link.clicks}</td>
                      <td className="py-3 pr-4">{link.signups}</td>
                      <td className="py-3 pr-4">{link.conversions}</td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        {new Date(link.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyLink(link.code)}
                        >
                          <CopyIcon className="w-4 h-4 mr-1" />
                          {copiedCode === link.code ? 'Copied!' : 'Copy Link'}
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
