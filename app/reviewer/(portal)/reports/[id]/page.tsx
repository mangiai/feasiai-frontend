import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { ArrowLeftIcon } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ReviewerReportClient } from './reviewer-report-client'

const STATUS_COLORS: Record<string, string> = {
  not_requested: 'outline',
  pending: 'secondary',
  in_progress: 'secondary',
  verified: 'default',
  rejected: 'destructive',
}

export default async function ReviewerReportDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      *,
      project:projects(id, name, address, city, flow_type, status)
    `)
    .eq('id', id)
    .single()

  if (error || !report) return notFound()

  const content = report.content as unknown
  const contentObj = content && typeof content === 'object' ? (content as Record<string, unknown>) : null
  const artifacts =
    (contentObj?.artifacts && typeof contentObj.artifacts === 'object'
      ? (contentObj.artifacts as Record<string, unknown>)
      : {}) ?? {}
  const flowType = (contentObj?.flow_type as string | undefined) ?? (report.report_type as unknown as string)
  const verificationLabel = report.verification_status === 'verified'
    ? 'completed'
    : String(report.verification_status).replace(/_/g, ' ')

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-8 px-6">
      <div className="flex items-center gap-3">
        <Link href="/reviewer" className="text-muted-foreground hover:text-foreground">
          <ArrowLeftIcon className="h-5 w-5" />
        </Link>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{report.title || 'Untitled Report'}</h1>
          <p className="text-muted-foreground text-sm">
            {(report.project as unknown as { address?: string | null })?.address ||
              (report.project as unknown as { name?: string | null })?.name ||
              'Unknown project'}
            {(report.project as unknown as { city?: string | null })?.city &&
              ` — ${(report.project as unknown as { city?: string }).city}`}
          </p>
        </div>
        <Badge variant={STATUS_COLORS[report.verification_status] as any}>
          {String(report.verification_status).replace(/_/g, ' ')}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-5">
            <div>
              <dt className="text-xs text-muted-foreground">Type</dt>
              <dd className="font-medium">{report.report_type}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd><Badge variant="outline">{verificationLabel}</Badge></dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Version</dt>
              <dd>{report.current_version}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Created</dt>
              <dd>{new Date(report.created_at).toLocaleDateString()}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Validation</dt>
              <dd className="font-semibold">
                {typeof contentObj?.validation_score === 'number' ? `${Math.round(contentObj.validation_score)}%` : '—'}
              </dd>
            </div>
          </dl>
          {report.verification_notes && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
              <span className="font-medium">Review Notes:</span> {report.verification_notes}
            </div>
          )}
        </CardContent>
      </Card>

      <ReviewerReportClient
        reportId={report.id}
        initialArtifacts={artifacts}
        flowType={flowType}
        validationScore={typeof contentObj?.validation_score === 'number' ? contentObj.validation_score : undefined}
        verificationStatus={String(report.verification_status)}
      />
    </div>
  )
}

