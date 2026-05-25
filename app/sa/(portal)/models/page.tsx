import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SAPageHeader } from '@/components/sa/sa-page-header'
import { CpuIcon } from 'lucide-react'
import { ModelPipelineManager } from './pipeline-manager'

type PipelineRow = {
  id: string
  name: string
  description: string | null
  is_active: boolean
  config: unknown
  updated_at: string
}

export default async function SAModelPipelinesPage() {
  const supabase = await createClient()

  const { data: pipelines } = await supabase
    .from('model_pipeline_configs' as never)
    .select('*')
    .order('is_active', { ascending: false })
    .order('updated_at', { ascending: false })

  const rows = (pipelines ?? []) as PipelineRow[]
  const active = rows.find((p) => p.is_active)

  return (
    <div className="max-w-6xl mx-auto py-8 px-6 space-y-6">
      <SAPageHeader
        title="Model Pipeline"
        icon={CpuIcon}
        subtitle="OpenRouter feasibility pipeline (Sonnet). Save, activate, or install default-feasibility."
        badge={
          active ? (
            <Badge
              variant="secondary"
              className="rounded-full border border-secondary/30 bg-secondary/15 text-secondary-foreground"
            >
              Active: {active.name}
            </Badge>
          ) : (
            <Badge variant="outline">No active pipeline</Badge>
          )
        }
      />

      <Card className="overflow-hidden border-primary/10 shadow-[0_12px_40px_-28px_hsl(var(--primary)/0.45)]">
        <CardHeader className="border-b border-border/70 bg-gradient-to-r from-primary/8 via-card to-secondary/12 pb-4">
          <CardTitle className="text-base">Interactive model configuration</CardTitle>
          <CardDescription>
            Feasibility runs use OpenRouter (pinned Anthropic Sonnet). RAG embeddings use Gemini. One active pipeline at a time — use Apply to runtime after edits.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <ModelPipelineManager initialPipelines={rows as never[]} />
        </CardContent>
      </Card>
    </div>
  )
}
