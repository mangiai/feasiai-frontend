import { createClient } from '@/lib/supabase/server'
import { getServerBaseUrl } from '@/lib/http/server-base'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import {
  ServerIcon,
  ScrollTextIcon,
  FlagIcon,
  GaugeIcon,
  CpuIcon,
  Settings2Icon,
} from 'lucide-react'
import { SystemAuditLog } from './audit-log'
import { ModelRegistryTable } from './model-registry-table'
import { PipelineConfigPanel } from './pipeline-config-panel'

async function fetchSystemHealth(): Promise<{ status: string; uptime?: string }> {
  try {
    const serverUrl = getServerBaseUrl()
    const res = await fetch(`${serverUrl}/health`, { next: { revalidate: 30 } })
    if (res.ok) {
      const data = await res.json()
      return { status: 'healthy', uptime: data.uptime || data.uptimeFormatted }
    }
    return { status: 'degraded' }
  } catch {
    return { status: 'unreachable' }
  }
}

type PipelineRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  config: {
    provider?: string
    env?: Record<string, boolean | string>
    models?: Record<string, string>
  } | null
  updated_at: string
}

export default async function SASystemPage() {
  const supabase = await createClient()

  const [health, auditRes, pipelinesRes] = await Promise.all([
    fetchSystemHealth(),
    supabase
      .from('audit_events')
      .select('id, action, actor_email, actor_role, resource_type, resource_id, details, created_at')
      .order('created_at', { ascending: false })
      .limit(200),
    supabase
      .from('model_pipeline_configs' as never)
      .select('id, name, description, is_active, config, updated_at')
      .order('is_active', { ascending: false })
      .order('updated_at', { ascending: false }),
  ])

  const auditEvents = (auditRes.data as never[]) ?? []
  const pipelines = ((pipelinesRes.data as PipelineRow[]) ?? [])
  const activePipeline = pipelines.find((p) => p.is_active) ?? pipelines[0] ?? null
  const activeConfig = activePipeline?.config ?? null

  const statusColor =
    health.status === 'healthy' ? 'bg-emerald-500' :
    health.status === 'degraded' ? 'bg-amber-500' : 'bg-red-500'

  const statusLabel =
    health.status === 'healthy' ? 'All systems operational' :
    health.status === 'degraded' ? 'Some services degraded' : 'Backend unreachable'

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="System Settings"
        icon={ServerIcon}
        subtitle="Model registry, pipeline configuration, service health, and audit logs."
        badge={
          activePipeline ? (
            <Badge variant="secondary" className="border-secondary/30 bg-secondary/15 text-secondary-foreground">
              {activePipeline.name}
            </Badge>
          ) : null
        }
      />

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-card to-secondary/12 pb-4">
          <CardTitle className="flex items-center gap-2 text-base">
            <ServerIcon className="h-5 w-5 text-primary" />
            System health
          </CardTitle>
          <CardDescription>Backend service status and uptime</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <div className={`h-2.5 w-2.5 rounded-full ${statusColor}`} />
              <span className="text-sm font-medium">{statusLabel}</span>
            </div>
            <Badge variant="outline">Status: {health.status}</Badge>
            {health.uptime ? <Badge variant="outline">Uptime: {health.uptime}</Badge> : null}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10 shadow-[0_12px_40px_-28px_hsl(var(--primary)/0.45)]">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <CpuIcon className="h-5 w-5 text-primary" />
            Model registry
          </CardTitle>
          <CardDescription>
            Catalog of supported models and which tasks the active pipeline assigns.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ModelRegistryTable
            activeModels={activeConfig?.models}
            pipelineName={activePipeline?.name ?? null}
            llmGateway={activeConfig?.provider ?? null}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings2Icon className="h-5 w-5 text-secondary" />
            Pipeline configuration
          </CardTitle>
          <CardDescription>
            Read-only view of env flags and task models for the active pipeline profile.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <PipelineConfigPanel
            pipelineName={activePipeline?.name ?? null}
            isActive={Boolean(activePipeline?.is_active)}
            config={activeConfig}
          />
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-primary/10">
        <CardHeader className="border-b border-border/70 bg-muted/20">
          <CardTitle className="flex items-center gap-2 text-base">
            <ScrollTextIcon className="h-5 w-5 text-primary" />
            Audit log
          </CardTitle>
          <CardDescription>Last {auditEvents.length} system events with search and pagination</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <SystemAuditLog events={auditEvents} />
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FlagIcon className="h-5 w-5" />
              Feature flags
              <Badge variant="secondary" className="ml-1">Coming soon</Badge>
            </CardTitle>
            <CardDescription>Toggle features across the platform</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Feature flag management will be available in a future release
            </div>
          </CardContent>
        </Card>

        <Card className="border-primary/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <GaugeIcon className="h-5 w-5" />
              Rate limits
              <Badge variant="secondary" className="ml-1">Coming soon</Badge>
            </CardTitle>
            <CardDescription>Configure API rate limits and throttling</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex h-28 items-center justify-center rounded-lg border border-dashed border-border text-sm text-muted-foreground">
              Rate limit configuration will be available in a future release
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
