'use client'

import { useMemo } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ExternalLinkIcon } from 'lucide-react'

type PipelineConfig = {
  provider?: string
  env?: Record<string, boolean | string>
  models?: Record<string, string>
}

export function PipelineConfigPanel({
  pipelineName,
  isActive,
  config,
}: {
  pipelineName: string | null
  isActive: boolean
  config: PipelineConfig | null
}) {
  const envJson = useMemo(
    () => JSON.stringify(config?.env ?? {}, null, 2),
    [config?.env],
  )
  const modelsJson = useMemo(
    () => JSON.stringify(config?.models ?? {}, null, 2),
    [config?.models],
  )
  const fullJson = useMemo(() => JSON.stringify(config ?? {}, null, 2), [config])

  if (!config) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-muted/10 px-4 py-10 text-center text-sm text-muted-foreground">
        No pipeline configuration found.{' '}
        <Link href="/sa/models" className="text-primary underline-offset-4 hover:underline">
          Create a pipeline
        </Link>
        .
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {pipelineName ? <Badge variant="outline">{pipelineName}</Badge> : null}
        {isActive ? (
          <Badge className="border-secondary/30 bg-secondary/15 text-secondary">Active pipeline</Badge>
        ) : (
          <Badge variant="secondary">Inactive</Badge>
        )}
        {config.provider ? <Badge variant="outline">Provider: {config.provider}</Badge> : null}
        <Button asChild variant="outline" size="sm" className="ml-auto">
          <Link href="/sa/models">
            Open editor
            <ExternalLinkIcon className="ml-1 h-3.5 w-3.5" />
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <ConfigBlock title="Pipeline rules (env flags)" description="Feature toggles applied at runtime." json={envJson} />
        <ConfigBlock title="Task model map" description="Agent task → model assignments." json={modelsJson} />
      </div>

      <ConfigBlock title="Full pipeline config" description="Complete JSON stored for this profile." json={fullJson} rows={16} />
    </div>
  )
}

function ConfigBlock({
  title,
  description,
  json,
  rows = 10,
}: {
  title: string
  description: string
  json: string
  rows?: number
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border/80 bg-muted/10">
      <div className="border-b border-border/70 bg-muted/25 px-4 py-3">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <pre
        className="max-h-[min(320px,40vh)] overflow-auto p-4 font-mono text-[11px] leading-relaxed text-foreground/90"
        style={{ minHeight: `${rows * 1.25}rem` }}
      >
        {json}
      </pre>
    </div>
  )
}
