import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { APP_DB_SCHEMA } from '@/lib/app-schema'
import Link from 'next/link'
import { ArrowLeftIcon, CalendarIcon, FileTextIcon, LayersIcon, ShieldCheckIcon } from 'lucide-react'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { ReviewContent } from './review-content'
import { SAReportRegeneratePanel } from '../sa-report-regenerate-panel'

const STATUS_COLORS: Record<string, string> = {
  not_requested: 'outline',
  pending: 'secondary',
  in_progress: 'secondary',
  verified: 'default',
  rejected: 'destructive',
}

export default async function SAReviewDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch report with project info
  const { data: report, error } = await supabase
    .from('reports')
    .select(`
      *,
      project:projects(id, name, address, city, flow_type, status)
    `)
    .eq('id', id)
    .single()

  if (error || !report) return notFound()

  // Fetch validation results for this output (if linked)
  const outputId = (report.content as any)?.output_id
  let validationScore: number | undefined
  if (outputId) {
    const { data: validations } = await supabase
      .schema(APP_DB_SCHEMA)
      .from('validation_results')
      .select('tier, score')
      .eq('output_id', outputId)
      .order('created_at', { ascending: false })
      .limit(2)

    if (validations && validations.length > 0) {
      // Use structural (Tier A) score, or average if both exist
      const tierA = validations.find((v: any) => v.tier === 'structural')
      const tierB = validations.find((v: any) => v.tier === 'semantic')
      if (tierA && tierB && tierB.score >= 0) {
        validationScore = Math.round((tierA.score + tierB.score) / 2)
      } else if (tierA) {
        validationScore = tierA.score
      }
    }
  }

  // Extract artifacts from report content
  const artifacts = (report.content as any)?.artifacts ?? {}
  const flowType = (report.content as any)?.flow_type ?? report.report_type
  const verificationLabel = report.verification_status === 'verified'
    ? 'completed'
    : String(report.verification_status).replace(/_/g, ' ')

  return (
    <div className="space-y-5">
      <div className="flex items-center">
        <Link
          href="/sa/reviews"
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Back to review queue"
        >
          <ArrowLeftIcon className="h-3.5 w-3.5" />
          Back to queue
        </Link>
      </div>
      <SAPageHeader
        title={report.title || 'Untitled Report'}
        icon={FileTextIcon}
        subtitle={`${(report.project as any)?.address || (report.project as any)?.name || 'Unknown project'}${
          (report.project as any)?.city ? ` — ${(report.project as any).city}` : ''
        }`}
        badge={
          <Badge variant={STATUS_COLORS[report.verification_status] as any} className="w-fit">
            {report.verification_status.replace(/_/g, ' ')}
          </Badge>
        }
      />

      {/* Report metadata */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Report Details</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <FileTextIcon className="h-3.5 w-3.5" />
                Type
              </dt>
              <dd className="font-medium">{report.report_type}</dd>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <ShieldCheckIcon className="h-3.5 w-3.5" />
                Status
              </dt>
              <dd><Badge variant="outline">{verificationLabel}</Badge></dd>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <LayersIcon className="h-3.5 w-3.5" />
                Version
              </dt>
              <dd>{report.current_version}</dd>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <CalendarIcon className="h-3.5 w-3.5" />
                Created
              </dt>
              <dd>{new Date(report.created_at).toLocaleDateString()}</dd>
            </div>
            <div className="rounded-md border bg-muted/20 p-3">
              <dt className="mb-1 text-xs text-muted-foreground">Validation</dt>
              <dd className="font-semibold">
                {validationScore !== undefined ? `${validationScore}%` : '—'}
              </dd>
            </div>
          </dl>
          {report.verification_notes && (
            <div className="mt-4 rounded-md border border-border/80 bg-muted/40 p-3 text-sm">
              <span className="font-medium">Review Notes:</span> {report.verification_notes}
            </div>
          )}
        </CardContent>
      </Card>

      <SAReportRegeneratePanel reportId={report.id} reportType={report.report_type} />

      {/* Content viewer/editor + review actions */}
      <ReviewContent
        reportId={report.id}
        artifacts={artifacts}
        flowType={flowType}
        validationScore={validationScore}
        verificationStatus={report.verification_status}
        projectAddress={(report.project as { address?: string | null })?.address}
        projectName={(report.project as { name?: string | null })?.name}
      />
    </div>
  )
}
