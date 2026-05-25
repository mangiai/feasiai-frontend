import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { ClockIcon, MailIcon, MessageSquareIcon, UsersIcon } from 'lucide-react'
import { ContactSubmissionsTable } from './submissions-table'

type ContactDetails = {
  name?: string
  email?: string
  subject?: string
  message?: string
}

type ContactAuditEvent = {
  id: string
  created_at: string
  actor_email: string | null
  details: ContactDetails | null
}

function formatLatestReceived(value?: string) {
  if (!value) return 'No messages'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'
  return new Intl.DateTimeFormat('en', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

export default async function SAContactFormsPage() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('audit_events')
    .select('id, created_at, actor_email, details')
    .eq('action', 'contact_form')
    .order('created_at', { ascending: false })
    .limit(250)

  const submissions = ((data as ContactAuditEvent[]) ?? []).map((row) => ({
    ...row,
    details: (row.details ?? {}) as ContactDetails,
  }))

  const sevenDaysAgo = Date.now() - (7 * 24 * 60 * 60 * 1000)
  const recentCount = submissions.filter((submission) => new Date(submission.created_at).getTime() >= sevenDaysAgo).length
  const uniqueSenders = new Set(
    submissions
      .map((submission) => (submission.details.email || submission.actor_email || '').trim().toLowerCase())
      .filter(Boolean),
  ).size

  const stats = [
    {
      label: 'Total Messages',
      value: submissions.length.toLocaleString(),
      helper: 'Last 250 submissions loaded',
      icon: MessageSquareIcon,
    },
    {
      label: 'Last 7 Days',
      value: recentCount.toLocaleString(),
      helper: 'Recent public contact activity',
      icon: ClockIcon,
    },
    {
      label: 'Unique Senders',
      value: uniqueSenders.toLocaleString(),
      helper: 'Based on sender email',
      icon: UsersIcon,
    },
    {
      label: 'Latest Received',
      value: formatLatestReceived(submissions[0]?.created_at),
      helper: 'Newest contact submission',
      icon: MailIcon,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Contact Forms"
        icon={MailIcon}
        subtitle="Messages submitted from the public contact flow."
        badge={
          <Badge
            variant="secondary"
            className="rounded-full border border-secondary/30 bg-secondary/15 text-secondary-foreground"
          >
            {submissions.length} inbox
          </Badge>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Card key={stat.label} className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-muted/20">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div>
                  <CardTitle className="text-sm">{stat.label}</CardTitle>
                  <CardDescription>{stat.helper}</CardDescription>
                </div>
                <div className="rounded-full border border-primary/15 bg-primary/10 p-2 text-primary">
                  <Icon className="h-4 w-4" />
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-semibold tracking-tight">{stat.value}</p>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {error ? (
        <Card className="border-destructive/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Unable to load contact submissions</CardTitle>
            <CardDescription className="text-destructive">{error.message}</CardDescription>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="overflow-hidden border-primary/10 shadow-[0_12px_40px_-28px_hsl(var(--primary)/0.45)]">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-card to-secondary/12 pb-4">
          <CardTitle className="text-base">Submissions inbox</CardTitle>
          <CardDescription>Search, triage, and reply to messages from the public contact page.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ContactSubmissionsTable submissions={submissions} />
        </CardContent>
      </Card>
    </div>
  )
}

