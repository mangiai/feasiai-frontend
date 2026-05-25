import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { HelpCircleIcon, InboxIcon, BookOpenIcon, ExternalLinkIcon } from 'lucide-react'
import { HelpFAQ } from './help-faq'
import Link from 'next/link'

export default async function SAHelpPage() {
  const supabase = await createClient()

  const { data: tickets } = await supabase
    .from('audit_events')
    .select('id, action, details, created_at, actor_email')
    .eq('action', 'support_ticket')
    .order('created_at', { ascending: false })
    .limit(25)

  const ticketList = tickets ?? []

  return (
    <div className="max-w-5xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader title="Help Center" icon={HelpCircleIcon} subtitle="Support tickets and administrator FAQs." />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Support Tickets</CardTitle>
              <CardDescription>Incoming support requests from users.</CardDescription>
            </div>
            <Link href="/docs" target="_blank" rel="noopener noreferrer">
              <Badge variant="outline" className="gap-1 cursor-pointer hover:bg-muted">
                <BookOpenIcon className="w-3 h-3" />
                Product Documentation
                <ExternalLinkIcon className="w-3 h-3" />
              </Badge>
            </Link>
          </div>
        </CardHeader>
        <CardContent>
          {ticketList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <InboxIcon className="w-12 h-12 text-muted-foreground mb-4" />
              <h2 className="text-lg font-medium mb-1">No support tickets</h2>
              <p className="text-sm text-muted-foreground">
                No support tickets have been submitted yet. Tickets appear here when users submit requests via the platform.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="text-left px-4 py-3 font-medium">ID</th>
                    <th className="text-left px-4 py-3 font-medium">Subject</th>
                    <th className="text-left px-4 py-3 font-medium">User</th>
                    <th className="text-left px-4 py-3 font-medium">Status</th>
                    <th className="text-left px-4 py-3 font-medium">Created</th>
                  </tr>
                </thead>
                <tbody>
                  {ticketList.map((t: any) => (
                    <tr key={t.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                      <td className="px-4 py-3 font-mono text-xs">{t.id.slice(0, 8)}</td>
                      <td className="px-4 py-3 font-medium">{t.details?.subject || t.action || '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.actor_email || '—'}</td>
                      <td className="px-4 py-3">
                        <Badge variant="secondary">{t.details?.status || 'open'}</Badge>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quick Answers</CardTitle>
          <CardDescription>Frequently asked questions for administrators.</CardDescription>
        </CardHeader>
        <CardContent>
          <HelpFAQ />
        </CardContent>
      </Card>
    </div>
  )
}
